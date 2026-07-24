/**
 * OpenCode adapter — Milestone 1 Step 6 skeleton.
 *
 * Provides a typed HTTP client boundary and an AgentProvider that can
 * connect/disconnect against a local OpenCode server (loopback health check).
 * Real API mapping (SSE event stream, session sync, permissions) is Milestone 2.
 *
 * Default backend URL is loopback-only: http://127.0.0.1:4096
 */
export const OPENCODE_DEFAULT_URL = 'http://127.0.0.1:4096'

export { OpenCodeHttpClient } from './OpenCodeClient'
export type {
  OpenCodeClient,
  OpenCodeHealth,
  OpenCodeHttpClientOptions,
} from './OpenCodeClient'

export { OpenCodeProvider } from './OpenCodeProvider'
export type { OpenCodeClientFactory } from './OpenCodeProvider'
