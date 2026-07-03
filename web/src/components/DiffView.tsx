// Diff preview with an approval-based "Apply" button.
// The write only happens when the user taps Apply (safety requirement).
import { useMemo, useState } from 'react';
import { diffLines, countChanges } from '../lib/diff';
import { api } from '../api';
import type { AppError } from '../types';
import { ErrorBanner } from './ErrorBanner';

interface Props {
  filePath: string; // relative path inside projectRoot
  original: string; // current file content
  proposed: string; // AI-suggested new content
  onApplied?: () => void;
}

export function DiffView({ filePath, original, proposed, onApplied }: Props) {
  const rows = useMemo(() => diffLines(original, proposed), [original, proposed]);
  const { added, removed } = useMemo(() => countChanges(rows), [rows]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [error, setError] = useState<AppError | null>(null);

  const apply = async () => {
    setError(null);
    setStatus('saving');
    try {
      await api.writeFile(filePath, proposed);
      setStatus('done');
      onApplied?.();
    } catch (e: any) {
      setStatus('idle');
      setError({ message: e.message, kind: e.kind || 'unknown' });
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs">
        <span className="truncate font-mono text-slate-300">{filePath || '(no file selected)'}</span>
        <span className="shrink-0">
          <span className="text-green-400">+{added}</span> <span className="text-red-400">-{removed}</span>
        </span>
      </div>

      <div className="max-h-72 overflow-auto font-mono text-xs">
        {rows.map((r, i) => (
          <div
            key={i}
            className={
              r.type === 'add'
                ? 'bg-green-500/10 text-green-300'
                : r.type === 'del'
                ? 'bg-red-500/10 text-red-300'
                : 'text-slate-400'
            }
          >
            <span className="inline-block w-5 select-none text-center opacity-60">
              {r.type === 'add' ? '+' : r.type === 'del' ? '-' : ' '}
            </span>
            <span className="whitespace-pre-wrap break-all">{r.text || ' '}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t border-line p-3">
        {error && <ErrorBanner error={error} onClose={() => setError(null)} />}
        <div className="flex items-center gap-2">
          <button
            className="btn-primary flex-1"
            disabled={!filePath || status === 'saving' || status === 'done'}
            onClick={apply}
          >
            {status === 'saving' ? 'Applying…' : status === 'done' ? '✓ Applied' : 'Apply to file'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Review the diff above. Nothing is written until you tap Apply.
        </p>
      </div>
    </div>
  );
}
