import { useState } from 'react'
import { BottomNav, type Tab } from './features/nav/BottomNav'
import { ChatPage } from './pages/ChatPage'
import { FilesPage } from './pages/FilesPage'
import { SettingsPage } from './pages/SettingsPage'
import { TerminalPage } from './pages/TerminalPage'

const TITLES: Record<Tab, string> = {
  chat: 'Pocket Agent',
  files: 'Files',
  terminal: 'Terminal',
  settings: 'Settings',
}

export function App() {
  const [tab, setTab] = useState<Tab>('chat')

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{TITLES[tab]}</h1>
      </header>
      <main className="app-main">
        {tab === 'chat' && <ChatPage />}
        {tab === 'files' && <FilesPage />}
        {tab === 'terminal' && <TerminalPage />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      <BottomNav active={tab} onSelect={setTab} />
    </div>
  )
}
