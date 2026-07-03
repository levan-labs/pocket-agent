// Settings endpoints: read (key hidden) and update.
import { Router } from 'express';
import { getPublicSettings, saveSettings } from '../storage.js';
import { PROVIDERS } from '../config.js';

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

export default router;
