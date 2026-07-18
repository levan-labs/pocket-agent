# Pocket Agent

<<<<<<< HEAD
A lightweight **local** web UI for an AI coding assistant, built for **Android + Termux + Acode**.
Think of it as a simpler, safer, mobile-first Cursor/Cline that runs entirely on your phone and
talks to any **OpenAI-compatible** API (OpenRouter, OpenAI, LM Studio, etc.).

- Runs on `localhost` — open it in your mobile browser or the Acode preview.
- Streaming chat, "Ask Code" modes (explain / fix / refactor / tests).
- Diff preview + **approval-based** file writes. Terminal commands are **never** run automatically.
- No heavy native dependencies — plain JSON storage, native `fetch`, one server process.

---

## Features

| Feature | Notes |
| --- | --- |
| Local web app | Everything runs on your device at `http://localhost:5174`. |
| Provider settings | OpenRouter, OpenAI, or any custom OpenAI-compatible base URL. |
| API key storage | Saved locally in `server/data/settings.json` (file perms `0600`, gitignored). |
| Model selector | Type a model id or tap **Load** to fetch the provider's model list. |
| Chat | Streaming responses, stop button, code blocks with copy. |
| Ask Code | Paste code or attach a project file, then explain / fix / refactor / generate tests. |
| Diff preview | Fix/Refactor results are diffed against the original before you **Apply**. |
| File context | Browse your project folder, preview files, send them to Ask Code. |
| Safe by default | File writes need explicit approval; commands are display-only. |
| Error handling | Clear messages for auth / rate-limit / network / config problems. |

---

## Requirements

