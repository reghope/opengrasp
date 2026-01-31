# OpenClaw ("clawdbot/openclaw") — Codebase + Install + Auth + Telegram Setup (Spec)

This spec summarizes how **OpenClaw** is structured, how it installs, how it handles subscriptions/keys, and how Telegram is configured. It is based on the upstream `openclaw/openclaw` repository and its docs.

## 1) Codebase language + runtime

- **Primary runtime:** Node.js (docs require **Node >= 22**).
- **Primary language:** TypeScript (the repo is built with TS tooling and outputs to `dist/` for Node execution).
- **Package format:** ESM (`"type": "module"`), CLI entry `openclaw.mjs`.

Evidence (repo files):
- `package.json` (runtime requirements, scripts, dependencies)
- `README.md` (Node requirement and build flow)

## 2) High-level architecture (practical)

- **Gateway** is the control plane (WebSocket, channels, sessions, tools).
- **Channels** (Telegram, WhatsApp, Slack, etc.) are owned by the gateway and connect inbound messages to agents.
- **CLI** (`openclaw`) is the primary operator surface; onboarding config is done there.

Evidence:
- `README.md`
- `docs/gateway/*`
- `docs/channels/*`

## 3) Installation paths (supported)

### 3.1 Recommended install (installer)
```bash
curl -fsSL https://openclaw.bot/install.sh | bash
```
Windows PowerShell:
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

The installer:
- Installs `openclaw` globally via npm by default
- Runs onboarding unless `--no-onboard` is supplied
- Can switch to a Git checkout (`--install-method git`)

Installer docs: `docs/install/index.md`

### 3.2 Manual global install
```bash
npm install -g openclaw@latest
# or
pnpm add -g openclaw@latest

openclaw onboard --install-daemon
```

### 3.3 From source (contributors)
```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build
pnpm build
openclaw onboard --install-daemon
```

Evidence:
- `docs/install/index.md`
- `README.md`

## 4) Subscriptions + keys (auth model)

OpenClaw supports both **subscription OAuth** and **API key** auth.

### 4.1 Wizard-based auth setup (recommended)
`openclaw onboard` walks through model/auth choices and stores credentials for daemon use. Options include:
- OpenAI (Codex) subscription OAuth
- OpenAI API key
- Anthropic API key (recommended)
- Anthropic setup-token (paste)
- Other providers (MiniMax/Moonshot/etc.)

Auth storage locations:
- OAuth credentials: `~/.openclaw/credentials/oauth.json`
- Auth profiles (OAuth + API keys): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- If using OpenAI API key: wizard writes to `~/.openclaw/.env`

Evidence:
- `docs/start/wizard.md`
- `docs/start/getting-started.md`

## 5) Telegram setup (Bot API)

### 5.1 Bot creation
- Create a bot in Telegram via **@BotFather**.
- Copy the bot token.

### 5.2 Configure token
Token can be provided in **either**:
- Env: `TELEGRAM_BOT_TOKEN=...` (default account only), or
- Config: `channels.telegram.botToken: "..."` (takes precedence)

Minimal config:
```json5
{
  channels: {
    telegram: {
      enabled: true,
      botToken: "123:abc",
      dmPolicy: "pairing"
    }
  }
}
```

### 5.3 Startup behavior
- Telegram starts **only** when `channels.telegram` exists in config.
- `channels.telegram.enabled: false` disables startup.

### 5.4 Access control + pairing
- Default **DM policy** is pairing. Unknown senders get a pairing code.
- Approve with:
  ```bash
  openclaw pairing approve telegram <code>
  ```

### 5.5 Groups + mention gating
- Group behavior is controlled by `channels.telegram.groups`.
- Setting `groups` also creates a **group allowlist**; include `"*"` for all groups.

Example:
```json5
{
  channels: {
    telegram: {
      groups: {
        "*": { requireMention: true },
        "-1001234567890": { requireMention: false }
      }
    }
  }
}
```

### 5.6 Polling vs webhook
- Default is **long-polling** (grammY).
- Webhook is optional via:
  - `channels.telegram.webhookUrl`
  - `channels.telegram.webhookSecret`
  - `channels.telegram.webhookPath`

Evidence:
- `docs/channels/telegram.md`
- `docs/gateway/configuration.md`

## 6) Notable runtime details

- Telegram uses grammY runner with per-chat sequencing (default long-polling).
- Outbound Telegram text uses HTML parse mode and retries as plain text on parse errors.
- Bot commands can be registered on startup via `channels.telegram.customCommands`.

Evidence:
- `docs/channels/telegram.md`

## 7) Quick reference (files used)

- `README.md`
- `package.json`
- `docs/install/index.md`
- `docs/start/wizard.md`
- `docs/start/getting-started.md`
- `docs/channels/telegram.md`
- `docs/gateway/configuration.md`
