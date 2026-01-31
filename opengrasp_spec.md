# OpenGrasp — Product Spec (OpenClaw‑style)

This spec defines OpenGrasp as a local‑first personal AI assistant that mirrors OpenClaw’s architecture and flows, with a built‑in local site that lets you chat and visually inspect local dev output (e.g., a TypeScript project) and switch between views.

## 1) Goals and positioning

- **OpenClaw‑like**: local Gateway control plane, multi‑channel interfaces, CLI‑first onboarding.
- **Local site**: a web UI served by the Gateway that provides:
  - **Chat view** (assistant + tools)
  - **Dev view** (live preview of a local dev server or build output)
  - **Quick switch** between Chat and Dev (tab/side‑by‑side)
- **Login required** for the local site (token or password-backed session).
- **Future tunneling**: designed to be exposed later via Cloudflare Tunnel.
- **Default auth order**: `Anthropic` → `Codex (OpenAI)` → `Kimi` (alphabetical by provider label).
- **AI login**: explicit login step for model providers (OAuth or API key) with stored credentials.

## 2) Runtime + language

- **Runtime**: Node.js (>=22 recommended).
- **Language**: TypeScript (ESM), compiled to `dist/` for production.
- **CLI entry**: `opengrasp` (similar to `openclaw`).

## 3) Architecture (mirrors OpenClaw)

```
Local Channels / Local Site / CLI / Tools
            │
            ▼
        Gateway (control plane)
            │
      Agent runtime (RPC)
            │
       Workspace + Sessions
```

Key points:
- Gateway hosts the local UI and manages sessions, tools, channels.
- Agents are isolated by workspace/session.
- Tools include filesystem, shell, browser, and dev‑server bridge.

## 4) Installation (Bun)

### 4.1 Recommended installer
```bash
curl -fsSL https://opengrasp.ai/install.sh | bash
```

### 4.2 Manual install
```bash
bun add -g opengrasp@latest

opengrasp onboard --install-daemon
```

### 4.3 From source
```bash
git clone https://github.com/<your-org>/opengrasp.git
cd opengrasp
bun install
bun run build
opengrasp onboard --install-daemon
```

## 5) Onboarding + auth (default order)

The onboarding wizard configures the Gateway, workspace, and auth.

**Default auth choices (alphabetical):**
1) **Anthropic** — login or API key
2) **Codex (OpenAI)** — login or API key
3) **Kimi** — login or API key

Wizard behavior:
- Detects existing auth in environment or local credential files.
- Saves OAuth credentials to `~/.opengrasp/credentials/oauth.json`.
- Saves API keys into per‑agent profiles in `~/.opengrasp/agents/<agentId>/agent/auth-profiles.json`.
- For daemon use, also writes `~/.opengrasp/.env` when keys are entered in the wizard.

### 5.1 AI login (provider auth)

- **OAuth flows** for subscription logins (when supported).
- **API key entry** for providers that require keys.
- **Provider selection** is explicit and ordered (Anthropic → Codex → Kimi).
- **Session check** runs after login to validate access to the default model.

## 6) Local site (Chat + Dev views)

The Gateway serves a local site (default `http://127.0.0.1:18789/`) with:

- **Chat view**
  - Streaming replies
  - Tool calls with status and logs
  - Session history

- **Dev view**
  - Live preview of local dev servers (e.g., React/Vite/Next)
  - Build output or static preview fallback
  - Auto‑detects ports and surfaces the active dev server

- **View switching**
  - Toggle (Chat ↔ Dev)
  - Optional split‑view
  - Persisted per session

### 6.1 Login + session auth (local site)

- Default auth mode: **token** (generated on onboarding).
- Login flow: paste token once; store session in browser (secure, httpOnly cookie).
- Optional password mode: if enabled, token still exists for CLI/automation.
- When tunneling via Cloudflare in the future, keep gateway auth enabled and add
  Cloudflare Access on top (two-layer auth).

## 7) Dev server detection (spec)

- Supports direct config: `dev.preview.url` or `dev.preview.port`.
- Auto‑detect if omitted:
  - Watch for common dev ports (3000, 5173, 8080, 4173, 9000).
  - Read Vite/Next/React logs for “Local:” URLs.
- If multiple servers detected, show a picker.

## 8) Configuration layout (example)

```json5
{
  gateway: { port: 18789, auth: { mode: "token", token: "..." } },
  web: { enabled: true },

  auth: {
    providers: [
      "anthropic",
      "openai-codex",
      "kimi"
    ]
  },

  dev: {
    preview: {
      mode: "auto",      // auto | fixed
      url: null,          // if fixed
      ports: [3000, 5173, 8080, 4173, 9000]
    }
  }
}
```

## 9) Memory (must match OpenClaw exactly)

OpenGrasp uses **OpenClaw’s memory model verbatim**:

