import type { AgentProvider } from '@pocket-agent/agent-core'
import type {
  AgentEvent,
  AgentSession,
  CreateSessionInput,
  FileEntry,
  ProviderCapabilities,
  ProviderConnectionConfig,
  ProviderConnectionResult,
} from '@pocket-agent/shared-types'
import {
  OpenCodeHttpClient,
  toFileEntry,
  type OpenCodeClient,
  type OpenCodeHttpClientOptions,
  type OpenCodeSession,
  type Unsubscribe,
} from './OpenCodeClient'
import { OpenCodeEventMapper } from './OpenCodeEventMapper'
import { OpenCodeEventRouter } from './OpenCodeEventRouter'

export type OpenCodeClientFactory = (options: OpenCodeHttpClientOptions) => OpenCodeClient

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])

function assertLoopbackBaseUrl(baseUrl: string): URL {
  let url: URL
  try {
    url = new URL(baseUrl)
  } catch {
    throw new Error('OpenCode base URL is invalid.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('OpenCode base URL must use http or https.')
  }

  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(
      'OpenCode base URL must be loopback-only (127.0.0.1, localhost, or ::1).',
    )
  }

  return url
}

/**
 * Adapter that exposes a local OpenCode server through AgentProvider.
 *
 * Milestone 3 Step 2: listFiles capability against OpenCode GET /file.
 */
export class OpenCodeProvider implements AgentProvider {
  readonly id = 'opencode'
  readonly name = 'OpenCode (local server)'

  private client: OpenCodeClient | null = null
  private unsubscribeEvents: Unsubscribe | null = null
  private readonly mapper = new OpenCodeEventMapper()
  private readonly router = new OpenCodeEventRouter()
  private readonly pendingPermissions = new Map<string, { sessionId: string }>()
  private readonly createClient: OpenCodeClientFactory
  private readonly defaultModel: { providerID: string; modelID: string }

  constructor(
    createClient: OpenCodeClientFactory = (options) => new OpenCodeHttpClient(options),
    defaultModel: { providerID: string; modelID: string } = {
      // Free OpenCode Zen model available without extra local keys.
      providerID: 'opencode',
      modelID: 'ling-3.0-flash-free',
    },
  ) {
    this.createClient = createClient
    this.defaultModel = defaultModel
  }

