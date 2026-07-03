// Dead-simple JSON file storage for settings + chat history.
// We intentionally avoid SQLite so there is no native build step on Android.

import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, DEFAULT_SETTINGS } from './config.js';

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    // Corrupt file: fall back to defaults instead of crashing.
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataDir();
  // Restrict file permissions where supported (0600) since it holds the API key.
  fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
}

// Raw settings from disk merged with defaults. Does NOT apply the env fallback,
// so it is safe to use as the base when writing back to disk.
function readStoredSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson(SETTINGS_FILE, {}) };
}

// API key from the environment, checked only when nothing is saved via the UI.
function envApiKey() {
  return process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || '';
}

export function getSettings() {
  const s = readStoredSettings();
  // Fallback: if no key was saved through the UI, use an environment variable
  // (e.g. `export OPENROUTER_API_KEY=... && npm run dev`). A UI-saved key always
  // wins, and the env key is never written to disk.
  if (!s.apiKey) s.apiKey = envApiKey();
  return s;
}

export function saveSettings(patch) {
  // Base on the raw stored settings (not env-resolved) so an env-provided key
  // is never accidentally persisted to settings.json.
  const next = { ...readStoredSettings(), ...patch };
  writeJson(SETTINGS_FILE, next);
  return getSettings();
}

// Return settings but hide the real API key from the frontend.
// The frontend only needs to know whether a key exists.
export function getPublicSettings() {
  const s = getSettings();
  return { ...s, apiKey: '', hasApiKey: Boolean(s.apiKey) };
}

export function getHistory() {
  return readJson(HISTORY_FILE, []);
}

export function saveHistory(list) {
  // Keep only the most recent 50 conversations to bound file size on a phone.
  writeJson(HISTORY_FILE, list.slice(-50));
  return list;
}
