const PATHS = {
  chat: 'M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-5 4V5a1 1 0 0 1 1-1Z',
  files:
    'M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6Z',
  terminal: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 4 3 3-3 3m5 0h4',
  settings:
    'M12 8.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5Zm7.5 3.5a7.6 7.6 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2.1-1.2L14.6 3h-4l-.4 2.7a7.6 7.6 0 0 0-2.1 1.2l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 2.1 1.2l.4 2.7h4l.4-2.7a7.6 7.6 0 0 0 2.1-1.2l2.3 1 2-3.4-2-1.5a7.6 7.6 0 0 0 .1-1.2Z',
  send: 'M4 12 20 4l-4 8 4 8-16-8Zm0 0h8',
  plug: 'M9 7V3m6 4V3M7 7h10v4a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7Zm5 9v5',
} as const

export type IconName = keyof typeof PATHS

export interface IconProps {
  name: IconName
  size?: number
  /** Accessible label. Omit for decorative icons (default: hidden). */
  label?: string
}

/** Inline stroke icon inheriting currentColor. No icon-font dependency. */
export function Icon({ name, size = 22, label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
