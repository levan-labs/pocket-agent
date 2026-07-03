// Central config + provider presets.
// Keep this tiny and dependency-free so it runs anywhere (incl. Termux).

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server listens here. Override with PORT env var if 5174 is taken.
export const PORT = Number(process.env.PORT) || 5174;

// Where local settings/history JSON files live (gitignored).
export const DATA_DIR = path.join(__dirname, '..', 'data');

// Where the built frontend lives (produced by `npm run build`).
export const WEB_DIST = path.join(__dirname, '..', '..', 'web', 'dist');

// Known OpenAI-compatible providers. "custom" lets the user paste any base URL.
export const PROVIDERS = {
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1'
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1'
  },
  custom: {
    label: 'Custom (OpenAI-compatible)',
    baseUrl: ''
  }
};

// Default settings created on first run.
export const DEFAULT_SETTINGS = {
  provider: 'openrouter',
  baseUrl: PROVIDERS.openrouter.baseUrl,
  apiKey: '',
  model: 'openai/gpt-4o-mini',
  // Absolute path to the project folder the agent can read/write (approval-gated).
  // Empty = disabled. On Termux this is usually /data/data/com.termux/files/home/...
  projectRoot: ''
};
