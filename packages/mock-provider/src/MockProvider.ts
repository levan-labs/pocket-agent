import type { AgentProvider } from '@pocket-agent/agent-core'
import type {
  AgentEvent,
  AgentSession,
  CreateSessionInput,
  PermissionRequest,
  ProviderCapabilities,
  ProviderConnectionConfig,
  ProviderConnectionResult,
} from '@pocket-agent/shared-types'

const STREAM_DELAY_MS = 45

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nowIso(): string {
  return new Date().toISOString()
}

function makeId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

interface PendingPermission {
  request: PermissionRequest
  resolve: (approved: boolean) => void
}

/**
 * Offline demo provider. Simulates streaming replies and an approval-based
 * permission flow so the whole chat UX can be exercised with no backend.
 */
export class MockProvider implements AgentProvider {
  readonly id = 'mock'
  readonly name = 'Mock (offline demo)'

  private sessions: AgentSession[] = []
  private pendingPermissions = new Map<string, PendingPermission>()

  async connect(_config: ProviderConnectionConfig): Promise<ProviderConnectionResult> {
    return { ok: true, message: 'Mock provider connected (no backend).' }
  }

  async disconnect(): Promise<void> {
    // Deny anything still waiting so no stream hangs forever.
    for (const [id, pending] of this.pendingPermissions) {
      pending.resolve(false)
      this.pendingPermissions.delete(id)
    }
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      sessions: true,
      permissions: true,
      files: false,
      terminal: false,
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    return [...this.sessions]
  }

  async createSession(input?: CreateSessionInput): Promise<AgentSession> {
    const session: AgentSession = {
      id: makeId('session'),
      title: input?.title ?? 'Demo session',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    this.sessions.push(session)
    return session
  }

  async *sendMessage(sessionId: string, message: string): AsyncIterable<AgentEvent> {
    const messageId = makeId('msg')
    yield { type: 'message.start', messageId, sessionId }

    const wantsPermission = /\b(run|command|write|delete|install)\b/i.test(message)

    if (wantsPermission) {
      yield* this.streamText(
        messageId,
        'Sure — that needs a shell command. I will ask for your approval first.\n\n',
      )

      const request: PermissionRequest = {
        id: makeId('perm'),
        sessionId,
        kind: 'run-command',
        title: 'Run a shell command',
        command: 'ls -la ~/projects',
      }

      // Register the pending decision before emitting the event so an
      // immediate approve/deny from the UI can never race past us.
      const decision = new Promise<boolean>((resolve) => {
        this.pendingPermissions.set(request.id, { request, resolve })
      })
      yield { type: 'permission.requested', request }
      const result = await decision
      yield { type: 'permission.resolved', requestId: request.id, approved: result }

      if (result) {
        yield* this.streamText(
          messageId,
          'Command finished:\n\ntotal 12\ndrwxr-xr-x  3 you you 4096 pocket-agent\n\nThis output is simulated — the mock provider never runs anything real.',
        )
      } else {
        yield* this.streamText(
          messageId,
          'Understood, I did not run the command. Nothing was executed.',
        )
      }
    } else {
      yield* this.streamText(
        messageId,
        `You said: "${message}".\n\nI am the offline mock provider, streaming this reply word by word so you can test the chat UX. Try a message containing "run" or "delete" to see the permission flow.`,
      )
    }

    yield { type: 'message.end', messageId }

    const session = this.sessions.find((s) => s.id === sessionId)
    if (session) {
      session.updatedAt = nowIso()
      yield { type: 'session.updated', session: { ...session } }
    }
  }

  async approvePermission(requestId: string): Promise<void> {
    this.resolvePermission(requestId, true)
  }

  async denyPermission(requestId: string): Promise<void> {
    this.resolvePermission(requestId, false)
  }

  private resolvePermission(requestId: string, approved: boolean): void {
    const pending = this.pendingPermissions.get(requestId)
    if (!pending) return
    this.pendingPermissions.delete(requestId)
    pending.resolve(approved)
  }

  private async *streamText(messageId: string, text: string): AsyncIterable<AgentEvent> {
    // Split on word boundaries but keep whitespace so the text reassembles
    // exactly; streaming word-by-word reads naturally in the UI.
    const chunks = text.match(/\S+\s*/g) ?? []
    for (const chunk of chunks) {
      await sleep(STREAM_DELAY_MS)
      yield { type: 'message.delta', messageId, text: chunk }
    }
  }
}
