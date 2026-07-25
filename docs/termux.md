# Running Pocket Agent in Termux

Status: Milestone 2 chat path works against a local OpenCode server.
Use Mock for offline demos, or OpenCode when `opencode serve` is running.

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

## 4. Optional: OpenCode backend

1. Install OpenCode (same machine / Termux):

```bash
npm install -g opencode-ai
```

2. Start both processes with one command (from the repo root):

```bash
npm run dev:opencode
```

That runs `opencode serve` on `:4096` (CORS allowed for the web app) and
Vite on `:5173`. Ctrl+C stops both.

To run them separately instead:

```bash
opencode serve --hostname 127.0.0.1 --port 4096 --cors http://127.0.0.1:5173
npm run dev
```

3. In Pocket Agent: **Settings → Connect… → OpenCode (local server)**.

4. Chat as usual. Permission prompts appear as Approve once / Deny.

Loopback only by default — nothing is exposed to your LAN.

## Troubleshooting

- **`npm install` is slow or killed** — low-memory devices may need
  `npm install --no-audit --no-fund`; close other apps.
- **Port already in use** — another process holds 5173; stop it or edit
  `apps/web/vite.config.ts`.
- **Dev server dies when Termux is backgrounded** — acquire a wake lock with
  `termux-wake-lock` and disable battery optimization for Termux.
