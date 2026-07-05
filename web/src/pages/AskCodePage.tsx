// Ask Code: paste/attach code, pick a mode, get an answer.
// For fix/refactor the reply is diffed against the input so it can be applied.
import { useCallback, useEffect, useState } from 'react';
import { streamChat, RequestError, api } from '../api';
import { useSettings } from '../store';
import type { AppError, AskMode } from '../types';
import { Markdown } from '../components/Markdown';
import { ErrorBanner } from '../components/ErrorBanner';
import { DiffView } from '../components/DiffView';
import { CommandBlock } from '../components/CommandBlock';
import { firstCodeBlock, shellCommands } from '../lib/parse';

const DEFAULT_MODES: AskMode[] = [
  { id: 'explain', label: 'Explain' },
  { id: 'fix', label: 'Fix bug' },
  { id: 'refactor', label: 'Refactor' },
  { id: 'tests', label: 'Generate tests' }
];

export function AskCodePage({ attachFile }: { attachFile?: string | null }) {
  const { settings } = useSettings();
  const [modes, setModes] = useState<AskMode[]>(DEFAULT_MODES);
  const [mode, setMode] = useState<AskMode['id']>('explain');

  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('');
  const [note, setNote] = useState('');
  const [filePath, setFilePath] = useState(''); // set when code was loaded from a project file

  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    api.getModes().then((r) => setModes(r.modes)).catch(() => {});
  }, []);

  // Pull a file from the project folder into the editor.
  const loadFile = useCallback(async (path: string) => {
    const p = path.trim();
    if (!p) return;
    setError(null);
    try {
      const { content } = await api.readFile(p);
      setFilePath(p);
      setCode(content);
    } catch (e: any) {
      setError({ message: e.message, kind: e.kind || 'unknown' });
    }
  }, []);

  // When opened from the Files page, auto-load the chosen file.
  useEffect(() => {
    if (attachFile) loadFile(attachFile);
  }, [attachFile, loadFile]);

  const run = async () => {
    if (!code.trim() || streaming) return;
    setError(null);
    setAnswer('');
    setStreaming(true);

    await streamChat(
      { mode, code, language, note },
      {
        onDelta: (t) => setAnswer((prev) => prev + t),
        onDone: () => setStreaming(false),
        onError: (err: RequestError) => {
          setStreaming(false);
          setError({ message: err.message, kind: err.kind });
        }
      }
    );
  };

  // For fix/refactor, try to extract a full-file code block to diff & apply.
  const proposed = (mode === 'fix' || mode === 'refactor') && !streaming ? firstCodeBlock(answer) : null;
  const commands = answer ? shellCommands(answer) : [];

  return (
    <div className="space-y-4 p-3 sm:p-4">
      <h1 className="text-lg font-semibold">Ask Code</h1>

      {/* Mode picker */}
      <div className="grid grid-cols-2 gap-2 min-[380px]:flex min-[380px]:flex-wrap">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`btn min-w-0 ${mode === m.id ? 'bg-accent text-white' : 'bg-panel border border-line text-slate-300'}`}
          >
            <span className="truncate">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Attach from project (optional) */}
      <div className="card p-3">
        <span className="mb-1 block text-xs text-slate-400">Attach file from project (optional)</span>
        <div className="flex min-w-0 flex-col gap-2 min-[380px]:flex-row">
          <input
            className="input font-mono text-xs"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="src/index.js"
          />
          <button
            className="btn-ghost min-[380px]:shrink-0"
            onClick={() => loadFile(filePath)}
            disabled={!filePath.trim()}
          >
            Load
          </button>
        </div>
        {filePath && (
          <p className="mt-1 text-[11px] text-slate-500">
            Fix/Refactor results can be applied back to this file after you review the diff.
          </p>
        )}
      </div>

      {/* Code + options */}
      <div className="card space-y-2 p-3">
        <div className="flex min-w-0 gap-2">
          <input
            className="input flex-1 text-xs"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="language (e.g. js, python)"
          />
        </div>
        <textarea
          className="input min-h-[42dvh] resize-y font-mono text-xs sm:min-h-[220px]"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste or type your code here…"
        />
        <input
          className="input text-xs"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (e.g. 'crashes on empty input')"
        />
        <button className="btn-primary w-full" onClick={run} disabled={!code.trim() || streaming}>
          {streaming ? 'Thinking…' : `Run: ${modes.find((m) => m.id === mode)?.label}`}
        </button>
        <p className="break-words text-[11px] text-slate-500">Model: {settings?.model || 'not set'}</p>
      </div>

      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}

      {/* Answer */}
      {answer && (
        <div className="card p-3">
          <Markdown text={answer} />
        </div>
      )}

      {/* Suggested terminal commands (never auto-run) */}
      {commands.length > 0 && <CommandBlock commands={commands} />}

      {/* Diff + approval for fix/refactor */}
      {proposed && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-300">Proposed change</h2>
          {!filePath && (
            <p className="text-[11px] text-amber-300/80">
              Load a project file above to enable applying this change to disk.
            </p>
          )}
          <DiffView filePath={filePath} original={code} proposed={proposed.code} />
        </div>
      )}
    </div>
  );
}
