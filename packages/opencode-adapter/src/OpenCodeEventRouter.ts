import type { AgentEvent } from '@pocket-agent/shared-types'

type Listener = (event: AgentEvent) => void
export type Unsubscribe = () => void

/**
 * Routes mapped AgentEvents to listeners, optionally filtered by session id.
 *
 * Because message.delta / message.end do not carry sessionId, the router
 * remembers messageId → sessionId from message.start.
 * Permission replies also omit sessionId, so requestId → sessionId is tracked.
 */
export class OpenCodeEventRouter {
  private readonly all = new Set<Listener>()
  private readonly bySession = new Map<string, Set<Listener>>()
  private readonly messageSessions = new Map<string, string>()
  private readonly permissionSessions = new Map<string, string>()

  publish(event: AgentEvent): void {
    if (event.type === 'message.start') {
      this.messageSessions.set(event.messageId, event.sessionId)
    }
    if (event.type === 'permission.requested') {
      this.permissionSessions.set(event.request.id, event.request.sessionId)
    }

    for (const listener of this.all) listener(event)

    const sessionId = this.sessionIdOf(event)
    if (sessionId) {
      const listeners = this.bySession.get(sessionId)
      if (listeners) {
        for (const listener of listeners) listener(event)
      }
    }

    if (event.type === 'message.end') {
      this.messageSessions.delete(event.messageId)
    }
    if (event.type === 'permission.resolved') {
      this.permissionSessions.delete(event.requestId)
    }
  }

  subscribe(listener: Listener): Unsubscribe {
    this.all.add(listener)
    return () => {
      this.all.delete(listener)
    }
  }

  subscribeSession(sessionId: string, listener: Listener): Unsubscribe {
    let listeners = this.bySession.get(sessionId)
    if (!listeners) {
      listeners = new Set()
      this.bySession.set(sessionId, listeners)
    }
    listeners.add(listener)
    return () => {
      listeners!.delete(listener)
      if (listeners!.size === 0) this.bySession.delete(sessionId)
    }
  }

  clear(): void {
    this.all.clear()
    this.bySession.clear()
    this.messageSessions.clear()
    this.permissionSessions.clear()
  }

  private sessionIdOf(event: AgentEvent): string | undefined {
    switch (event.type) {
      case 'message.start':
        return event.sessionId
      case 'message.delta':
      case 'message.end':
        return this.messageSessions.get(event.messageId)
      case 'tool.start':
      case 'tool.update':
      case 'tool.end':
        return event.toolCall.sessionId
      case 'permission.requested':
        return event.request.sessionId
      case 'permission.resolved':
        return this.permissionSessions.get(event.requestId)
      case 'session.updated':
        return event.session.id
      case 'error':
        return undefined
    }
  }
}
