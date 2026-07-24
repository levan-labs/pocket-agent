import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { AgentProvider } from '@pocket-agent/agent-core'
import { MockProvider } from '@pocket-agent/mock-provider'

/**
 * Exposes the active AgentProvider to the UI. Milestone 1 Step 4 always uses
 * the offline mock; the connection screen and provider factory (Step 5) will
 * make this switchable.
 */
const AgentContext = createContext<AgentProvider | null>(null)

export function AgentContextProvider({ children }: { children: ReactNode }) {
  const provider = useMemo(() => new MockProvider(), [])
  return <AgentContext.Provider value={provider}>{children}</AgentContext.Provider>
}

export function useAgentProvider(): AgentProvider {
  const provider = useContext(AgentContext)
  if (!provider) {
    throw new Error('useAgentProvider must be used inside <AgentContextProvider>')
  }
  return provider
}
