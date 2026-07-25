import type {
  AgentEvent,
  AgentSession,
  PermissionKind,
  PermissionRequest,
} from '@pocket-agent/shared-types'

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

/**
 * Translates OpenCode bus events into provider-neutral AgentEvents.
 *
 * Stateful for message.start/end: tracks which assistant message ids have
 * already emitted start, so repeated message.updated events stay correct.
 */
export class OpenCodeEventMapper {
  private readonly startedMessages = new Set<string>()

  map(busEvent: OpenCodeBusEvent): AgentEvent[] {
    switch (busEvent.type) {
      case 'message.updated':
        return this.mapMessageUpdated(busEvent.properties)
      case 'message.part.delta':
        return this.mapPartDelta(busEvent.properties)
      case 'permission.asked':
        return this.mapPermissionAsked(busEvent.properties)
      case 'permission.replied':
        return this.mapPermissionReplied(busEvent.properties)
      case 'session.created':
      case 'session.updated':
        return this.mapSessionInfo(busEvent.properties)
      case 'session.error':
        return this.mapSessionError(busEvent.properties)
      default:
        return []
    }
  }

  /** Call when a session is no longer tracked (disconnect / session switch). */
  reset(): void {
    this.startedMessages.clear()
  }

  private mapMessageUpdated(properties: Record<string, unknown>): AgentEvent[] {
    const sessionId = asString(properties.sessionID)
    const info = asRecord(properties.info)
    if (!sessionId || !info) return []

    const messageId = asString(info.id)
    const role = asString(info.role)
    if (!messageId || role !== 'assistant') return []

    const events: AgentEvent[] = []
    if (!this.startedMessages.has(messageId)) {
      this.startedMessages.add(messageId)
      events.push({ type: 'message.start', messageId, sessionId })
    }

    const time = asRecord(info.time)
    const completed = time && typeof time.completed === 'number'
    const finish = asString(info.finish)
    if (completed || finish) {
      events.push({ type: 'message.end', messageId })
      this.startedMessages.delete(messageId)
    }

    const error = info.error
    if (error) {
      const message =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'OpenCode assistant error.'
      events.push({ type: 'error', message })
    }

    return events
  }

  private mapPartDelta(properties: Record<string, unknown>): AgentEvent[] {
    const messageId = asString(properties.messageID)
    const delta = asString(properties.delta)
    const field = asString(properties.field)
    const sessionId = asString(properties.sessionID)
    if (!messageId || delta == null || !sessionId) return []

    // Stream visible assistant text; ignore non-text fields (e.g. reasoning metadata).
    if (field && field !== 'text' && field !== 'content') return []

    const events: AgentEvent[] = []
    if (!this.startedMessages.has(messageId)) {
      this.startedMessages.add(messageId)
      events.push({ type: 'message.start', messageId, sessionId })
    }
    events.push({ type: 'message.delta', messageId, text: delta })
    return events
  }

  private mapPermissionAsked(properties: Record<string, unknown>): AgentEvent[] {
    const id = asString(properties.id)
    const sessionId = asString(properties.sessionID)
    const permission = asString(properties.permission) ?? 'other'
    if (!id || !sessionId) return []

    const metadata = asRecord(properties.metadata) ?? {}
    const patterns = Array.isArray(properties.patterns)
      ? properties.patterns.filter((p): p is string => typeof p === 'string')
      : []

    const request: PermissionRequest = {
      id,
      sessionId,
      kind: toPermissionKind(permission),
      title: humanPermissionTitle(permission),
      command: permission === 'bash' ? firstString(patterns) ?? asString(metadata.command) : undefined,
      path:
        permission === 'edit' || permission === 'read' || permission === 'write'
          ? firstString(patterns) ?? asString(metadata.filepath) ?? asString(metadata.path)
          : undefined,
    }

    return [{ type: 'permission.requested', request }]
  }

  private mapPermissionReplied(properties: Record<string, unknown>): AgentEvent[] {
    const requestId = asString(properties.requestID)
    const reply = asString(properties.reply)
    if (!requestId || !reply) return []
    return [
      {
        type: 'permission.resolved',
        requestId,
        approved: reply === 'once' || reply === 'always',
      },
    ]
  }

  private mapSessionInfo(properties: Record<string, unknown>): AgentEvent[] {
    const info = asRecord(properties.info)
    if (!info) return []
    const session = toAgentSession(info)
    return session ? [{ type: 'session.updated', session }] : []
  }

  private mapSessionError(properties: Record<string, unknown>): AgentEvent[] {
    const error = asRecord(properties.error)
    const message =
      (error && asString(error.message)) ||
      asString(properties.message) ||
      'OpenCode session error.'
    return [{ type: 'error', message }]
  }
}

function toAgentSession(info: Record<string, unknown>): AgentSession | null {
  const id = asString(info.id)
  const title = asString(info.title)
  const time = asRecord(info.time)
  if (!id || !title || !time) return null
  if (typeof time.created !== 'number' || typeof time.updated !== 'number') return null
  return {
    id,
    title,
    createdAt: new Date(time.created).toISOString(),
    updatedAt: new Date(time.updated).toISOString(),
  }
}

function toPermissionKind(permission: string): PermissionKind {
  switch (permission) {
    case 'bash':
      return 'run-command'
    case 'edit':
    case 'write':
      return 'write-file'
    case 'read':
      return 'read-file'
    default:
      return 'other'
  }
}

function humanPermissionTitle(permission: string): string {
  switch (permission) {
    case 'bash':
      return 'Run a shell command'
    case 'edit':
    case 'write':
      return 'Write a file'
    case 'read':
      return 'Read a file'
    default:
      return `Permission: ${permission}`
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function firstString(values: string[]): string | undefined {
  return values[0]
}
