import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@pocket-agent/shared-types'
import { MessageBubble } from './MessageBubble'

export interface MessageListProps {
  messages: ChatMessage[]
}

/** Scrollable conversation list. Auto-scrolls when new messages arrive. */
export function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="message-list message-list--empty" role="status">
        <div className="empty-state">
          <h2>No messages yet</h2>
          <p>Type below to start a conversation. Your code stays on your phone.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-list" role="log" aria-live="polite" aria-relevant="additions">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} aria-hidden="true" />
    </div>
  )
}
