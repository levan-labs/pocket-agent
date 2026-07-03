// Chat endpoint. Supports two inputs:
//  1) A raw messages array (from the Chat page).
//  2) A mode + code payload (from the Ask Code page) -> expanded via prompt templates.
// Responds as an SSE stream so the UI can render tokens live.
import { Router } from 'express';
import { getSettings } from '../storage.js';
import { chatStream, ApiError } from '../aiClient.js';
import { buildModeMessages } from '../prompts.js';

const router = Router();

function resolveMessages(body) {
  if (body.mode) {
    return buildModeMessages(body.mode, {
      code: body.code || '',
      language: body.language || '',
      note: body.note || ''
    });
  }
  if (Array.isArray(body.messages)) return body.messages;
  throw new ApiError('No messages or mode provided.', { kind: 'bad_request', status: 400 });
}

router.post('/', async (req, res) => {
  let messages;
  try {
    messages = resolveMessages(req.body || {});
  } catch (err) {
    return res.status(400).json({ error: err.message, kind: err.kind || 'bad_request' });
  }

  // Set up Server-Sent Events.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    for await (const delta of chatStream(getSettings(), messages)) {
      send('delta', { text: delta });
    }
    send('done', {});
  } catch (err) {
    const kind = err instanceof ApiError ? err.kind : 'unknown';
    send('error', { error: err.message, kind });
  } finally {
    res.end();
  }
});

export default router;
