const APP_VERSION = '0.1.0'

export function SettingsPage() {
  return (
    <div className="page-scroll">
      <section className="settings-section" aria-labelledby="settings-provider">
        <h2 id="settings-provider">Provider</h2>
        <ul className="settings-list">
          <li>
            <span>Active provider</span>
            <span className="muted">None (connect in Step 5)</span>
          </li>
        </ul>
      </section>

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
    </div>
  )
}
