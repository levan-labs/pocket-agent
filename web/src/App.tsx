// App shell: holds the active tab and wires the pages together.
// We use simple state-based tabs instead of a router to stay lightweight.
import { useState } from 'react';
import { SettingsProvider, useSettings } from './store';
import { Nav, TabId } from './components/Nav';
import { ChatPage } from './pages/ChatPage';
import { AskCodePage } from './pages/AskCodePage';
import { FilesPage } from './pages/FilesPage';
import { SettingsPage } from './pages/SettingsPage';

function SetupNudge({ onGoSettings }: { onGoSettings: () => void }) {
  const { settings, loading } = useSettings();
  if (loading || settings?.hasApiKey) return null;
  return (
    <button
      onClick={onGoSettings}
      className="w-full bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-300"
    >
      No API key set yet — tap to open Settings.
    </button>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabId>('chat');
  // File chosen in the Files page to open in Ask Code. Bumped with a nonce so
  // re-selecting the same file re-triggers the load.
  const [attach, setAttach] = useState<{ path: string; nonce: number } | null>(null);

  const openInAsk = (path: string) => {
    setAttach({ path, nonce: Date.now() });
    setTab('ask');
  };

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <div className="safe-top" />
      <SetupNudge onGoSettings={() => setTab('settings')} />

      <main className="flex-1 overflow-y-auto">
        {tab === 'chat' && <ChatPage />}
        {tab === 'ask' && <AskCodePage key={attach?.nonce} attachFile={attach?.path} />}
        {tab === 'files' && <FilesPage onOpenInAsk={openInAsk} />}
        {tab === 'settings' && <SettingsPage />}
      </main>

      <Nav active={tab} onChange={setTab} />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  );
}
