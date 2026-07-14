import type { ReactNode } from 'react'
import './styles.css'

export interface SheetProps {
  open: boolean
  title?: string
  onClose: () => void
  children: ReactNode
}

/**
 * Bottom sheet — the mobile-friendly alternative to centered modals.
 * Content stays in thumb reach and never covers the whole screen.
 */
export function Sheet({ open, title, onClose, children }: SheetProps) {
  if (!open) {
    return null
  }
  return (
    <>
      <div className="pa-sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="pa-sheet" role="dialog" aria-modal="true" aria-label={title}>
        {title ? <div className="pa-sheet-title">{title}</div> : null}
        {children}
      </div>
    </>
  )
}
