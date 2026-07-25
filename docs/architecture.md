# Pocket Agent Architecture

Status: Milestone 1 foundation and Milestone 2 OpenCode chat are complete.
Interactive Files/Terminal and a model picker remain planned. Sections
marked *(planned)* describe design intent that is not implemented yet.

## Layers

```
Pocket Agent Mobile UI          apps/web
        ↓
AgentProvider interface         packages/agent-core
        ↓
OpenCode adapter                packages/opencode-adapter
        ↓
OpenCode local server           external process (Termux)
        ↓
Zen / OpenRouter / other model providers
```

Future shape (post–Milestone 2):

```
Pocket Agent UI
        ↓
AgentProvider interface
        ├── MockProvider                 (offline demo — working)
        ├── OpenCodeProvider             (chat, sessions, permissions — working)
        ├── custom Pocket Agent engine   (planned)
        ├── remote provider              (planned)
        └── optional local/offline model (planned)
```

## The provider boundary

`packages/agent-core` defines the `AgentProvider` interface — the only
surface the UI is allowed to use. Rules:

1. **The frontend never contains backend-specific API details.** OpenCode
   request/response shapes, endpoints, and event formats live exclusively in
   `packages/opencode-adapter`.
2. **All conversation rendering is event-driven.** `sendMessage()` returns an
   `AsyncIterable<AgentEvent>`; the UI renders message deltas, tool calls,
   and permission requests purely from that stream (event types are defined
   in `packages/shared-types`).
3. **Capabilities are explicit.** `getCapabilities()` returns flags
   (`streaming`, `sessions`, `permissions`, `files`, `terminal`). The UI must
   disable or hide any action whose flag is false. Unfinished functionality
   is never presented as working.
4. **Providers are created through the registry.** `ProviderRegistry` maps
   provider ids to factories, so the UI selects backends by id without
   importing adapter packages directly.

## Packages

- **`@pocket-agent/shared-types`** — provider-neutral domain types:
  sessions, messages, tool calls, permission requests, file entries, and the
  `AgentEvent` union. Depends on nothing.
- **`@pocket-agent/agent-core`** — the `AgentProvider` interface and
  `ProviderRegistry`. Depends only on shared-types.
- **`@pocket-agent/mock-provider`** — in-memory provider used to build and
  demo the UI without any backend. Simulates streaming replies and an
  approval-based permission flow *(Milestone 1 Step 4)*.
- **`@pocket-agent/opencode-adapter`** — translates between `AgentProvider`
  and a local OpenCode server. Typed HTTP client, session list/create,
  SSE → `AgentEvent` mapping, `prompt_async` chat, and permission
  approve/deny *(Milestone 2)*. Files/terminal capability still off.
- **`@pocket-agent/ui`** — small mobile-first primitives (Button, Sheet,
  Icon) *(Milestone 1 Step 2)*.
- **`@pocket-agent/web`** — the app. React Context + hooks; tab navigation
  (no router); connection sheet; keyboard-safe chat *(Milestone 1)*.

## Mobile-first UX decisions

- Single-column layout; bottom navigation (Chat, Files, Terminal, Settings);
  no permanent sidebar on phones.
- The keyboard-safe composer is the highest-priority UX feature: the layout
  uses `100dvh`, tracks `window.visualViewport` resize/scroll into CSS
  variables (`--viewport-height`, `--viewport-offset-top`,
  `--keyboard-height`), respects `env(safe-area-inset-bottom)`, and keeps the
  composer inside the flex layout rather than relying on `position: fixed`.
- Permission requests appear near the bottom of the screen (thumb reach),
  always showing the exact action, command, and file path before approval,
  with "Approve once" and "Deny" actions. No unrestricted auto-approval.
- Target test widths: 360px, 393px, 412px. Target browsers: Chrome and Brave
  on Android.

## Security model

- All backend defaults are loopback-only (`http://127.0.0.1:4096`); the app
  never binds or connects to `0.0.0.0`/LAN addresses by default. Enabling
  LAN access in the future will require an explicit opt-in with a security
  warning.
- Secrets (provider API keys) are held in memory only, never written to the
  repository, never logged, and not copied into UI state unnecessarily.
- File deletion and destructive commands always require explicit user
  approval.
