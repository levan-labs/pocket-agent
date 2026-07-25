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

/** OpenCode bus event as delivered inside GlobalEvent.payload. */
export interface OpenCodeBusEvent {
  type: string
  properties: Record<string, unknown>
}

/** Wrapper from GET /global/event. */
export interface OpenCodeGlobalEvent {
  directory?: string
  payload: OpenCodeBusEvent
}

export type OpenCodeEventHandler = (event: OpenCodeGlobalEvent) => void
export type Unsubscribe = () => void

/** Typed HTTP boundary used by OpenCodeProvider. */
export interface OpenCodeClient {
  health(): Promise<OpenCodeHealth>
  listSessions(): Promise<OpenCodeSession[]>
  createSession(input?: { title?: string }): Promise<OpenCodeSession>
  /**
   * Subscribe to GET /global/event (SSE). Returns an unsubscribe function.
   * The stream runs until unsubscribe, disconnect, or a fatal read error.
   */
  subscribeGlobalEvents(
    onEvent: OpenCodeEventHandler,
    onError?: (error: Error) => void,
  ): Unsubscribe
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

function isGlobalEvent(value: unknown): value is OpenCodeGlobalEvent {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  const payload = candidate.payload
  if (!payload || typeof payload !== 'object') return false
  const bus = payload as Record<string, unknown>
  // properties may be {} (e.g. server.connected); still required as an object.
  return typeof bus.type === 'string' && bus.properties !== null && typeof bus.properties === 'object'
}

/**
 * Fetch-based OpenCode client.
 *
 * Permission reply endpoints are added in a later Milestone 2 step.
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

  subscribeGlobalEvents(
    onEvent: OpenCodeEventHandler,
    onError?: (error: Error) => void,
  ): Unsubscribe {
    const controller = new AbortController()
    void this.readEventStream(controller.signal, onEvent, onError)
    return () => {
      controller.abort()
    }
  }

  private async readEventStream(
    signal: AbortSignal,
    onEvent: OpenCodeEventHandler,
    onError?: (error: Error) => void,
  ): Promise<void> {
    try {
      const headers = this.authHeaders()
      headers.set('Accept', 'text/event-stream')

      const response = await this.fetch(`${this.baseUrl}/global/event`, {
        method: 'GET',
        headers,
        signal,
      })

      if (!response.ok) {
        throw new Error(`OpenCode GET /global/event failed (HTTP ${response.status}).`)
      }
      if (!response.body) {
        throw new Error('OpenCode event stream returned no body.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (!signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let separator = buffer.indexOf('\n\n')
        while (separator !== -1) {
          const chunk = buffer.slice(0, separator)
          buffer = buffer.slice(separator + 2)
          const data = extractSseData(chunk)
          if (data) {
            let parsed: unknown
            try {
              parsed = JSON.parse(data)
            } catch {
              separator = buffer.indexOf('\n\n')
              continue
            }
            if (isGlobalEvent(parsed)) {
              onEvent({
                directory: parsed.directory,
                payload: {
                  type: parsed.payload.type,
                  properties: parsed.payload.properties as Record<string, unknown>,
                },
              })
            }
          }
          separator = buffer.indexOf('\n\n')
        }
      }
    } catch (err) {
      if (signal.aborted) return
      onError?.(err instanceof Error ? err : new Error('OpenCode event stream failed.'))
    }
  }

  private authHeaders(): Headers {
    const headers = new Headers()
    if (this.password) {
      headers.set('Authorization', basicAuthorization(this.password))
    }
    return headers
  }

  private async requestJson(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const headers = this.authHeaders()
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

/** Collect `data:` lines from one SSE event block. */
function extractSseData(block: string): string | null {
  const lines = block.split(/\r?\n/)
  const dataLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (dataLines.length === 0) return null
  return dataLines.join('\n')
}
