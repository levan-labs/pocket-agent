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

  async function handleSend(text: string) {
    if (!provider) return
    setError(null)
    setStreaming(true)
    const thinkingId = `thinking-${crypto.randomUUID()}`
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
        {
          id: thinkingId,
          sessionId,
          role: 'assistant',
          text: 'Working…',
          createdAt: new Date().toISOString(),
          pending: true,
        },
      ])

      let assistantId: string | null = null

      function ensureAssistant(messageId: string, sessionIdForMsg: string) {
        assistantId = messageId
        setMessages((prev) => {
          const withoutThinking = prev.filter((m) => m.id !== thinkingId)
          if (withoutThinking.some((m) => m.id === messageId)) return withoutThinking
          return [
            ...withoutThinking,
            {
              id: messageId,
              sessionId: sessionIdForMsg,
              role: 'assistant' as const,
              text: '',
              createdAt: new Date().toISOString(),
              pending: true,
            },
          ]
        })
      }

      function appendAssistantText(messageId: string, chunk: string) {
        ensureAssistant(messageId, sessionId)
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, text: m.text + chunk } : m)),
        )
      }

      for await (const event of provider.sendMessage(sessionId, text)) {
        switch (event.type) {
          case 'message.start':
            ensureAssistant(event.messageId, event.sessionId)
            break
          case 'message.delta':
            appendAssistantText(event.messageId, event.text)
            break
          case 'tool.start':
          case 'tool.update':
          case 'tool.end': {
            const call = event.toolCall
            // Attach tool activity to the current assistant turn when possible.
            const messageId = assistantId ?? thinkingId
            if (event.type === 'tool.start') {
              const line = call.detail
                ? `\n\nRunning ${call.tool}:\n${call.detail}\n`
                : `\n\nRunning ${call.tool}…\n`
              if (messageId === thinkingId) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === thinkingId ? { ...m, text: (m.text === 'Working…' ? '' : m.text) + line } : m,
                  ),
                )
              } else {
                appendAssistantText(messageId, line)
              }
            }
            if (event.type === 'tool.end' && call.output) {
              const line = `\n${call.output.trimEnd()}\n`
              if (assistantId) {
                appendAssistantText(assistantId, line)
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === thinkingId ? { ...m, text: (m.text === 'Working…' ? '' : m.text) + line } : m,
                  ),
                )
              }
            }
            break
          }
          case 'message.end':
            setMessages((prev) =>
              prev.flatMap((m) => {
                if (m.id === thinkingId) return []
                if (m.id === event.messageId || m.id === assistantId) {
                  const text = m.text.trim()
                    ? m.text
                    : 'Done.'
                  return [{ ...m, text, pending: false }]
                }
                return [m]
              }),
            )
            break
          case 'permission.requested':
            setMessages((prev) =>
              prev.map((m) =>
                m.id === thinkingId || m.id === assistantId
                  ? { ...m, text: m.text.trim() ? m.text : 'Waiting for your approval…' }
                  : m,
              ),
            )
            setPermission(event.request)
            break
          case 'permission.resolved':
            setPermission(null)
            break
          case 'error':
            setMessages((prev) => prev.filter((m) => m.id !== thinkingId))
            setError(event.message)
            break
          default:
            break
        }
      }

      // If the turn ended without replacing the thinking bubble, remove it.
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId))
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== thinkingId))
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setStreaming(false)
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
      {streaming && !permission && (
        <p className="chat-status" role="status">
          Waiting for OpenCode…
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