- [Termux](https://termux.dev/) (from F-Droid — the Play Store build is outdated).
- Node.js 18 or newer.

```bash
# Inside Termux
pkg update && pkg upgrade
pkg install nodejs git
node -v   # should print v18 or newer
```

---

## Install

```bash
git clone <your-repo-url> pocket-agent
cd pocket-agent

# Installs root, server and web dependencies in one go.
npm run install:all
```

> First install downloads React/Vite build tooling. It only happens once; running
> the app afterwards is light.

---

## Run

### Option A — Production mode (recommended on a phone)

Build the frontend once, then start a single server that serves both the UI and the API.

```bash
npm run build      # builds web/dist
npm start          # serves everything on http://localhost:5174
```

Open **http://localhost:5174** in your browser or Acode preview.

### Option B — Development mode (live reload)

Runs the backend (5174) and the Vite dev server (5173) together.

```bash
npm run dev
```

Open **http://localhost:5173**. API calls are proxied to the backend automatically.

---

## First-time setup (in the app)

1. Open the **Settings** tab.
2. Choose a **Provider** (e.g. OpenRouter).
3. Paste your **API key**.
   - OpenRouter keys: https://openrouter.ai/keys
   - OpenAI keys: https://platform.openai.com/api-keys
4. Set a **Model** (default `openai/gpt-4o-mini`) — tap **Load** to browse available models.
5. *(Optional)* Set a **Project folder** — an absolute path such as:
   ```
   /data/data/com.termux/files/home/myproject
   ```
   This lets you browse files and apply diffs. Leave it empty to disable file access.
6. Tap **Save settings**.

Now use **Chat** for questions, or **Ask Code** to explain/fix/refactor code and apply changes.

---

## Using it with Acode

Acode can open a local URL in its built-in browser/preview. Start Pocket Agent in Termux
(`npm start`), then point Acode's preview at `http://localhost:5174`. Keep Termux running in the
background (consider `termux-wake-lock` so Android doesn't kill the process).

---

## Safety model (MVP)

Pocket Agent is intentionally **not** a fully autonomous agent yet:

- **Files are only written when you tap "Apply"** on a diff. The path is confined to your
  configured project folder; paths that try to escape it (`../`) are rejected.
- **Terminal commands are never executed.** When the AI suggests commands they are shown in a
  warning box with a copy button — you run them yourself in Termux after reviewing.
- The API key never leaves your device except in requests to the provider you configured.

---

## Project structure

```
pocket-agent/
├── package.json            # root scripts: install:all / dev / build / start
├── server/                 # Node + Express backend (ES modules)
│   └── src/
│       ├── index.js        # app entry; serves API + built frontend
│       ├── config.js       # port, paths, provider presets, defaults
│       ├── storage.js      # JSON settings/history (no database)
│       ├── aiClient.js     # OpenAI-compatible calls + streaming + error mapping
│       ├── prompts.js      # explain / fix / refactor / tests templates
│       └── routes/         # settings, models, chat (SSE), files
└── web/                    # Vite + React + TypeScript + Tailwind
    └── src/
        ├── App.tsx         # tab shell (chat / ask / files / settings)
        ├── api.ts          # fetch wrapper + SSE stream reader
        ├── store.tsx       # settings context
        ├── lib/            # diff.ts (LCS diff), parse.ts (code-block extraction)
        ├── components/     # Nav, Markdown, DiffView, CommandBlock, ErrorBanner
        └── pages/          # ChatPage, AskCodePage, FilesPage, SettingsPage
```

---

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5174` | Backend port. Change if it's taken: `PORT=8080 npm start`. |
| `OPENROUTER_API_KEY` | – | Used as the API key when none is saved in the UI. Never written to disk. |
| `OPENAI_API_KEY` | – | Same as above; used if `OPENROUTER_API_KEY` is not set. |

A key saved through the **Settings** page always takes priority over the environment
variables. The env vars are a convenience for developers, e.g.:

```bash
export OPENROUTER_API_KEY="sk-or-..."
npm run dev
```

Local data lives in `server/data/` and is gitignored:

- `settings.json` — provider, base URL, **API key**, model, project folder.
- `history.json` — reserved for saved conversations.

---

## Troubleshooting

- **"Cannot reach the local server"** — make sure `npm start` (or `npm run dev`) is running.
- **401 / "Invalid API key"** — re-paste the key in Settings; check it matches the provider.
- **429 / rate limit** — you hit a quota; wait or check billing on the provider dashboard.
- **Port already in use** — start with a different port: `PORT=8080 npm start`.
- **Termux killed the process** — run `termux-wake-lock` before starting.

---

## Roadmap (post-MVP ideas)

- Persist and reload chat history.
- Multi-file context and repo-aware edits.
- Deeper Acode plugin integration.
- Optional, opt-in command execution with per-command approval.

---

## License

MIT. Contributions welcome — the code is kept small and commented so beginners can extend it.
=======
**Your code stays on your phone. You choose the AI model.**

Pocket Agent is a mobile-first AI coding workspace for Android developers
using [Termux](https://termux.dev) and [Acode](https://acode.app). The app,
your files, and the agent runtime run locally on your device; the AI model
behind the agent is pluggable (OpenCode Zen, OpenRouter, OpenAI-compatible
APIs, and more later).

> **Not affiliated with OpenCode.** Pocket Agent is an independent
> open-source project. It can use a local [OpenCode](https://opencode.ai)
> server as its first backend engine, through a documented adapter boundary,
> but it is not an official OpenCode product.

## Why

Most AI coding agent interfaces are desktop-first. On Android they break in
familiar ways: the virtual keyboard covers the composer, sidebars eat the
screen, touch targets are tiny, and permission dialogs are awkward. Pocket
Agent is designed for the phone from the beginning:

- single-column, portrait-first layout with bottom navigation
- a keyboard-safe composer — typed text always stays visible
- permission approvals that show the exact command or file path first
- clear, step-by-step flow: plan, approve, execute, see results

Core principle: **the agent should adapt to the user, not the user to the
agent.**

## Architecture at a glance

```
Pocket Agent Mobile UI
        ↓
AgentProvider interface        (packages/agent-core)
        ↓
OpenCode adapter               (packages/opencode-adapter)
        ↓
OpenCode local server          (runs in Termux)
        ↓
Zen / OpenRouter / other model providers
```

The UI only ever talks to the provider-neutral `AgentProvider` interface.
See [docs/architecture.md](docs/architecture.md) for details, and
[docs/termux.md](docs/termux.md) for running on Android.

## Repository layout

| Path | Purpose |
| --- | --- |
| `apps/web` | React + Vite mobile-first web app |
| `packages/shared-types` | Provider-neutral domain and event types |
| `packages/agent-core` | `AgentProvider` interface + provider registry |
| `packages/mock-provider` | In-memory provider for UI development |
| `packages/opencode-adapter` | OpenCode integration, isolated behind the interface |
| `packages/ui` | Small mobile UI primitives |
| `docs/` | Architecture and Termux documentation |

## Getting started

Requires Node.js 20.19+ (22 LTS recommended) and npm.

```bash
npm install
npm run dev        # dev server on http://127.0.0.1:5173
npm run typecheck  # typecheck all workspaces
npm run build      # production build of apps/web
```

The dev server binds to `127.0.0.1` only. Pocket Agent never exposes itself
to your LAN by default.

## Status

Early development — Milestone 1 (mobile MVP foundation) is in progress.
See [ideas.md](ideas.md) for future directions.

## Security defaults

- Backend connections default to loopback (`http://127.0.0.1:4096`).
- No API keys are hardcoded, stored in the repository, or logged.
- Destructive actions always require explicit approval; there is no
  unrestricted auto-approve mode.

## License

[MIT](LICENSE)
>>>>>>> main
