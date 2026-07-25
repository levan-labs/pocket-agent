import type {
  AgentEvent,
  AgentSession,
  CreateSessionInput,
  FileEntry,
  ModelOption,
  ProviderCapabilities,
  ProviderConnectionConfig,
  ProviderConnectionResult,
} from '@pocket-agent/shared-types'

/**
 * The single boundary between the Pocket Agent UI and any agent backend.
 *
 * The UI must communicate only through this interface. Backend-specific
 * details (OpenCode APIs, remote provider APIs, future engines) live inside
 * adapter packages and never leak into the frontend.
 */
export interface AgentProvider {
  readonly id: string
  readonly name: string

  connect(config: ProviderConnectionConfig): Promise<ProviderConnectionResult>

  disconnect(): Promise<void>

  getCapabilities(): ProviderCapabilities

  listSessions(): Promise<AgentSession[]>

  createSession(input?: CreateSessionInput): Promise<AgentSession>

  sendMessage(sessionId: string, message: string): AsyncIterable<AgentEvent>

  approvePermission(requestId: string): Promise<void>

  denyPermission(requestId: string): Promise<void>

  /** Only present when getCapabilities().files is true. */
  listFiles?(path?: string): Promise<FileEntry[]>

  /** Only present when getCapabilities().models is true. */
  listModels?(): Promise<ModelOption[]>

  /** Only present when getCapabilities().models is true. */
  getSelectedModel?(): ModelOption | null

  /** Only present when getCapabilities().models is true. */
  setSelectedModel?(model: { providerId: string; id: string }): Promise<void>
}
