// Thin client around any OpenAI-compatible chat-completions API.
// Uses the global fetch() built into Node 18+, so there is no HTTP dependency.

// A small typed-ish error so routes can turn failures into friendly messages.
export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'unknown' } = {}) {
    super(message);
    this.status = status;
    this.kind = kind; // 'auth' | 'rate_limit' | 'network' | 'bad_request' | 'server' | 'config' | 'unknown'
  }
}

function buildHeaders(settings) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`
  };
  // OpenRouter recommends these; harmless for other providers.
  headers['HTTP-Referer'] = 'http://localhost';
  headers['X-Title'] = 'Pocket Agent';
  return headers;
}

// Map an HTTP status to a stable "kind" + human message.
function describeStatus(status, bodyText) {
  if (status === 401 || status === 403) {
    return { kind: 'auth', message: 'Invalid or missing API key. Check Settings.' };
  }
  if (status === 429) {
    return { kind: 'rate_limit', message: 'Rate limit or quota exceeded. Slow down or check billing.' };
  }
  if (status >= 500) {
    return { kind: 'server', message: `Provider server error (${status}). Try again shortly.` };
  }
  if (status >= 400) {
    return { kind: 'bad_request', message: `Request rejected (${status}). ${shorten(bodyText)}` };
  }
  return { kind: 'unknown', message: `Unexpected response (${status}).` };
}

function shorten(text = '') {
  const t = String(text).trim();
  return t.length > 200 ? t.slice(0, 200) + '…' : t;
}

function requireConfig(settings) {
  if (!settings.baseUrl) throw new ApiError('No API base URL configured.', { kind: 'config' });
  if (!settings.apiKey) throw new ApiError('No API key configured. Open Settings.', { kind: 'config' });
}

// GET /models — returns the raw list from the provider (array of {id,...}).
export async function listModels(settings) {
  requireConfig(settings);
  let res;
  try {
    res = await fetch(`${settings.baseUrl}/models`, { headers: buildHeaders(settings) });
  } catch (e) {
    throw new ApiError('Network error reaching provider. Check connection.', { kind: 'network' });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const { kind, message } = describeStatus(res.status, body);
    throw new ApiError(message, { status: res.status, kind });
  }
  const json = await res.json().catch(() => ({}));
  const data = Array.isArray(json.data) ? json.data : Array.isArray(json) ? json : [];
  return data.map((m) => ({ id: m.id || m.name })).filter((m) => m.id);
}

// Non-streaming completion. Returns the assistant message string.
export async function chatOnce(settings, messages, { temperature = 0.3 } = {}) {
  requireConfig(settings);
  let res;
  try {
    res = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: buildHeaders(settings),
      body: JSON.stringify({ model: settings.model, messages, temperature, stream: false })
    });
  } catch (e) {
    throw new ApiError('Network error reaching provider. Check connection.', { kind: 'network' });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const { kind, message } = describeStatus(res.status, body);
    throw new ApiError(message, { status: res.status, kind });
  }
  const json = await res.json();
  return json?.choices?.[0]?.message?.content ?? '';
}

// Streaming completion. Yields text deltas as they arrive (async generator).
export async function* chatStream(settings, messages, { temperature = 0.3 } = {}) {
  requireConfig(settings);
  let res;
  try {
    res = await fetch(`${settings.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: buildHeaders(settings),
      body: JSON.stringify({ model: settings.model, messages, temperature, stream: true })
    });
  } catch (e) {
    throw new ApiError('Network error reaching provider. Check connection.', { kind: 'network' });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const { kind, message } = describeStatus(res.status, body);
    throw new ApiError(message, { status: res.status, kind });
  }

  // Parse the SSE stream: lines like `data: {json}` ending with `data: [DONE]`.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? ''; // keep the incomplete last line
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // Ignore keep-alive/comment lines that aren't valid JSON.
      }
    }
  }
}
