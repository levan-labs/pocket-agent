// Pocket Agent backend entry point.
// One process serves the JSON/SSE API AND the built React app (in production).
import express from 'express';
import fs from 'node:fs';
import { PORT, WEB_DIST } from './config.js';
import { listModes } from './prompts.js';

import settingsRoutes from './routes/settings.js';
import modelsRoutes from './routes/models.js';
import chatRoutes from './routes/chat.js';
import filesRoutes from './routes/files.js';

const app = express();
app.use(express.json({ limit: '2mb' })); // room for pasted files, but bounded.

// Health check + list of Ask-Code modes for the UI.
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/modes', (req, res) => res.json({ modes: listModes() }));

app.use('/api/settings', settingsRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', filesRoutes);

// Serve the built frontend if it exists (production / phone usage).
if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  // SPA fallback: send index.html for any non-API route.
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile('index.html', { root: WEB_DIST }));
} else {
  app.get('/', (req, res) =>
    res
      .type('text')
      .send('Pocket Agent API is running. Build the frontend with `npm run build`, or use `npm run dev` for development.')
  );
}

// Catch-all error handler so a thrown error never crashes the process.
app.use((err, req, res, next) => {
  console.error('[pocket-agent] error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n  Pocket Agent server → http://localhost:${PORT}\n`);
});
