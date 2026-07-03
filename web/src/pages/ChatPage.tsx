// Chat page: a simple streaming conversation with the model.
import { useEffect, useRef, useState } from 'react';
import { streamChat, RequestError } from '../api';
import { useSettings } from '../store';
import type { AppError, ChatMessage } from '../types';
import { Markdown } from '../components/Markdown';
import { ErrorBanner } from '../components/ErrorBanner';

export function ChatPage() {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setError(null);

    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    // Add an empty assistant message we will fill as tokens arrive.
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamChat(
      { messages: next },
      {
        onDelta: (t) =>
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = {
              role: 'assistant',
              content: copy[copy.length - 1].content + t
            };
            return copy;
          }),
        onDone: () => setStreaming(false),
        onError: (err: RequestError) => {
          setStreaming(false);
          setError({ message: err.message, kind: err.kind });
          // Drop the empty assistant bubble on error.
          setMessages((prev) =>
            prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev
          );
        }
      },
      controller.signal
    );
  };

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h1 className="text-base font-semibold">Chat</h1>
        <div className="flex items-center gap-2">
          <span className="max-w-[45vw] truncate rounded bg-panel px-2 py-1 font-mono text-[11px] text-slate-400">
            {settings?.model || 'no model'}
          </span>
          {messages.length > 0 && (
            <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => setMessages([])}>
              Clear
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-10 text-center text-sm text-slate-500">
            <p className="text-3xl">💬</p>
            <p className="mt-2">Ask anything. Responses stream in live.</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                m.role === 'user' ? 'bg-accent text-white' : 'card'
              }`}
            >
              {m.role === 'assistant' ? (
                m.content ? (
                  <Markdown text={m.content} />
                ) : (
                  <span className="text-slate-500">…</span>
                )
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2 border-t border-line p-3">
        {error && <ErrorBanner error={error} onClose={() => setError(null)} />}
        <div className="flex items-end gap-2">
          <textarea
            className="input max-h-40 min-h-[44px] flex-1 resize-none"
            rows={1}
            value={input}
            placeholder="Type a message…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a newline (desktop-friendly).
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          {streaming ? (
            <button className="btn-ghost" onClick={stop}>
              Stop
            </button>
          ) : (
            <button className="btn-primary" onClick={send} disabled={!input.trim()}>
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
