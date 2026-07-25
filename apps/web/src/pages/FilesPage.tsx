import { useEffect, useState } from 'react'
import type { FileEntry } from '@pocket-agent/shared-types'
import { useAgentConnection } from '../features/agent/AgentContext'

function parentPath(path: string): string | null {
  const normalized = path.replace(/\/+$/, '')
  if (!normalized || normalized === '.') return null
  const idx = normalized.lastIndexOf('/')
  if (idx === -1) return '.'
  return normalized.slice(0, idx) || '.'
}

function displayPath(path: string): string {
  if (!path || path === '.') return '/'
  return `/${path.replace(/\/+$/, '')}`
}

function sortEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/**
 * File browser — lists directories via the connected provider's listFiles
 * when getCapabilities().files is true.
 */
export function FilesPage() {
  const { provider } = useAgentConnection()
  const canBrowse = Boolean(provider?.getCapabilities().files && provider.listFiles)

  const [path, setPath] = useState('.')
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset browse state when the connection changes (same pattern as ChatPage).
  const [seenProvider, setSeenProvider] = useState(provider)
  if (seenProvider !== provider) {
    setSeenProvider(provider)
    setPath('.')
    setEntries([])
    setError(null)
  }

  useEffect(() => {
    if (!provider || !canBrowse || !provider.listFiles) {
      setEntries([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void provider
      .listFiles(path)
      .then((next) => {
        if (cancelled) return
        setEntries(sortEntries(next))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setEntries([])
        setError(err instanceof Error ? err.message : 'Failed to list files.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [provider, canBrowse, path])

  if (!provider) {
    return (
      <div className="page-scroll">
        <div className="empty-state">
          <h2>Not connected</h2>
          <p>Connect a provider in Settings to browse files.</p>
          <span className="badge-soon">Settings → Provider → Connect</span>
        </div>
      </div>
    )
  }

  if (!canBrowse) {
    return (
      <div className="page-scroll">
        <div className="empty-state">
          <h2>Files</h2>
          <p>
            This provider does not support file browsing. Connect OpenCode
            for a project file list.
          </p>
          <span className="badge-soon">Not available for this provider</span>
        </div>
      </div>
    )
  }

  const up = parentPath(path)

  return (
    <div className="files-page">
      <div className="files-toolbar">
        <button
          type="button"
          className="files-up"
          disabled={up === null || loading}
          onClick={() => {
            if (up !== null) setPath(up)
          }}
        >
          Up
        </button>
        <p className="files-path" title={displayPath(path)}>
          {displayPath(path)}
        </p>
      </div>

      {error && (
        <p className="files-error" role="alert">
          {error}
        </p>
      )}

      {loading && entries.length === 0 ? (
        <p className="files-status" role="status">
          Loading…
        </p>
      ) : entries.length === 0 && !error ? (
        <div className="empty-state">
          <h2>Empty folder</h2>
          <p>Nothing to show here.</p>
        </div>
      ) : (
        <ul className="files-list" aria-label={`Files in ${displayPath(path)}`}>
          {entries.map((entry) => {
            const isDir = entry.kind === 'directory'
            const listPath = entry.path.replace(/\/+$/, '') || '.'
            return (
              <li key={entry.path}>
                {isDir ? (
                  <button
                    type="button"
                    className="files-row"
                    onClick={() => setPath(listPath)}
                  >
                    <span className="files-row__name">{entry.name}</span>
                    <span className="files-row__meta">folder</span>
                  </button>
                ) : (
                  <div className="files-row files-row--file">
                    <span className="files-row__name">{entry.name}</span>
                    <span className="files-row__meta">file</span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
