import { useEffect, useState } from 'react'
import type { ModelOption } from '@pocket-agent/shared-types'
import { useAgentConnection } from './AgentContext'

function modelKey(model: { providerId: string; id: string }): string {
  return `${encodeURIComponent(model.providerId)}|${encodeURIComponent(model.id)}`
}

function parseModelKey(key: string): { providerId: string; id: string } | null {
  const sep = key.indexOf('|')
  if (sep === -1) return null
  try {
    return {
      providerId: decodeURIComponent(key.slice(0, sep)),
      id: decodeURIComponent(key.slice(sep + 1)),
    }
  } catch {
    return null
  }
}

/**
 * Settings section: pick a model from the connected provider when
 * getCapabilities().models is true.
 */
export function ModelPicker() {
  const { provider, status } = useAgentConnection()
  const canPick = Boolean(
    status === 'connected' &&
      provider?.getCapabilities().models &&
      provider.listModels &&
      provider.getSelectedModel &&
      provider.setSelectedModel,
  )

  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedKey, setSelectedKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!canPick || !provider?.listModels) {
      setModels([])
      setSelectedKey('')
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void provider
      .listModels()
      .then((list) => {
        if (cancelled) return
        setModels(list)
        const selected = provider.getSelectedModel?.()
        setSelectedKey(selected ? modelKey(selected) : '')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setModels([])
        setSelectedKey('')
        setError(err instanceof Error ? err.message : 'Failed to load models.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [provider, canPick])

  if (!canPick) {
    if (status !== 'connected') {
      return (
        <section className="settings-section" aria-labelledby="settings-model">
          <h2 id="settings-model">Model</h2>
          <p className="settings-hint">Connect OpenCode to choose a model.</p>
        </section>
      )
    }
    return (
      <section className="settings-section" aria-labelledby="settings-model">
        <h2 id="settings-model">Model</h2>
        <p className="settings-hint">This provider does not support model selection.</p>
      </section>
    )
  }

  async function handleChange(nextKey: string) {
    if (!provider?.setSelectedModel) return
    const parsed = parseModelKey(nextKey)
    if (!parsed) return
    setSaving(true)
    setError(null)
    try {
      await provider.setSelectedModel(parsed)
      setSelectedKey(nextKey)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set model.')
    } finally {
      setSaving(false)
    }
  }

  const selected = models.find((m) => modelKey(m) === selectedKey)

  return (
    <section className="settings-section" aria-labelledby="settings-model">
      <h2 id="settings-model">Model</h2>
      <ul className="settings-list">
        <li>
          <span>Active model</span>
          <span className="muted">
            {loading ? 'Loading…' : (selected?.name ?? 'None')}
          </span>
        </li>
        {selected?.providerName && (
          <li>
            <span>Via</span>
            <span className="muted">{selected.providerName}</span>
          </li>
        )}
      </ul>

      <label className="model-picker">
        <span className="visually-hidden">Choose model</span>
        <select
          className="model-picker__select"
          value={selectedKey}
          disabled={loading || saving || models.length === 0}
          onChange={(e) => void handleChange(e.target.value)}
        >
          {models.length === 0 && <option value="">No models available</option>}
          {models.map((model) => (
            <option key={modelKey(model)} value={modelKey(model)}>
              {model.providerName
                ? `${model.name} (${model.providerName})`
                : model.name}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
      <p className="settings-hint">
        API keys stay in OpenCode. Pocket Agent only chooses which model to use.
      </p>
    </section>
  )
}
