import type { AgentProvider } from '@pocket-agent/agent-core'
import type {
  AgentEvent,
  AgentSession,
  CreateSessionInput,
  ProviderCapabilities,
  ProviderConnectionConfig,
  ProviderConnectionResult,
} from '@pocket-agent/shared-types'

/**
 * Milestone 1, Step 1: compiling skeleton only.
 * Fake streaming, sessions, and permission flows arrive in Step 4.
 */
export class MockProvider implements AgentProvider {
  readonly id = 'mock'
  readonly name = 'Mock (offline demo)'

  async connect(_config: ProviderConnectionConfig): Promise<ProviderConnectionResult> {
    return { ok: true, message: 'Mock provider connected (no backend).' }
  }

  async disconnect(): Promise<void> {}

  getCapabilities(): ProviderCapabilities {
    // All false until the corresponding behavior is actually implemented
    // (Step 4). The UI hides or disables anything not enabled here.
    return {
      streaming: false,
      sessions: false,
      permissions: false,
      files: false,
      terminal: false,
    }
  }

  async listSessions(): Promise<AgentSession[]> {
    return []
  }

  async createSession(_input?: CreateSessionInput): Promise<AgentSession> {
    throw new Error('MockProvider sessions are implemented in Milestone 1 Step 4.')
  }

  async *sendMessage(_sessionId: string, _message: string): AsyncIterable<AgentEvent> {
    throw new Error('MockProvider streaming is implemented in Milestone 1 Step 4.')
  }

  async approvePermission(_requestId: string): Promise<void> {
    throw new Error('MockProvider permissions are implemented in Milestone 1 Step 4.')
  }

  async denyPermission(_requestId: string): Promise<void> {
    throw new Error('MockProvider permissions are implemented in Milestone 1 Step 4.')
  }
}
