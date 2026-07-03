// Shared types for the frontend.

export type Provider = 'openrouter' | 'openai' | 'custom';

export interface Settings {
  provider: Provider;
  baseUrl: string;
  apiKey: string; // always '' coming from the server (masked)
  model: string;
  projectRoot: string;
  hasApiKey?: boolean;
}

export interface ProviderPreset {
  label: string;
  baseUrl: string;
}

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ModelOption {
  id: string;
}

export interface AskMode {
  id: 'explain' | 'fix' | 'refactor' | 'tests';
  label: string;
}

export interface FileItem {
  name: string;
  type: 'file' | 'dir';
  path: string;
}

// A friendly error shape used across the app.
export interface AppError {
  message: string;
  kind: string;
}
