# Running Pocket Agent in Termux

Status: Milestone 1 foundation complete. Use the Mock provider for chat demos
today. Connecting a real OpenCode server for chat is Milestone 2.

## Prerequisites

- Android device with [Termux](https://termux.dev) installed (F-Droid build
  recommended).
- Chrome or Brave on the same device.

## 1. Install Node.js in Termux

```bash
pkg update
pkg install nodejs-lts git
node --version   # should be 20.19+ (22 LTS recommended)
```

## 2. Get the code

```bash
git clone <repository-url> ~/pocket-agent
cd ~/pocket-agent
npm install
```

## 3. Run the dev server

```bash
npm run dev
```

Vite starts on `http://127.0.0.1:5173`, bound to loopback only. Open that
URL in Chrome or Brave on the same device. Nothing is exposed to your LAN.

Tip: use Termux's split-screen or floating window alongside the browser, or
just switch apps — the dev server keeps running in the background (consider
`termux-wake-lock` to prevent Android from killing it).

## 4. Optional: OpenCode backend (Milestone 2)

Pocket Agent's first real backend is a local OpenCode server, expected at
`http://127.0.0.1:4096`. Full setup instructions will be added when the
OpenCode adapter is functional. Until then, the built-in mock provider is
the way to explore the UI.

## Troubleshooting

- **`npm install` is slow or killed** — low-memory devices may need
  `npm install --no-audit --no-fund`; close other apps.
- **Port already in use** — another process holds 5173; stop it or edit
  `apps/web/vite.config.ts`.
- **Dev server dies when Termux is backgrounded** — acquire a wake lock with
  `termux-wake-lock` and disable battery optimization for Termux.
