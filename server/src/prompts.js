// Prompt templates for the "Ask Code" modes.
// Kept on the backend so the behaviour is consistent and easy to tweak later.

const SYSTEM = `You are Pocket Agent, a concise coding assistant running on a phone.
Rules:
- Be direct. Prefer short explanations and correct code.
- When you output code, use fenced code blocks with a language tag.
- Never invent file contents you were not given.
- If you suggest terminal commands, put them in a \`\`\`bash block and warn the user to review before running.`;

// Each mode returns { system, user } to send as chat messages.
export const MODES = {
  explain: {
    label: 'Explain',
    build: ({ code, language, note }) => ({
      system: SYSTEM,
      user: `Explain what the following ${language || ''} code does. Cover its purpose, key logic, and any bugs or risks you notice. Be brief.
${note ? `\nExtra context: ${note}\n` : ''}
\`\`\`${language || ''}
${code}
\`\`\``
    })
  },

  fix: {
    label: 'Fix bug',
    build: ({ code, language, note }) => ({
      system: SYSTEM,
      user: `Find and fix bugs in the following ${language || ''} code.
First give a one-line summary of the bug. Then return the FULL corrected file in a single code block so it can be diffed and applied.
${note ? `\nReported problem: ${note}\n` : ''}
\`\`\`${language || ''}
${code}
\`\`\``
    })
  },

  refactor: {
    label: 'Refactor',
    build: ({ code, language, note }) => ({
      system: SYSTEM,
      user: `Refactor the following ${language || ''} code for readability and simplicity without changing behaviour.
Briefly list the improvements, then return the FULL refactored file in a single code block.
${note ? `\nFocus on: ${note}\n` : ''}
\`\`\`${language || ''}
${code}
\`\`\``
    })
  },

  tests: {
    label: 'Generate tests',
    build: ({ code, language, note }) => ({
      system: SYSTEM,
      user: `Write unit tests for the following ${language || ''} code.
Pick the idiomatic test framework for the language. Cover the main paths and edge cases. Return only the test file in a single code block.
${note ? `\nNotes: ${note}\n` : ''}
\`\`\`${language || ''}
${code}
\`\`\``
    })
  }
};

export function buildModeMessages(mode, payload) {
  const m = MODES[mode];
  if (!m) throw new Error(`Unknown mode: ${mode}`);
  const { system, user } = m.build(payload);
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ];
}

export function listModes() {
  return Object.entries(MODES).map(([id, m]) => ({ id, label: m.label }));
}
