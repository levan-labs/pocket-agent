// Tiny fetch wrapper around the backend API. No external HTTP library.
import type { Settings, ProviderPreset, ModelOption, AskMode, FileItem, ChatMessage } from './types';

// A parsed error that carries the backend's `kind` for nicer UI messages.
export class RequestError extends Error {
  kind: string;
  status: number;
  constructor(message: string, kind = 'unknown', status = 0) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

async function parseError(res: Response): Promise<RequestError> {
  try {
    const body = await res.json();
    return new RequestError(body.error || res.statusText, body.kind || 'unknown', res.status);
  } catch {
    return new RequestError(res.statusText || 'Request failed', 'unknown', res.status);
  }
}

async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new RequestError('Cannot reach the local server. Is it running?', 'network');
  }
  if (!res.ok) throw await parseError(res);
  return res.json();
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new RequestError('Cannot reach the local server. Is it running?', 'network');
  }
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export const api = {
  getSettings: () =>
    getJson<{ settings: Settings; providers: Record<string, ProviderPreset> }>('/api/settings'),
  saveSettings: (patch: Partial<Settings>) =>
    postJson<{ settings: Settings }>('/api/settings', patch),
  getModels: () => getJson<{ models: ModelOption[] }>('/api/models'),
  getModes: () => getJson<{ modes: AskMode[] }>('/api/modes'),
  listFiles: (dir = '') =>
    getJson<{ dir: string; items: FileItem[] }>(`/api/files/list?dir=${encodeURIComponent(dir)}`),
  readFile: (path: string) =>
    getJson<{ path: string; content: string }>(`/api/files/read?path=${encodeURIComponent(path)}`),
  writeFile: (path: string, content: string) =>
    postJson<{ ok: true; path: string }>('/api/files/write', { path, content })
};

// Stream a chat response via SSE. Calls onDelta for each token chunk.
// `body` is either { messages } or { mode, code, language, note }.
export async function streamChat(
  body: { messages?: ChatMessage[]; mode?: string; code?: string; language?: string; note?: string },
  handlers: { onDelta: (text: string) => void; onDone: () => void; onError: (err: RequestError) => void },
  signal?: AbortSignal
): Promise<void> {
  let res: Response;
  try {
    res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') return;
    handlers.onError(new RequestError('Cannot reach the local server. Is it running?', 'network'));
    return;
  }

  // A non-stream error (e.g. bad request) comes back as JSON, not SSE.
  if (!res.ok || !res.body) {
    handlers.onError(await parseError(res));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';
      for (const evt of events) {
        const lines = evt.split('\n');
        const eventType = lines.find((l) => l.startsWith('event:'))?.slice(6).trim();
        const dataLine = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
        if (!dataLine) continue;
        const data = JSON.parse(dataLine);
        if (eventType === 'delta') handlers.onDelta(data.text);
        else if (eventType === 'error') handlers.onError(new RequestError(data.error, data.kind));
        else if (eventType === 'done') handlers.onDone();
      }
    }
  } catch (e) {
    if ((e as Error).name !== 'AbortError') {
      handlers.onError(new RequestError('Stream interrupted.', 'network'));
    }
  }
}
