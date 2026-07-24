/** Raw response from OpenCode's GET /global/health endpoint. */
export interface OpenCodeHealth {
  healthy: boolean
  version: string
}

/** Typed HTTP boundary used by OpenCodeProvider. */
export interface OpenCodeClient {
  health(): Promise<OpenCodeHealth>
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

/**
 * Minimal fetch-based OpenCode client.
 *
 * Session, event-stream, and permission endpoints are added in Milestone 2.
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
    const headers = new Headers()
    if (this.password) {
      headers.set('Authorization', basicAuthorization(this.password))
    }

    const response = await this.fetch(`${this.baseUrl}/global/health`, { headers })
    if (!response.ok) {
      throw new Error(`OpenCode health check failed (HTTP ${response.status}).`)
    }

    const body: unknown = await response.json()
    if (!isHealthResponse(body)) {
      throw new Error('OpenCode health check returned an invalid response.')
    }
    return body
  }
}
