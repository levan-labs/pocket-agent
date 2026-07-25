import type { AgentProvider } from '@pocket-agent/agent-core'
import type {
  AgentEvent,
  AgentSession,
  CreateSessionInput,
  ProviderCapabilities,
  ProviderConnectionConfig,
  ProviderConnectionResult,
} from '@pocket-agent/shared-types'
import {
  OpenCodeHttpClient,
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
 * Milestone 2 Step 2: SSE event stream + mapping to AgentEvent.
 * sendMessage / permission replies arrive in later steps.
 */
export class OpenCodeProvider implements AgentProvider {
  readonly id = 'opencode'
  readonly name = 'OpenCode (local server)'

  private client: OpenCodeClient | null = null
  private unsubscribeEvents: Unsubscribe | null = null
  private readonly mapper = new OpenCodeEventMapper()
  private readonly router = new OpenCodeEventRouter()
  private readonly createClient: OpenCodeClientFactory

  constructor(createClient: OpenCodeClientFactory = (options) => new OpenCodeHttpClient(options)) {
    this.createClient = createClient
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
    // Sessions + event plumbing work. Chat sendMessage still a later step.
    return {
      streaming: false,
      sessions: true,
      permissions: false,
      files: false,
      terminal: false,
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    const client = this.requireClient()
    const sessions = await client.listSessions()
    return sessions.map(toAgentSession)
  }

  async createSession(input?: CreateSessionInput): Promise<AgentSession> {
    const client = this.requireClient()
    const session = await client.createSession({ title: input?.title })
    return toAgentSession(session)
  }

  async *sendMessage(_sessionId: string, _message: string): AsyncIterable<AgentEvent> {
    this.requireClient()
    throw new Error('OpenCode streaming is implemented in a later Milestone 2 step.')
  }

  async approvePermission(_requestId: string): Promise<void> {
    this.requireClient()
    throw new Error('OpenCode permissions are implemented in a later Milestone 2 step.')
  }

  async denyPermission(_requestId: string): Promise<void> {
    this.requireClient()
    throw new Error('OpenCode permissions are implemented in a later Milestone 2 step.')
  }

  /**
   * Test/helper hook: observe mapped AgentEvents after connect().
   * Not part of AgentProvider — used while building Milestone 2.
   */
  subscribeAgentEvents(listener: (event: AgentEvent) => void): Unsubscribe {
    return this.router.subscribe(listener)
  }

  private startEventStream(client: OpenCodeClient): Promise<void> {
    this.unsubscribeEvents?.()
    this.mapper.reset()
    this.router.clear()

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
