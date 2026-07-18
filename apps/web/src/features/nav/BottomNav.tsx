import { Icon, type IconName } from '@pocket-agent/ui'

export type Tab = 'chat' | 'files' | 'terminal' | 'settings'

const TABS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: 'chat', label: 'Chat', icon: 'chat' },
  { id: 'files', label: 'Files', icon: 'files' },
  { id: 'terminal', label: 'Terminal', icon: 'terminal' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

export interface BottomNavProps {
  active: Tab
  onSelect: (tab: Tab) => void
}

export function BottomNav({ active, onSelect }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <Icon name={tab.icon} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