  async connect(config: ProviderConnectionConfig): Promise<ProviderConnectionResult> {
    try {
      const url = assertLoopbackBaseUrl(config.baseUrl)
      const client = this.createClient({
        baseUrl: url.toString().replace(/\/+$/, ''),
        password: config.apiKey,
      })
      const health = await client.health()

      if (!health.healthy) {
        this.client = null
        return { ok: false, message: 'OpenCode server reported unhealthy.' }
      }

      this.client = client
      await this.startEventStream(client)
      return {
        ok: true,
        message: 'Connected to local OpenCode server.',
        backendVersion: health.version,
      }
    } catch (err) {
      this.teardown()
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'OpenCode connection failed.',
      }
    }
  }

  async disconnect(): Promise<void> {
    this.teardown()
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      sessions: true,
      permissions: true,
      files: true,
      terminal: false,
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    const client = this.requireClient()
    const sessions = await client.listSessions()
    return sessions.map(toAgentSession)
  }

  async listFiles(path?: string): Promise<FileEntry[]> {
    const client = this.requireClient()
    const nodes = await client.listFiles(path ?? '.')
    return nodes.map(toFileEntry)
  }

  async createSession(input?: CreateSessionInput): Promise<AgentSession> {
    const client = this.requireClient()
    const session = await client.createSession({ title: input?.title })
    return toAgentSession(session)
  }

  async *sendMessage(sessionId: string, message: string): AsyncIterable<AgentEvent> {
    const client = this.requireClient()
    const queue: AgentEvent[] = []
    let notify: (() => void) | null = null
    let finished = false
    let awaitingPermission = false
    let sawAssistantText = false

    const unsub = this.router.subscribeSession(sessionId, (event) => {
      queue.push(event)
      if (event.type === 'permission.requested') {
        awaitingPermission = true
      }
      if (event.type === 'permission.resolved') {
        awaitingPermission = false
      }
      if (event.type === 'message.delta') {
        sawAssistantText = true
      }
      // Don't end the turn while a permission card is waiting for the user.
      if (event.type === 'error') {
        finished = true
      }
      if (event.type === 'message.end' && !awaitingPermission) {
        finished = true
      }
      notify?.()
    })

    try {
      await client.promptAsync(sessionId, {
        text: message,
        model: this.defaultModel,
      })

      const deadline = Date.now() + 120_000
      while (Date.now() < deadline) {
        while (queue.length > 0) {
          const event = queue.shift()!
          yield event
        }
        if (finished) break
        await new Promise<void>((resolve) => {
          notify = resolve
          setTimeout(resolve, 250)
        })
        notify = null
      }

      while (queue.length > 0) {
        yield queue.shift()!
      }

      if (!finished) {
        yield {
          type: 'error',
          message: awaitingPermission
            ? 'Timed out while waiting for permission approval.'
            : 'Timed out waiting for the OpenCode assistant reply.',
        }
      } else if (!sawAssistantText && !awaitingPermission) {
        // Model finished without visible text (e.g. tool-only turn).
        // UI still got permission/session events; nothing else to add here.
      }
    } finally {
      unsub()
    }
  }

  async approvePermission(requestId: string): Promise<void> {
    await this.replyPermission(requestId, 'once')
  }

  async denyPermission(requestId: string): Promise<void> {
    await this.replyPermission(requestId, 'reject')
  }

  /**
   * Test/helper hook: observe mapped AgentEvents after connect().
   * Not part of AgentProvider — used while building Milestone 2.
   */
  subscribeAgentEvents(listener: (event: AgentEvent) => void): Unsubscribe {
    return this.router.subscribe(listener)
  }

  private async replyPermission(
    requestId: string,
    response: 'once' | 'always' | 'reject',
  ): Promise<void> {
    const client = this.requireClient()
    const pending = this.pendingPermissions.get(requestId)
    if (!pending) {
      throw new Error(`Unknown permission request: ${requestId}`)
    }
    await client.replyPermission(pending.sessionId, requestId, response)
    // Keep the pending entry until permission.resolved arrives on the stream,
    // so session routing still works for that event.
  }

  private startEventStream(client: OpenCodeClient): Promise<void> {
    this.unsubscribeEvents?.()
    this.mapper.reset()
    this.router.clear()
    this.pendingPermissions.clear()

    return new Promise((resolve, reject) => {
      let settled = false
      const timeout = setTimeout(() => {
        if (settled) return
        settled = true
        this.unsubscribeEvents?.()
        this.unsubscribeEvents = null
        reject(new Error('Timed out waiting for OpenCode event stream.'))
      }, 5000)

      this.unsubscribeEvents = client.subscribeGlobalEvents(
        (globalEvent) => {
          if (!settled && globalEvent.payload.type === 'server.connected') {
            settled = true
            clearTimeout(timeout)
            resolve()
          }
          for (const agentEvent of this.mapper.map(globalEvent.payload)) {
            if (agentEvent.type === 'permission.requested') {
              this.pendingPermissions.set(agentEvent.request.id, {
                sessionId: agentEvent.request.sessionId,
              })
            }
            if (agentEvent.type === 'permission.resolved') {
              this.pendingPermissions.delete(agentEvent.requestId)
            }
            this.router.publish(agentEvent)
          }
        },
        (error) => {
          this.router.publish({
            type: 'error',
            message: 'Lost connection to the OpenCode event stream.',
          })
          if (!settled) {
            settled = true
            clearTimeout(timeout)
            reject(error)
          }
        },
      )
    })
  }

  private teardown(): void {
    this.unsubscribeEvents?.()
    this.unsubscribeEvents = null
    this.client = null
    this.mapper.reset()
    this.router.clear()
    this.pendingPermissions.clear()
  }

  private requireClient(): OpenCodeClient {
    if (!this.client) {
      throw new Error('OpenCode provider is not connected.')
    }
    return this.client
  }
}

function toAgentSession(session: OpenCodeSession): AgentSession {
  return {
    id: session.id,
    title: session.title,
    createdAt: new Date(session.time.created).toISOString(),
    updatedAt: new Date(session.time.updated).toISOString(),
  }
}
