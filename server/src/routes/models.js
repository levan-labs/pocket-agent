// Model list endpoint: proxies the provider's /models so the API key stays server-side.
import { Router } from 'express';
import { getSettings } from '../storage.js';
import { listModels, ApiError } from '../aiClient.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const models = await listModels(getSettings());
    res.json({ models });
  } catch (err) {
    const status = err instanceof ApiError ? err.status || 400 : 500;
    res.status(status).json({ error: err.message, kind: err.kind || 'unknown' });
  }
});

export default router;
