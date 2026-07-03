// Helpers to pull fenced code blocks out of an AI markdown reply.

export interface CodeBlock {
  lang: string;
  code: string;
}

// Match ```lang\n ... ``` blocks. Non-greedy so multiple blocks are separated.
const FENCE = /```([\w+-]*)\n([\s\S]*?)```/g;

export function extractCodeBlocks(text: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let match: RegExpExecArray | null;
  FENCE.lastIndex = 0;
  while ((match = FENCE.exec(text)) !== null) {
    blocks.push({ lang: (match[1] || '').toLowerCase(), code: match[2].replace(/\n$/, '') });
  }
  return blocks;
}

// The first non-shell code block is usually the "full corrected file" for fix/refactor.
export function firstCodeBlock(text: string): CodeBlock | null {
  const blocks = extractCodeBlocks(text).filter((b) => !isShell(b.lang));
  return blocks[0] ?? null;
}

// Shell/terminal blocks are treated as command *suggestions* (never auto-run).
export function shellCommands(text: string): string[] {
  return extractCodeBlocks(text)
    .filter((b) => isShell(b.lang))
    .map((b) => b.code.trim())
    .filter(Boolean);
}

function isShell(lang: string): boolean {
  return ['bash', 'sh', 'shell', 'zsh', 'console'].includes(lang);
}
