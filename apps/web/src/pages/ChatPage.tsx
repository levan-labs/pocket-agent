import { useState } from 'react'
import type { ChatMessage } from '@pocket-agent/shared-types'
import { Composer } from '../features/chat/Composer'
import { MessageList } from '../features/chat/MessageList'

/** Local-only session until a real provider is connected (Step 4/5). */
const LOCAL_SESSION_ID = 'local'

/**
 * Chat tab: scrollable message list + flex-pinned composer.
 * Messages are local for now — streaming replies arrive in Step 4.
 */
export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  function handleSend(text: string) {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      sessionId: LOCAL_SESSION_ID,
      role: 'user',
      text,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, message])
  }

  return (
    <div className="chat-page">
      <MessageList messages={messages} />
      <Composer onSend={handleSend} />
    </div>
  )
}
