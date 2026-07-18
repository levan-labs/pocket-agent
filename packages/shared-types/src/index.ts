/**
 * Provider-neutral domain types for Pocket Agent.
 *
 * These types are the shared vocabulary between the UI and any agent
 * backend. They must never contain backend-specific details (for example
 * OpenCode API shapes) — adapters translate to and from these types.
 */

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export interface ProviderConnectionConfig {
  /**
   * Base URL of the agent backend. Defaults are always loopback-only
   * (e.g. http://127.0.0.1:4096); never default to 0.0.0.0 or LAN hosts.
   */
  baseUrl: string
  /**
   * Optional secret for backends that require one. Held in memory only —
   * never persisted to source control or logged.
   */
  apiKey?: string
}

export interface ProviderConnectionResult {
  ok: boolean
  /** Human-readable status, safe to display. Must never include secrets. */
  message?: string
  /** Backend version string when the backend reports one. */
  backendVersion?: string
}

/**
 * Explicit capability flags. The UI must disable or hide any action whose
 * capability is false — unfinished features are never presented as working.
 */
export interface ProviderCapabilities {
  streaming: boolean
  sessions: boolean
  permissions: boolean
  files: boolean
  terminal: boolean
}

// ---------------------------------------------------------------------------
// Sessions and messages
// ---------------------------------------------------------------------------

export interface AgentSession {
  id: string
  title: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface CreateSessionInput {
  title?: string
}

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  sessionId: string
  role: MessageRole
  text: string
  createdAt: string // ISO 8601
  /** True while the assistant is still streaming this message. */
  pending?: boolean
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export type PermissionKind =
  | 'run-command'
  | 'write-file'
  | 'delete-file'
  | 'read-file'
  | 'other'

export interface PermissionRequest {
  id: string
  sessionId: string
  kind: PermissionKind
  /** Short human-readable description of the requested action. */
  title: string
  /** Exact command that would run, when applicable. Shown before approval. */
  command?: string
  /** File path affected, when applicable. Shown before approval. */
  path?: string
}

// ---------------------------------------------------------------------------
// Tool activity
// ---------------------------------------------------------------------------

export type ToolCallStatus = 'running' | 'succeeded' | 'failed'

export interface ToolCall {
  id: string
  sessionId: string
  /** Provider-neutral tool name, e.g. "shell", "edit-file". */
  tool: string
  title: string
  status: ToolCallStatus
  /** Command or input preview, when applicable. */
  detail?: string
  /** Output preview once available. */
  output?: string
}

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export type FileEntryKind = 'file' | 'directory'

export interface FileEntry {
  name: string
  path: string
  kind: FileEntryKind
  size?: number
}

// ---------------------------------------------------------------------------
// Agent event stream
// ---------------------------------------------------------------------------

/**
 * Events emitted while the agent processes a message. The UI renders the
 * conversation purely from this stream, regardless of which backend
 * produced it.
 */
export type AgentEvent =
  | { type: 'message.start'; messageId: string; sessionId: string }
  | { type: 'message.delta'; messageId: string; text: string }
  | { type: 'message.end'; messageId: string }
  | { type: 'tool.start'; toolCall: ToolCall }
  | { type: 'tool.update'; toolCall: ToolCall }
  | { type: 'tool.end'; toolCall: ToolCall }
  | { type: 'permission.requested'; request: PermissionRequest }
  | { type: 'permission.resolved'; requestId: string; approved: boolean }
  | { type: 'session.updated'; session: AgentSession }
  | { type: 'error'; message: string }
