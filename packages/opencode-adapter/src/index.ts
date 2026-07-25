/**
 * OpenCode adapter — Milestone 2 in progress.
 *
 * Step 1: session list/create over HTTP.
 * Step 2: SSE /global/event subscription + AgentEvent mapping.
 * Later: sendMessage (prompt_async) and permission replies.
 *
 * Default backend URL is loopback-only: http://127.0.0.1:4096
 */
export const OPENCODE_DEFAULT_URL = 'http://127.0.0.1:4096'

export { OpenCodeHttpClient } from './OpenCodeClient'
export type {
  OpenCodeBusEvent,
  OpenCodeClient,
  OpenCodeEventHandler,
  OpenCodeGlobalEvent,
  OpenCodeHealth,
  OpenCodeHttpClientOptions,
  OpenCodeSession,
  Unsubscribe,
} from './OpenCodeClient'

export { OpenCodeEventMapper } from './OpenCodeEventMapper'
export { OpenCodeEventRouter } from './OpenCodeEventRouter'

export { OpenCodeProvider } from './OpenCodeProvider'
export type { OpenCodeClientFactory } from './OpenCodeProvider'
