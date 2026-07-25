import type { FileEntry, FileEntryKind } from '@pocket-agent/shared-types'

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

/** Raw node from OpenCode's GET /file?path=… */
export interface OpenCodeFileNode {
  name: string
  path: string
  absolute: string
  type: 'file' | 'directory'
  ignored: boolean
}

/** One model from GET /provider (subset used by the picker). */
export interface OpenCodeListedModel {
  id: string
  providerID: string
  name: string
}

/** One provider from GET /provider (subset used by the picker). */
export interface OpenCodeListedProvider {
  id: string
  name: string
  models: OpenCodeListedModel[]
}

/**
 * Result of GET /provider.
 * `connected` lists provider ids that are usable (keys/env configured).
 * `defaults` maps providerID → default modelID.
 */
export interface OpenCodeProviderList {
  providers: OpenCodeListedProvider[]
  connected: string[]
  defaults: Record<string, string>
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
   * POST /session/:id/prompt_async — fire-and-forget prompt (204).
   * Replies arrive on the global event stream.
   */
  promptAsync(
    sessionId: string,
    input: {
      text: string
      model?: { providerID: string; modelID: string }
    },
  ): Promise<void>
  /**
   * POST /session/:id/permissions/:permissionID
   * response: "once" | "always" | "reject"
   */
  replyPermission(
    sessionId: string,
    permissionId: string,
    response: 'once' | 'always' | 'reject',
  ): Promise<void>
  /**
   * Subscribe to GET /global/event (SSE). Returns an unsubscribe function.
   * The stream runs until unsubscribe, disconnect, or a fatal read error.
   */
  subscribeGlobalEvents(
    onEvent: OpenCodeEventHandler,
    onError?: (error: Error) => void,
  ): Unsubscribe
  /** GET /file?path=… — list files and directories at a path. */
  listFiles(path: string): Promise<OpenCodeFileNode[]>
  /** GET /provider — configured providers, connected ids, and defaults. */
  listProviders(): Promise<OpenCodeProviderList>
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

function isFileNode(value: unknown): value is OpenCodeFileNode {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.absolute === 'string' &&
    (candidate.type === 'file' || candidate.type === 'directory') &&
    typeof candidate.ignored === 'boolean'
  )
}

/** Map an OpenCode file node to the provider-neutral FileEntry. */
export function toFileEntry(node: OpenCodeFileNode): FileEntry {
  const kind: FileEntryKind = node.type
  return {
    name: node.name,
    path: node.path,
    kind,
  }
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value).every((v) => typeof v === 'string')
}

function parseListedModel(value: unknown, fallbackProviderID: string): OpenCodeListedModel | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return null
  const providerID =
    typeof candidate.providerID === 'string' ? candidate.providerID : fallbackProviderID
  return { id: candidate.id, providerID, name: candidate.name }
}

function parseListedProvider(value: unknown): OpenCodeListedProvider | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return null
  if (!candidate.models || typeof candidate.models !== 'object') return null

  const models: OpenCodeListedModel[] = []
  for (const modelValue of Object.values(candidate.models as Record<string, unknown>)) {
    const model = parseListedModel(modelValue, candidate.id)
    if (model) models.push(model)
  }
  models.sort((a, b) => a.name.localeCompare(b.name))
  return { id: candidate.id, name: candidate.name, models }
}

function parseProviderList(value: unknown): OpenCodeProviderList | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (!Array.isArray(candidate.all) || !Array.isArray(candidate.connected)) return null
  if (!isStringRecord(candidate.default)) return null
  if (!candidate.connected.every((id) => typeof id === 'string')) return null

  const providers: OpenCodeListedProvider[] = []
  for (const raw of candidate.all) {
    const provider = parseListedProvider(raw)
    if (provider) providers.push(provider)
  }
  providers.sort((a, b) => a.name.localeCompare(b.name))

  return {
    providers,
    connected: candidate.connected as string[],
    defaults: candidate.default,
  }
}

/** Flatten connected providers into picker-friendly model rows. */
export function flattenConnectedModels(list: OpenCodeProviderList): OpenCodeListedModel[] {
  const connected = new Set(list.connected)
  const models: OpenCodeListedModel[] = []
  for (const provider of list.providers) {
    if (!connected.has(provider.id)) continue
    models.push(...provider.models)
  }
  return models
}

/** Fetch-based OpenCode client (HTTP + SSE). */
export class OpenCodeHttpClient implements OpenCodeClient {
  private readonly baseUrl: string
  private readonly password?: string
  private readonly fetch: typeof globalThis.fetch

  constructor(options: OpenCodeHttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.password = options.password
    // Browser fetch must keep its Window receiver — storing a bare
    // globalThis.fetch and calling it as this.fetch() throws Illegal invocation.
    const baseFetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.fetch = baseFetch
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

  async promptAsync(
    sessionId: string,
    input: {
      text: string
      model?: { providerID: string; modelID: string }
    },
  ): Promise<void> {
    const body: Record<string, unknown> = {
      parts: [{ type: 'text', text: input.text }],
    }
    if (input.model) {
      body.model = input.model
    }

    const headers = this.authHeaders()
    headers.set('Content-Type', 'application/json')

    const response = await this.fetch(
      `${this.baseUrl}/session/${encodeURIComponent(sessionId)}/prompt_async`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
    )

    // OpenCode returns 204 No Content on success.
    if (!response.ok) {
      throw new Error(
        `OpenCode POST /session/:id/prompt_async failed (HTTP ${response.status}).`,
      )
    }
  }

  async replyPermission(
    sessionId: string,
    permissionId: string,
    response: 'once' | 'always' | 'reject',
  ): Promise<void> {
    const headers = this.authHeaders()
    headers.set('Content-Type', 'application/json')

    const res = await this.fetch(
      `${this.baseUrl}/session/${encodeURIComponent(sessionId)}/permissions/${encodeURIComponent(permissionId)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ response }),
      },
    )

    if (!res.ok) {
      throw new Error(
        `OpenCode POST /session/:id/permissions/:permissionID failed (HTTP ${res.status}).`,
      )
    }
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

  async listFiles(path: string): Promise<OpenCodeFileNode[]> {
    const query = new URLSearchParams({ path })
    const body = await this.requestJson('GET', `/file?${query.toString()}`)
    if (!Array.isArray(body) || !body.every(isFileNode)) {
      throw new Error('OpenCode file list returned an invalid response.')
    }
    return body
  }

  async listProviders(): Promise<OpenCodeProviderList> {
    const body = await this.requestJson('GET', '/provider')
    const parsed = parseProviderList(body)
    if (!parsed) {
      throw new Error('OpenCode provider list returned an invalid response.')
    }
    return parsed
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
