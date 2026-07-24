import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AgentProvider } from '@pocket-agent/agent-core'
import { PROVIDER_CATALOG, providerRegistry } from './providerCatalog'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface AgentConnection {
  /** Non-null only while status is "connected". */
  provider: AgentProvider | null
  providerId: string | null
  status: ConnectionStatus
  /** Human-readable status detail, safe to display. Never contains secrets. */
  message: string | null
  connect: (providerId: string) => Promise<void>
  disconnect: () => Promise<void>
}

const AgentContext = createContext<AgentConnection | null>(null)

export function AgentContextProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<AgentProvider | null>(null)
  const [providerId, setProviderId] = useState<string | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [message, setMessage] = useState<string | null>(null)
  const providerRef = useRef<AgentProvider | null>(null)

  const disconnect = useCallback(async () => {
    const active = providerRef.current
    providerRef.current = null
    setProvider(null)
    setProviderId(null)
    setStatus('disconnected')
    setMessage(null)
    if (active) {
      await active.disconnect()
    }
  }, [])

  const connect = useCallback(async (id: string) => {
    const descriptor = PROVIDER_CATALOG.find((d) => d.id === id)
    if (!descriptor || !descriptor.available) {
      setStatus('error')
      setMessage(`Provider not available: ${id}`)
      return
    }

    // Drop any previous connection first — one active provider at a time.
    const previous = providerRef.current
    providerRef.current = null
    if (previous) {
      await previous.disconnect()
    }

    setStatus('connecting')
    setMessage(null)
    try {
      const next = providerRegistry.create(id)
      const result = await next.connect({ baseUrl: descriptor.baseUrl })
      if (!result.ok) {
        setProvider(null)
        setProviderId(null)
        setStatus('error')
        setMessage(result.message ?? 'Connection failed.')
        return
      }
      providerRef.current = next
      setProvider(next)
      setProviderId(id)
      setStatus('connected')
      setMessage(result.message ?? null)
    } catch (err) {
      setProvider(null)
      setProviderId(null)
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Connection failed.')
    }
  }, [])

  const value: AgentConnection = { provider, providerId, status, message, connect, disconnect }
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgentConnection(): AgentConnection {
  const connection = useContext(AgentContext)
  if (!connection) {
    throw new Error('useAgentConnection must be used inside <AgentContextProvider>')
  }
  return connection
}
