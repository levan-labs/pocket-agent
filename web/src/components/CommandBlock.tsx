// Displays suggested terminal commands. In the MVP these are NEVER auto-run.
// The user copies them and runs them manually in Termux after reviewing.
import { useState } from 'react';

export function CommandBlock({ commands }: { commands: string[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  if (commands.length === 0) return null;

  const copy = async (cmd: string, i: number) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(i);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* ignore clipboard errors on http origins */
    }
  };

  return (
    <div className="card border-amber-500/40 bg-amber-500/5 p-3">
      <p className="mb-2 text-xs font-medium text-amber-300">
        Suggested commands — review before running in Termux. They are not executed automatically.
      </p>
      <div className="space-y-2">
        {commands.map((cmd, i) => (
          <div key={i} className="flex items-center gap-2">
            <pre className="flex-1 !m-0 !py-2">
              <code>{cmd}</code>
            </pre>
            <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => copy(cmd, i)}>
              {copied === i ? 'Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
