import { useState } from 'react'
import { Button, Sheet } from '@pocket-agent/ui'
import { useAgentConnection } from './AgentContext'
import { PROVIDER_CATALOG } from './providerCatalog'

export interface ConnectSheetProps {
  open: boolean
  onClose: () => void
}

/** Bottom-sheet connection screen: pick a provider and connect. */
export function ConnectSheet({ open, onClose }: ConnectSheetProps) {
  const { status, message, connect } = useAgentConnection()
  const [selectedId, setSelectedId] = useState<string>('mock')
  const connecting = status === 'connecting'

  async function handleConnect() {
    await connect(selectedId)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Connect a provider">
      <div className="connect-sheet">
        <div className="connect-options" role="radiogroup" aria-label="Provider">
          {PROVIDER_CATALOG.map((descriptor) => {
            const selected = descriptor.id === selectedId
            return (
              <button
                key={descriptor.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`connect-option${selected ? ' connect-option--selected' : ''}`}
                disabled={!descriptor.available}
                onClick={() => setSelectedId(descriptor.id)}
              >
                <span className="connect-option__name">
                  {descriptor.name}
                  {!descriptor.available && (
                    <span className="badge-soon">{descriptor.unavailableNote}</span>
                  )}
                </span>
                <span className="connect-option__description">{descriptor.description}</span>
                <span className="connect-option__url">{descriptor.baseUrl}</span>
              </button>
            )
          })}
        </div>

        {status === 'error' && message && (
          <p className="chat-error" role="alert">
            {message}
          </p>
        )}

        <div className="connect-sheet__actions">
          <Button variant="ghost" onClick={onClose} disabled={connecting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConnect} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect'}
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
