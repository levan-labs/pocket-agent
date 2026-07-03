// Project file context: list / read / write.
// Everything is confined to `projectRoot` from settings. Writes are only ever
// triggered by an explicit user "Apply" action in the UI (approval-based).
import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { getSettings } from '../storage.js';

const router = Router();

// Folders we never want to walk into on a phone — they are huge and noisy.
const IGNORED = new Set(['node_modules', '.git', 'dist', '.cache', 'build']);

// Resolve a user-supplied relative path safely inside projectRoot.
// Throws if projectRoot is unset or the path escapes it (e.g. "../../etc").
function safeResolve(relPath = '') {
  const { projectRoot } = getSettings();
  if (!projectRoot) {
    const e = new Error('No project folder set. Add one in Settings.');
    e.status = 400;
    throw e;
  }
  const root = path.resolve(projectRoot);
  const target = path.resolve(root, relPath);
  if (target !== root && !target.startsWith(root + path.sep)) {
    const e = new Error('Path is outside the project folder.');
    e.status = 403;
    throw e;
  }
  return { root, target };
}

// GET /api/files/list?dir=sub/dir
router.get('/list', (req, res) => {
  try {
    const { root, target } = safeResolve(req.query.dir || '');
    const entries = fs.readdirSync(target, { withFileTypes: true });
    const items = entries
      .filter((e) => !IGNORED.has(e.name))
      .map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file',
        path: path.relative(root, path.join(target, e.name))
      }))
      .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
    res.json({ dir: path.relative(root, target), items });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/files/read?path=src/index.js
router.get('/read', (req, res) => {
  try {
    const { target } = safeResolve(req.query.path || '');
    const stat = fs.statSync(target);
    if (stat.isDirectory()) return res.status(400).json({ error: 'That path is a folder.' });
    // Guard against reading giant files into a phone's memory (>1MB).
    if (stat.size > 1024 * 1024) return res.status(413).json({ error: 'File too large to open (>1MB).' });
    const content = fs.readFileSync(target, 'utf8');
    res.json({ path: req.query.path, content });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/files/write  { path, content }
// Called only after the user reviews a diff and taps "Apply".
router.post('/write', (req, res) => {
  try {
    const { path: relPath, content } = req.body || {};
    if (typeof relPath !== 'string' || typeof content !== 'string') {
      return res.status(400).json({ error: 'path and content are required.' });
    }
    const { target } = safeResolve(relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');
    res.json({ ok: true, path: relPath });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
