// Bottom tab bar — the primary navigation on mobile.
export type TabId = 'chat' | 'ask' | 'files' | 'settings';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'ask', label: 'Ask Code', icon: '⚡' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
];

export function Nav({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav className="safe-bottom shrink-0 border-t border-line bg-panel">
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] leading-tight transition ${
              active === t.id ? 'text-accent' : 'text-slate-400'
            }`}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {t.icon}
            </span>
            <span className="max-w-full truncate">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
