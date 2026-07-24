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
} from './OpenCodeClient'

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
 * Milestone 2 Step 1: connect + real session list/create.
 * Streaming and permission mapping arrive in later Milestone 2 steps.
 */
export class OpenCodeProvider implements AgentProvider {
  readonly id = 'opencode'
  readonly name = 'OpenCode (local server)'

  private client: OpenCodeClient | null = null
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
      return {
        ok: true,
        message: 'Connected to local OpenCode server.',
        backendVersion: health.version,
      }
    } catch (err) {
      this.client = null
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'OpenCode connection failed.',
      }
    }
  }

  async disconnect(): Promise<void> {
    this.client = null
  }

  getCapabilities(): ProviderCapabilities {
    // Sessions work. Chat streaming / permissions still Milestone 2.
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
