import { useState } from 'react'
import { Button } from '@pocket-agent/ui'
import { useAgentConnection } from '../features/agent/AgentContext'
import { ConnectSheet } from '../features/agent/ConnectSheet'
import { ModelPicker } from '../features/agent/ModelPicker'
import { PROVIDER_CATALOG } from '../features/agent/providerCatalog'

const APP_VERSION = '0.1.0'

const STATUS_LABELS = {
  disconnected: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
  error: 'Connection error',
} as const

export function SettingsPage() {
  const { providerId, status, message, disconnect } = useAgentConnection()
  const [sheetOpen, setSheetOpen] = useState(false)

  const activeName = providerId
    ? (PROVIDER_CATALOG.find((d) => d.id === providerId)?.name ?? providerId)
    : 'None'

  return (
    <div className="page-scroll">
      <section className="settings-section" aria-labelledby="settings-provider">
        <h2 id="settings-provider">Provider</h2>
        <ul className="settings-list">
          <li>
            <span>Active provider</span>
            <span className="muted">{activeName}</span>
          </li>
          <li>
            <span>Status</span>
            <span className="muted">{STATUS_LABELS[status]}</span>
          </li>
          {message && (
            <li>
              <span>Details</span>
              <span className="muted">{message}</span>
            </li>
          )}
        </ul>
        <div className="settings-actions">
          {status === 'connected' ? (
            <Button variant="secondary" onClick={() => void disconnect()}>
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setSheetOpen(true)}>
              Connect…
            </Button>
          )}
        </div>
      </section>

      <ModelPicker />

      <section className="settings-section" aria-labelledby="settings-about">
        <h2 id="settings-about">About</h2>
        <ul className="settings-list">
          <li>
            <span>Pocket Agent</span>
            <span className="muted">v{APP_VERSION}</span>
          </li>
          <li>
            <span>License</span>
            <span className="muted">MIT</span>
          </li>
          <li>
            <span>Affiliation</span>
            <span className="muted">Independent — not an OpenCode product</span>
          </li>
        </ul>
      </section>

      <ConnectSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
