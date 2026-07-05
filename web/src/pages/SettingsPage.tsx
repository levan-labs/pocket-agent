// Settings: provider, base URL, API key, model selector, project folder.
import { useEffect, useState } from 'react';
import { useSettings } from '../store';
import { api } from '../api';
import type { AppError, ModelOption, Provider } from '../types';
import { ErrorBanner } from '../components/ErrorBanner';

export function SettingsPage() {
  const { settings, providers, save, refresh } = useSettings();

  const [provider, setProvider] = useState<Provider>('openrouter');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [projectRoot, setProjectRoot] = useState('');

  const [models, setModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  // Load current settings into the form once available.
  useEffect(() => {
    if (!settings) return;
    setProvider(settings.provider);
    setBaseUrl(settings.baseUrl);
    setModel(settings.model);
    setProjectRoot(settings.projectRoot);
  }, [settings]);

  // Switching provider fills in its default base URL (unless custom).
  const onProviderChange = (p: Provider) => {
    setProvider(p);
    const preset = providers[p];
    if (preset && p !== 'custom') setBaseUrl(preset.baseUrl);
  };

  const onSave = async () => {
    setError(null);
    setTestMessage('');
    setSaved(false);
    try {
      await save({ provider, baseUrl, apiKey, model, projectRoot });
      setApiKey(''); // clear the field; server now stores it
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      setError({ message: e.message, kind: e.kind || 'unknown' });
    }
  };

  // Fetch the model list from the provider (needs a saved key).
  const loadModels = async () => {
    setError(null);
    setLoadingModels(true);
    try {
      const { models } = await api.getModels();
      setModels(models);
    } catch (e: any) {
      setError({ message: e.message, kind: e.kind || 'unknown' });
    } finally {
      setLoadingModels(false);
    }
  };

  const testConnection = async () => {
    setError(null);
    setTestMessage('');
    setTesting(true);
    try {
      await api.testSettings();
      setTestMessage('Connection OK.');
    } catch (e: any) {
      setError({ message: e.message, kind: e.kind || 'unknown' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <h1 className="text-lg font-semibold">Settings</h1>

      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}

      <div className="card space-y-3 p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Provider</span>
          <select
            className="input"
            value={provider}
            onChange={(e) => onProviderChange(e.target.value as Provider)}
          >
            {Object.entries(providers).map(([id, p]) => (
              <option key={id} value={id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">API base URL</span>
          <input
            className="input font-mono text-xs"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://openrouter.ai/api/v1"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">
            API key{' '}
            {settings?.hasApiKey && (
              <span className="font-mono text-green-400">saved {settings.maskedApiKey}</span>
            )}
          </span>
          <input
            className="input font-mono text-xs"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={settings?.hasApiKey ? '•••••••• (leave blank to keep)' : 'Paste your key'}
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            The full key is stored only on this device and is never shown again.
          </span>
        </label>
      </div>

      <div className="card space-y-3 p-4">
        <div className="flex min-w-0 flex-col gap-2 min-[380px]:flex-row min-[380px]:items-end">
          <label className="block flex-1 text-sm">
            <span className="mb-1 block text-slate-400">Model</span>
            <input
              className="input font-mono text-xs"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="openai/gpt-4o-mini"
              list="model-list"
            />
            <datalist id="model-list">
              {models.map((m) => (
                <option key={m.id} value={m.id} />
              ))}
            </datalist>
          </label>
          <button className="btn-ghost min-[380px]:shrink-0" onClick={loadModels} disabled={loadingModels}>
            {loadingModels ? '…' : 'Load'}
          </button>
        </div>
        {models.length > 0 && (
          <p className="text-[11px] text-slate-500">
            {models.length} models loaded — start typing in the box to filter.
          </p>
        )}
      </div>

      <div className="card space-y-3 p-4">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-400">Project folder (optional)</span>
          <input
            className="input font-mono text-xs"
            value={projectRoot}
            onChange={(e) => setProjectRoot(e.target.value)}
            placeholder="/data/data/com.termux/files/home/myproject"
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            Absolute path the agent may read and (with approval) write. Leave empty to disable file access.
          </span>
        </label>
      </div>

      <div className="flex min-w-0 flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center">
        <button className="btn-primary flex-1" onClick={onSave}>
          {saved ? '✓ Saved' : 'Save settings'}
        </button>
        <button
          className="btn-ghost min-[380px]:shrink-0"
          onClick={testConnection}
          disabled={testing || !settings?.hasApiKey}
        >
          {testing ? 'Testing…' : 'Test connection'}
        </button>
        <button className="btn-ghost min-[380px]:shrink-0" onClick={() => refresh()}>
          Reload
        </button>
      </div>
      {testMessage && <p className="text-sm text-green-400">{testMessage}</p>}
    </div>
  );
}
