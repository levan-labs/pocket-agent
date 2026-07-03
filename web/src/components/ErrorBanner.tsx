// Friendly error banner. Turns backend error "kind" into a helpful hint.
import type { AppError } from '../types';

const HINTS: Record<string, string> = {
  auth: 'Open Settings and paste a valid API key.',
  rate_limit: 'You hit a rate/quota limit. Wait a bit or check your provider billing.',
  network: 'Check your internet connection and that the local server is running.',
  config: 'Finish setup in Settings (provider, key and model).',
  bad_request: 'The request was rejected. Try a different model or shorter input.',
  server: 'The provider had a temporary error. Try again shortly.'
};

export function ErrorBanner({ error, onClose }: { error: AppError; onClose?: () => void }) {
  return (
    <div className="card border-red-500/40 bg-red-500/10 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-red-300">{error.message}</p>
          {HINTS[error.kind] && <p className="mt-1 text-red-200/70">{HINTS[error.kind]}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="text-red-300/70 hover:text-red-200" aria-label="Dismiss">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
