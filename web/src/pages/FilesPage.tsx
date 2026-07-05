// Simple project/file context panel: browse folders, preview a file,
// and send it to the Ask Code page.
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSettings } from '../store';
import type { AppError, FileItem } from '../types';
import { ErrorBanner } from '../components/ErrorBanner';

export function FilesPage({ onOpenInAsk }: { onOpenInAsk: (path: string) => void }) {
  const { settings } = useSettings();
  const [dir, setDir] = useState('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [preview, setPreview] = useState<{ path: string; content: string } | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  const load = useCallback(async (target: string) => {
    setError(null);
    try {
      const { dir, items } = await api.listFiles(target);
      setDir(dir);
      setItems(items);
      setPreview(null);
    } catch (e: any) {
      setError({ message: e.message, kind: e.kind || 'unknown' });
    }
  }, []);

  useEffect(() => {
    if (settings?.projectRoot) load('');
  }, [settings?.projectRoot, load]);

  const openFile = async (path: string) => {
    setError(null);
    try {
      const data = await api.readFile(path);
      setPreview(data);
    } catch (e: any) {
      setError({ message: e.message, kind: e.kind || 'unknown' });
    }
  };

  const parentDir = () => {
    const parts = dir.split('/').filter(Boolean);
    parts.pop();
    load(parts.join('/'));
  };

  if (!settings?.projectRoot) {
    return (
      <div className="p-3 sm:p-4">
        <h1 className="mb-3 text-lg font-semibold">Files</h1>
        <div className="card p-4 text-sm text-slate-400">
          No project folder set yet. Go to <span className="text-accent">Settings</span> and add an
          absolute path to your project to browse files here.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <h1 className="text-lg font-semibold">Files</h1>

      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-400">
        <button className="btn-ghost !py-1 !px-2" onClick={() => load('')}>
          root
        </button>
        {dir && (
          <>
            <span>/</span>
            <span className="truncate font-mono">{dir}</span>
            <button className="btn-ghost ml-auto !py-1 !px-2" onClick={parentDir}>
              ↑ up
            </button>
          </>
        )}
      </div>

      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}

      <div className="card divide-y divide-line overflow-hidden">
        {items.length === 0 && <p className="p-3 text-sm text-slate-500">Empty folder.</p>}
        {items.map((it) => (
          <button
            key={it.path}
            className="flex min-h-11 w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
            onClick={() => (it.type === 'dir' ? load(it.path) : openFile(it.path))}
          >
            <span>{it.type === 'dir' ? '📁' : '📄'}</span>
            <span className="min-w-0 truncate">{it.name}</span>
          </button>
        ))}
      </div>

      {preview && (
        <div className="card overflow-hidden">
          <div className="flex min-w-0 flex-col gap-2 border-b border-line px-3 py-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
            <span className="min-w-0 truncate font-mono text-xs text-slate-300">{preview.path}</span>
            <button
              className="btn-primary !py-1 !px-2 text-xs min-[380px]:shrink-0"
              onClick={() => onOpenInAsk(preview.path)}
            >
              Open in Ask Code
            </button>
          </div>
          <pre className="max-h-80 overflow-auto">
            <code>{preview.content}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