- **Source of truth is Markdown on disk**, not in‑RAM memory.
- Two layers:
  - `memory/YYYY-MM-DD.md` (daily log, append‑only; read today + yesterday)
  - `MEMORY.md` (curated long‑term memory; **only loaded in main/private session**)
- Memory search is provided by the active memory plugin (default `memory-core`).
- A **pre‑compaction memory flush** runs once per compaction cycle to prompt the
  model to write durable memory before context is compacted.

Required config shape (same as OpenClaw):

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
        }
      }
    }
  }
}
```

Vector memory search rules:
- Index `MEMORY.md` + `memory/*.md` (plus optional extra paths).
- Default provider auto‑selects in order: local → OpenAI → Gemini (if keys exist).
- Codex OAuth does **not** satisfy embeddings (API keys required for embeddings).

## 10) Core AI pipeline (OpenClaw parity)

OpenGrasp mirrors OpenClaw’s **agent runtime + model selection + memory usage**.
This is the “AI in it” core path from user input to response.

### 10.1 Agent runtime + bootstrap

- Uses a **single embedded agent runtime** (OpenClaw derives from pi‑mono).
- The agent operates inside a single **workspace directory** (`agents.defaults.workspace`).
- On first turn of a session, the gateway **injects bootstrap files** into context:
  - `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`
- Missing files inject a marker; large files are trimmed.
- Session transcripts are stored as JSONL per agent/session.

### 10.2 Model selection + auth (AI login)

Model selection follows OpenClaw order:
1) Primary model (`agents.defaults.model.primary` or `agents.defaults.model`)
2) Fallback list (`agents.defaults.model.fallbacks`, in order)
3) Within a provider, **auth profile rotation** happens before model fallback.

Auth profile behavior (same rules):
- Secrets live in `~/.opengrasp/agents/<agentId>/agent/auth-profiles.json`.
- OAuth imports from `~/.opengrasp/credentials/oauth.json`.
- Rotation order: explicit `auth.order` → configured `auth.profiles` → stored profiles.
- Session **pins** a chosen profile until reset/compaction unless user‑overridden.
- Failures trigger cooldowns; billing failures disable profiles with longer backoff.

### 10.3 Memory usage in the core loop

- At session start, the agent **reads**:
  - Today + yesterday `memory/YYYY-MM-DD.md`
  - `MEMORY.md` (main/private sessions only)
- Before auto‑compaction, a **silent memory flush** prompts the model to write
  durable notes to disk (same prompts + thresholds as OpenClaw).
- Retrieval uses `memory_search` (semantic snippets) and `memory_get` (file reads).

### 10.4 Tools + streaming

- Tool calls are streamed as cards; tool output can be expanded/collapsed.
- Streaming can be block‑based or partial, controlled by config.
- Queueing mode supports **steer** and **follow‑up** behaviors (same semantics).

## 11) TUI (terminal UI)

OpenGrasp ships a TUI that mirrors OpenClaw’s layout and behavior:

- **Single-screen chat UI** with streaming output, tool cards, and system notices.
- **Header** shows connection URL, current agent, and session.
- **Status line** shows run state (connecting/running/streaming/idle/error).
- **Footer** shows connection + agent + session + model + thinking/verbose/reasoning + token counts + deliver state.
- **Input editor** with autocomplete.
- **Pickers/overlays**: model picker, agent picker, session picker, settings.
- **Delivery** is off by default; enable with `/deliver on` or `--deliver`.

### 10.1 TUI shortcuts (same defaults as OpenClaw)

- Enter: send message
- Esc: abort active run
- Ctrl+C: clear input (press twice to exit)
- Ctrl+D: exit
- Ctrl+L: model picker
- Ctrl+G: agent picker
- Ctrl+P: session picker
- Ctrl+O: toggle tool output expansion
- Ctrl+T: toggle thinking visibility (reloads history)

### 10.2 Core slash commands (subset)

- `/help`, `/status`, `/agent <id>`, `/agents`, `/session <key>`, `/sessions`, `/model <provider/model>`
- `/think <off|minimal|low|medium|high>`, `/verbose <on|full|off>`, `/reasoning <on|off|stream>`
- `/usage <off|tokens|full>`, `/deliver <on|off>`, `/new` or `/reset`, `/abort`, `/settings`, `/exit`

## 12) CLI (minimal commands)

```bash
opengrasp onboard --install-daemon
opengrasp gateway --port 18789 --verbose
opengrasp dashboard
opengrasp agent --message "Ship checklist"
```

## 13) Non‑functional requirements

- **Local‑first security**: gateway auth token enabled by default.
- **DM pairing** if channels are enabled (optional in OpenGrasp v1).
- **Performance**: stream responses with partial updates in UI.
- **Cross‑platform**: macOS, Linux, Windows via WSL2.
