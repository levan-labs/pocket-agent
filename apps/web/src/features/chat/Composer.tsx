import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button, Icon } from '@pocket-agent/ui'

export interface ComposerProps {
  onSend: (text: string) => void
  disabled?: boolean
}

/**
 * Keyboard-safe message composer. Lives in the chat flex column (not
 * position:fixed) so the message list shrinks when the Android keyboard opens.
 */
export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [text, setText] = useState('')
  const inputId = useId()
  const trimmed = text.trim()
  const canSend = !disabled && trimmed.length > 0

  function submit() {
    if (!canSend) return
    onSend(trimmed)
    setText('')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop convenience: Enter sends, Shift+Enter inserts a newline.
    // On mobile soft keyboards Enter typically inserts a newline.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit} aria-label="Message composer">
      <label className="visually-hidden" htmlFor={inputId}>
        Message
      </label>
      <textarea
        id={inputId}
        className="composer__input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Message…"
        rows={1}
        disabled={disabled}
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="on"
        spellCheck
      />
      <Button
        type="submit"
        variant="primary"
        className="composer__send"
        disabled={!canSend}
        aria-label="Send message"
      >
        <Icon name="send" />
      </Button>
    </form>
  )
}
