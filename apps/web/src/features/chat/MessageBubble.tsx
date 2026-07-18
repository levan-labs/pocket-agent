import type { ChatMessage } from '@pocket-agent/shared-types'

export interface MessageBubbleProps {
  message: ChatMessage
}

/** Single chat bubble — user on the right, assistant on the left. */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const classes = [
    'message-bubble',
    isUser ? 'message-bubble--user' : 'message-bubble--assistant',
    message.pending ? 'message-bubble--pending' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={classes}
      aria-label={isUser ? 'Your message' : 'Assistant message'}
      aria-busy={message.pending || undefined}
    >
      <p className="message-bubble__text">{message.text || (message.pending ? '…' : '')}</p>
    </article>
  )
}
