/**
 * Placeholder — a real file explorer needs a provider with the `files`
 * capability, which no Milestone 1 provider offers yet. The page states
 * this clearly instead of pretending to work.
 */
export function FilesPage() {
  return (
    <div className="empty-state">
      <h2>Files</h2>
      <p>
        File browsing needs a connected provider with file support. No
        available provider offers this yet.
      </p>
      <span className="badge-soon">Not available yet</span>
    </div>
  )
}
