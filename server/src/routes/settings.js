// Settings endpoints: read (key hidden) and update.
import { Router } from 'express';
import { getPublicSettings, getSettings, saveSettings } from '../storage.js';
import { PROVIDERS } from '../config.js';
import { chatOnce, ApiError } from '../aiClient.js';

const router = Router();

// GET /api/settings -> current settings with the API key masked.
router.get('/', (req, res) => {
  res.json({ settings: getPublicSettings(), providers: PROVIDERS });
});

// POST /api/settings -> save a partial update.
// An empty apiKey is ignored so users don't wipe their key by accident.
router.post('/', (req, res) => {
  const { provider, baseUrl, apiKey, model, projectRoot } = req.body || {};
  const patch = {};
  if (typeof provider === 'string') patch.provider = provider;
  if (typeof baseUrl === 'string') patch.baseUrl = baseUrl;
  if (typeof model === 'string') patch.model = model;
  if (typeof projectRoot === 'string') patch.projectRoot = projectRoot;
  if (typeof apiKey === 'string' && apiKey.trim() !== '') patch.apiKey = apiKey.trim();

  saveSettings(patch);
  res.json({ settings: getPublicSettings() });
});

// POST /api/settings/test -> make a tiny provider request using the server-side key.
router.post('/test', async (req, res) => {
  try {
    const text = await chatOnce(
      getSettings(),
      [
        { role: 'system', content: 'Reply with exactly: ok' },
        { role: 'user', content: 'Connection test' }
      ],
      { temperature: 0, maxTokens: 8 }
    );
    res.json({ ok: true, message: text || 'ok' });
  } catch (err) {
    const status = err instanceof ApiError ? err.status || 400 : 500;
    res.status(status).json({ error: err.message, kind: err.kind || 'unknown' });
  }
});

export default router;
