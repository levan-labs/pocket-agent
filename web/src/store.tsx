// A small settings context so every page can read the current provider/model
// and know whether an API key is configured.
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';
import type { Settings, ProviderPreset } from './types';

interface SettingsContextValue {
  settings: Settings | null;
  providers: Record<string, ProviderPreset>;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (patch: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [providers, setProviders] = useState<Record<string, ProviderPreset>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await api.getSettings();
    setSettings(data.settings);
    setProviders(data.providers);
  }, []);

  const save = useCallback(async (patch: Partial<Settings>) => {
    const data = await api.saveSettings(patch);
    setSettings(data.settings);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, providers, loading, refresh, save }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
