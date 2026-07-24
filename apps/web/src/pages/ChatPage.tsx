import { useRef, useState } from 'react'
import type { ChatMessage, PermissionRequest } from '@pocket-agent/shared-types'
import { useAgentConnection } from '../features/agent/AgentContext'
import { Composer } from '../features/chat/Composer'
import { MessageList } from '../features/chat/MessageList'
import { PermissionCard } from '../features/chat/PermissionCard'

/**
 * Chat tab: scrollable message list, permission card (thumb reach), and
 * flex-pinned composer. Conversation state is rendered purely from the
 * provider's AgentEvent stream.
 */
export function ChatPage() {
  const { provider } = useAgentConnection()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [permission, setPermission] = useState<PermissionRequest | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  // Conversation state belongs to one connection; reset when it changes.
  const lastProviderRef = useRef(provider)
  if (lastProviderRef.current !== provider) {
    lastProviderRef.current = provider
    sessionIdRef.current = null
    if (messages.length > 0) setMessages([])
    if (permission) setPermission(null)
    if (error) setError(null)
  }

  async function ensureSession(): Promise<string> {
    if (!provider) throw new Error('No provider connected.')
    if (sessionIdRef.current) return sessionIdRef.current
    const session = await provider.createSession()
    sessionIdRef.current = session.id
    return session.id
  }

  function upsertAssistantText(messageId: string, sessionId: string, delta: string) {
    setMessages((prev) => {
      const existing = prev.find((m) => m.id === messageId)
      if (!existing) {
        return [
          ...prev,
          {
            id: messageId,
            sessionId,
            role: 'assistant' as const,
            text: delta,
            createdAt: new Date().toISOString(),
            pending: true,
          },
        ]
      }
      return prev.map((m) => (m.id === messageId ? { ...m, text: m.text + delta } : m))
    })
  }

  async function handleSend(text: string) {
    if (!provider) return
    setError(null)
    setStreaming(true)
    try {
      const sessionId = await ensureSession()

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sessionId,
          role: 'user',
          text,
          createdAt: new Date().toISOString(),
        },
      ])

      for await (const event of provider.sendMessage(sessionId, text)) {
        switch (event.type) {
          case 'message.start':
            upsertAssistantText(event.messageId, event.sessionId, '')
            break
          case 'message.delta':
            upsertAssistantText(event.messageId, sessionId, event.text)
            break
          case 'message.end':
            setMessages((prev) =>
              prev.map((m) => (m.id === event.messageId ? { ...m, pending: false } : m)),
            )
            break
          case 'permission.requested':
            setPermission(event.request)
            break
          case 'permission.resolved':
            setPermission(null)
            break
          case 'error':
            setError(event.message)
            break
          default:
            // tool.* and session.updated are not rendered yet.
            break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setStreaming(false)
      setPermission(null)
    }
  }

  if (!provider) {
    return (
      <div className="chat-page">
        <div className="empty-state">
          <h2>Not connected</h2>
          <p>Connect a provider in Settings to start chatting.</p>
          <span className="badge-soon">Settings → Provider → Connect</span>
        </div>
        <Composer onSend={handleSend} disabled />
      </div>
    )
  }

  return (
    <div className="chat-page">
      <MessageList messages={messages} />
      {error && (
        <p className="chat-error" role="alert">
          {error}
        </p>
      )}
      {permission && (
        <PermissionCard
          request={permission}
          onApprove={(id) => void provider.approvePermission(id)}
          onDeny={(id) => void provider.denyPermission(id)}
        />
      )}
      <Composer onSend={handleSend} disabled={streaming} />
    </div>
  )
}
