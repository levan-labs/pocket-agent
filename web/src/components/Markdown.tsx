// Ultra-light markdown renderer: handles fenced code blocks (with a copy button)
// and plain paragraphs. We avoid a markdown library to keep the bundle small.
import { useState } from 'react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost !py-1 !px-2 text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* clipboard may be blocked on http; ignore */
        }
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function Markdown({ text }: { text: string }) {
  // Split into alternating [text, code, text, code, ...] segments.
  const parts = text.split(/(```[\w+-]*\n[\s\S]*?```)/g);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, i) => {
        const fence = part.match(/^```([\w+-]*)\n([\s\S]*?)```$/);
        if (fence) {
          const code = fence[2].replace(/\n$/, '');
          return (
            <div key={i} className="relative">
              <div className="absolute right-2 top-2">
                <CopyButton text={code} />
              </div>
              <pre>
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        if (!part.trim()) return null;
        // Render plain text, preserving line breaks.
        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {part.trim()}
          </p>
        );
      })}
    </div>
  );
}
