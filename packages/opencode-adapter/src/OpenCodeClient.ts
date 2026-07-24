/** Raw response from OpenCode's GET /global/health endpoint. */
export interface OpenCodeHealth {
  healthy: boolean
  version: string
}

/** Subset of OpenCode's Session type that we need for Milestone 2 Step 1. */
export interface OpenCodeSession {
  id: string
  title: string
  time: {
    created: number
    updated: number
  }
}

/** Typed HTTP boundary used by OpenCodeProvider. */
export interface OpenCodeClient {
  health(): Promise<OpenCodeHealth>
  listSessions(): Promise<OpenCodeSession[]>
  createSession(input?: { title?: string }): Promise<OpenCodeSession>
}

export interface OpenCodeHttpClientOptions {
  baseUrl: string
  /** OpenCode server password. Kept in memory and never logged. */
  password?: string
  /** Injectable for tests; defaults to the platform fetch implementation. */
  fetch?: typeof globalThis.fetch
}

function basicAuthorization(password: string): string {
  const bytes = new TextEncoder().encode(`opencode:${password}`)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return `Basic ${btoa(binary)}`
}

function isHealthResponse(value: unknown): value is OpenCodeHealth {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.healthy === 'boolean' && typeof candidate.version === 'string'
}

function isSession(value: unknown): value is OpenCodeSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string' || typeof candidate.title !== 'string') return false
  if (!candidate.time || typeof candidate.time !== 'object') return false
  const time = candidate.time as Record<string, unknown>
  return typeof time.created === 'number' && typeof time.updated === 'number'
}

/**
 * Fetch-based OpenCode client.
 *
 * Event-stream and permission endpoints are added in later Milestone 2 steps.
 */
export class OpenCodeHttpClient implements OpenCodeClient {
  private readonly baseUrl: string
  private readonly password?: string
  private readonly fetch: typeof globalThis.fetch

  constructor(options: OpenCodeHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.password = options.password
    this.fetch = options.fetch ?? globalThis.fetch
  }

  async health(): Promise<OpenCodeHealth> {
    const body = await this.requestJson('GET', '/global/health')
    if (!isHealthResponse(body)) {
      throw new Error('OpenCode health check returned an invalid response.')
    }
    return body
  }

  async listSessions(): Promise<OpenCodeSession[]> {
    const body = await this.requestJson('GET', '/session')
    if (!Array.isArray(body) || !body.every(isSession)) {
      throw new Error('OpenCode session list returned an invalid response.')
    }
    return body
  }

  async createSession(input?: { title?: string }): Promise<OpenCodeSession> {
    const body = await this.requestJson('POST', '/session', {
      title: input?.title,
    })
    if (!isSession(body)) {
      throw new Error('OpenCode create session returned an invalid response.')
    }
    return body
  }

  private async requestJson(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const headers = new Headers()
    if (this.password) {
      headers.set('Authorization', basicAuthorization(this.password))
    }
    if (body !== undefined) {
      headers.set('Content-Type', 'application/json')
    }

    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`OpenCode ${method} ${path} failed (HTTP ${response.status}).`)
    }

    return response.json()
  }
}
