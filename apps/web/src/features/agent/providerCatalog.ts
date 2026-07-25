import { ProviderRegistry } from '@pocket-agent/agent-core'
import { MockProvider } from '@pocket-agent/mock-provider'
import { OPENCODE_DEFAULT_URL, OpenCodeProvider } from '@pocket-agent/opencode-adapter'

/**
 * UI-facing description of a selectable provider. Unavailable entries are
 * shown disabled — never presented as working before they exist.
 */
export interface ProviderDescriptor {
  id: string
  name: string
  description: string
  /** Loopback-only default; the user can change it later (Milestone 2). */
  baseUrl: string
  available: boolean
  unavailableNote?: string
}

export const PROVIDER_CATALOG: ProviderDescriptor[] = [
  {
    id: 'mock',
    name: 'Mock (offline demo)',
    description: 'Simulated streaming and permissions. No backend, nothing runs.',
    baseUrl: 'http://127.0.0.1:0',
    available: true,
  },
  {
    id: 'opencode',
    name: 'OpenCode (local server)',
    description:
      'Talks to a local OpenCode server (default http://127.0.0.1:4096). Start it with opencode serve and allow CORS for the web app.',
    baseUrl: OPENCODE_DEFAULT_URL,
    available: true,
  },
]

export const providerRegistry = new ProviderRegistry()
providerRegistry.register('mock', () => new MockProvider())
providerRegistry.register('opencode', () => new OpenCodeProvider())
