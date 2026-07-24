# Pocket Agent

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
