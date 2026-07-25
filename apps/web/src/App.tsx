import { useState } from 'react'
import { AgentContextProvider } from './features/agent/AgentContext'
import { BottomNav, type Tab } from './features/nav/BottomNav'
import { useVisualViewport } from './hooks/useVisualViewport'
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
  useVisualViewport()

  return (
    <AgentContextProvider>
      <div className="app-shell">
        <header className="app-header">
          <h1>{TITLES[tab]}</h1>
        </header>
        <main className="app-main">
          {/* Keep pages mounted so in-tab state (e.g. chat history) survives switches. */}
          <div
            className={tab === 'chat' ? 'tab-panel' : 'tab-panel tab-panel--hidden'}
            aria-hidden={tab !== 'chat'}
          >
            <ChatPage />
          </div>
          <div
            className={tab === 'files' ? 'tab-panel' : 'tab-panel tab-panel--hidden'}
            aria-hidden={tab !== 'files'}
          >
            <FilesPage />
          </div>
          <div
            className={tab === 'terminal' ? 'tab-panel' : 'tab-panel tab-panel--hidden'}
            aria-hidden={tab !== 'terminal'}
          >
            <TerminalPage />
          </div>
          <div
            className={tab === 'settings' ? 'tab-panel' : 'tab-panel tab-panel--hidden'}
            aria-hidden={tab !== 'settings'}
          >
            <SettingsPage />
          </div>
        </main>
        <BottomNav active={tab} onSelect={setTab} />
      </div>
    </AgentContextProvider>
  )
}
