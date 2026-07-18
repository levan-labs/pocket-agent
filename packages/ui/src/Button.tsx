import type { ButtonHTMLAttributes } from 'react'
import './styles.css'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

/** Touch-friendly button (min 48px target) driven by design tokens. */
export function Button({ variant = 'secondary', className, type, ...rest }: ButtonProps) {
  const classes = ['pa-button', `pa-button--${variant}`, className]
    .filter(Boolean)
    .join(' ')
  return <button type={type ?? 'button'} className={classes} {...rest} />
}
