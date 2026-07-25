/**
 * OpenCode adapter — Milestone 2 chat complete; Milestone 3 adds files.
 *
 * Default backend URL is loopback-only: http://127.0.0.1:4096
 */
export const OPENCODE_DEFAULT_URL = 'http://127.0.0.1:4096'

export { OpenCodeHttpClient, toFileEntry } from './OpenCodeClient'
export type {
  OpenCodeBusEvent,
  OpenCodeClient,
  OpenCodeEventHandler,
  OpenCodeFileNode,
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
