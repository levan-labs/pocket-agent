/**
 * OpenCode adapter — Milestone 3 files complete; Milestone 4 adds models.
 *
 * Default backend URL is loopback-only: http://127.0.0.1:4096
 */
export const OPENCODE_DEFAULT_URL = 'http://127.0.0.1:4096'

export { OpenCodeHttpClient, flattenConnectedModels, toFileEntry } from './OpenCodeClient'
export type {
  OpenCodeBusEvent,
  OpenCodeClient,
  OpenCodeEventHandler,
  OpenCodeFileNode,
  OpenCodeGlobalEvent,
  OpenCodeHealth,
  OpenCodeHttpClientOptions,
  OpenCodeListedModel,
  OpenCodeListedProvider,
  OpenCodeProviderList,
  OpenCodeSession,
  Unsubscribe,
} from './OpenCodeClient'

export { OpenCodeEventMapper } from './OpenCodeEventMapper'
export { OpenCodeEventRouter } from './OpenCodeEventRouter'

export { OpenCodeProvider } from './OpenCodeProvider'
export type { OpenCodeClientFactory } from './OpenCodeProvider'
