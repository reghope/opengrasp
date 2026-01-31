#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import readline from "node:readline/promises";
import JSON5 from "json5";
import { GatewayConfigSchema, type GatewayConfig } from "@opengrasp/shared";
import crypto from "node:crypto";
import { startGateway } from "@opengrasp/gateway";
import { startTui, runOnboardingTui } from "@opengrasp/tui";

const program = new Command();

program
  .name("opengrasp")
  .description("OpenGrasp CLI")
  .version("0.1.0");

program
  .command("onboard")
  .option("--install-daemon", "stub flag; no-op")
  .option("--non-interactive", "skip the TUI wizard")
  .description("Initialize config + workspace")
  .action(async (opts) => {
    const configPath = path.join(os.homedir(), ".opengrasp", "opengrasp.json");
    const defaults = GatewayConfigSchema.parse({});
    let workspace = path.join(os.homedir(), ".opengrasp", "workspace");
    let providers = defaults.auth.providers;
    let authEntries: Array<{
      provider: string;
      type: "api_key" | "oauth";
      key?: string;
      access?: string;
      refresh?: string;
      email?: string;
    }> = [];
    let gatewayOverrides: { port?: number; bind?: string; authMode?: "token" | "password" | "none"; passwordHash?: string } =
      {};

    const existing = await readConfigIfExists(configPath);

    if (!opts.nonInteractive && process.stdout.isTTY) {
      const defaultsForOnboard = {
        workspace: existing?.agents?.defaults?.workspace ?? workspace,
        providers: existing?.auth?.providers ?? providers,
        gateway: existing
          ? {
              port: existing.gateway?.port,
              bind: existing.gateway?.bind,
              authMode: existing.gateway?.auth?.mode
            }
          : undefined,
        configExists: Boolean(existing)
      };

      const result = shouldUsePlainOnboarding()
        ? await runOnboardingPlain(defaultsForOnboard)
        : await runOnboardingTui(defaultsForOnboard);
      if (result.action === "keep") {
        console.log("Keeping existing config.");
        return;
      }
      workspace = expandHome(result.workspace);
      providers = result.providers;
      authEntries = result.authEntries;
      gatewayOverrides = {
        port: result.gateway.port,
        bind: result.gateway.bind,
        authMode: result.gateway.authMode,
        passwordHash:
          result.gateway.authMode === "password"
            ? await hashPasswordPrompt()
            : undefined
      };
    }

    const config: GatewayConfig = {
      ...defaults,
      auth: { providers },
      gateway: {
        ...defaults.gateway,
        port: gatewayOverrides.port ?? defaults.gateway.port,
        bind: gatewayOverrides.bind ?? defaults.gateway.bind,
        auth: {
          mode: gatewayOverrides.authMode ?? defaults.gateway.auth.mode,
          token: defaults.gateway.auth.token,
          passwordHash: gatewayOverrides.passwordHash ?? defaults.gateway.auth.passwordHash
        }
      },
      agents: { ...defaults.agents, defaults: { ...defaults.agents.defaults, workspace } }
    };
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON5.stringify(config, null, 2), "utf-8");
    await fs.mkdir(workspace, { recursive: true });
    await writeBootstrapFiles(workspace);
    await writeAuthEntries(authEntries, "main");
    console.log(`Config written to ${configPath}`);
    console.log(`Workspace initialized at ${workspace}`);
    if (config.gateway.auth.mode === "token") {
      console.log(`Gateway token: ${config.gateway.auth.token}`);
    }
    console.log(`Dashboard: http://${config.gateway.bind}:${config.gateway.port}`);
  });

program
  .command("login")
  .requiredOption("--provider <provider>", "Provider id (anthropic, openai-codex, kimi, etc.)")
  .option("--api-key <key>", "API key to store")
  .option("--access <token>", "OAuth access token")
  .option("--refresh <token>", "OAuth refresh token")
  .option("--email <email>", "Email for OAuth profile id")
  .option("--agent <id>", "Agent id", "main")
  .description("Store AI login credentials for a provider")
  .action(async (opts) => {
    const agentId = String(opts.agent ?? "main");
    const authDir = path.join(os.homedir(), ".opengrasp", "agents", agentId, "agent");
    const authPath = path.join(authDir, "auth-profiles.json");
    const profileId = opts.email ? `${opts.provider}:${opts.email}` : `${opts.provider}:default`;
    const profile =
      opts.apiKey
        ? { type: "api_key", provider: opts.provider, key: opts.apiKey }
        : {
            type: "oauth",
            provider: opts.provider,
            access: opts.access ?? "",
            refresh: opts.refresh ?? "",
            expires: Date.now() + 3600 * 1000,
            email: opts.email ?? undefined
          };
    const payload = await readJson(authPath);
    payload.profiles = payload.profiles ?? {};
    payload.profiles[profileId] = profile;
    await fs.mkdir(authDir, { recursive: true });
    await fs.writeFile(authPath, JSON5.stringify(payload, null, 2), "utf-8");
    console.log(`Saved ${profileId} to ${authPath}`);
  });

type OnboardDefaults = {
  workspace?: string;
  providers?: Array<GatewayConfig["auth"]["providers"][number]>;
  gateway?: {
    port?: number;
    bind?: string;
    authMode?: "token" | "password" | "none";
  };
  configExists?: boolean;
};

function shouldUsePlainOnboarding(): boolean {
  return (
    process.platform === "win32" ||
    process.env.OPENGRASP_PLAIN_ONBOARD === "1" ||
    !process.stdin.isTTY
  );
}

async function runOnboardingPlain(defaults: OnboardDefaults): Promise<{
  action: "keep" | "write";
  workspace: string;
  providers: Array<GatewayConfig["auth"]["providers"][number]>;
  authEntries: Array<{
    provider: string;
    type: "api_key" | "oauth";
    key?: string;
    access?: string;
    refresh?: string;
    email?: string;
  }>;
  gateway: {
    port: number;
    bind: string;
    authMode: "token" | "password" | "none";
    passwordHash?: string;
  };
}> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (question: string, defaultValue?: string): Promise<string> => {
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    const answer = (await rl.question(`${question}${suffix} `)).trim();
    return answer || defaultValue || "";
  };
  const yesNo = async (question: string, defaultYes = true): Promise<boolean> => {
    const suffix = defaultYes ? "[Y/n]" : "[y/N]";
    const answer = (await ask(`${question} ${suffix}`)).toLowerCase();
    if (!answer) return defaultYes;
    return answer.startsWith("y");
  };

  console.log("OpenGrasp onboarding.");
  console.log("Flow: existing config → auth → workspace → gateway → channels → daemon → health → skills.");

  if (defaults.configExists) {
    const choice = await ask("Existing config found: keep / modify / reset?", "modify");
    if (choice.trim().toLowerCase().startsWith("keep")) {
      rl.close();
      return {
        action: "keep",
        workspace: defaults.workspace ?? "~/.opengrasp/workspace",
        providers: defaults.providers ?? ["anthropic", "openai-codex", "kimi"],
        authEntries: [],
        gateway: {
          port: defaults.gateway?.port ?? 18789,
          bind: defaults.gateway?.bind ?? "127.0.0.1",
          authMode: defaults.gateway?.authMode ?? "token"
        }
      };
    }
  }

  const mode = await ask("Setup mode: quick or advanced?", "quick");
  const isAdvanced = mode.trim().toLowerCase().startsWith("adv");

  const providerSeed = defaults.providers ?? ["anthropic", "openai-codex", "kimi"];
  const providers: Array<GatewayConfig["auth"]["providers"][number]> = [];
  for (const provider of providerSeed) {
    const enable = await yesNo(`Enable ${provider} auth?`, true);
    if (enable) providers.push(provider);
  }

  const extraProvider = await ask("Add another provider? (enter name or leave blank)");
  if (extraProvider) {
    const normalized = extraProvider.trim().toLowerCase();
    const mapped =
      normalized === "codex" || normalized === "openai" ? "openai-codex" : normalized;
    if (!providers.includes(mapped as GatewayConfig["auth"]["providers"][number])) {
      providers.push(mapped as GatewayConfig["auth"]["providers"][number]);
    }
  }

  const authEntries: Array<{
    provider: string;
    type: "api_key" | "oauth";
    key?: string;
    access?: string;
    refresh?: string;
    email?: string;
  }> = [];

  for (const provider of providers) {
    const authType = (await ask(`Auth type for ${provider} (api/oauth/skip)?`, "api"))
      .toLowerCase()
      .trim();
    if (authType.startsWith("skip")) continue;
    if (authType.startsWith("oauth")) {
      const access = await promptHidden("OAuth access token (hidden):");
      const refresh = await promptHidden("OAuth refresh token (hidden):");
      const email = await ask("Account email (optional):");
      authEntries.push({ provider, type: "oauth", access, refresh, email: email || undefined });
    } else {
      const key = await promptHidden("API key (hidden):");
      const email = await ask("Account email (optional):");
      if (key) authEntries.push({ provider, type: "api_key", key, email: email || undefined });
    }
  }

  const workspace = await ask(
    "Workspace path?",
    defaults.workspace ?? "~/.opengrasp/workspace"
  );

  const gatewayPort = isAdvanced
    ? Number(await ask("Gateway port?", String(defaults.gateway?.port ?? 18789)))
    : defaults.gateway?.port ?? 18789;
  const gatewayBind = isAdvanced
    ? await ask("Gateway bind?", defaults.gateway?.bind ?? "127.0.0.1")
    : defaults.gateway?.bind ?? "127.0.0.1";
  const gatewayAuthMode = isAdvanced
    ? ((await ask("Gateway auth mode (token/password/none)?", "token")) as
        | "token"
        | "password"
        | "none")
    : defaults.gateway?.authMode ?? "token";

  console.log("Channels setup not implemented yet; skipping.");
  console.log("Daemon install not implemented yet; skipping.");
  console.log("Health check not implemented yet; skipping.");
  console.log("Skills install not implemented yet; skipping.");

  console.log("Summary:");
  console.log(`Workspace: ${workspace}`);
  console.log(`Providers: ${providers.join(", ") || "none"}`);
  console.log(`Auth entries: ${authEntries.length}`);
  console.log(`Gateway: ${gatewayBind}:${gatewayPort} (${gatewayAuthMode})`);

  const proceed = await yesNo("Continue and write config?", true);
  rl.close();
  if (!proceed) {
    process.exit(1);
  }

  return {
    action: "write",
    workspace,
    providers,
    authEntries,
    gateway: {
      port: gatewayPort,
      bind: gatewayBind,
      authMode: gatewayAuthMode
    }
  };
}

program
  .command("gateway")
  .description("Start the gateway")
  .action(async () => {
    await startGateway();
  });

program
  .command("dashboard")
  .description("Print dashboard URL")
  .action(async () => {
    const configPath = path.join(os.homedir(), ".opengrasp", "opengrasp.json");
    const raw = await fs.readFile(configPath, "utf-8");
    const config = GatewayConfigSchema.parse(JSON5.parse(raw));
    console.log(`Dashboard: http://${config.gateway.bind}:${config.gateway.port}`);
  });

program
  .command("tui")
  .option("--url <url>", "Gateway WS url")
  .option("--token <token>", "Gateway token")
  .description("Open terminal UI")
  .action(async (opts) => {
    await startTui({ url: opts.url, token: opts.token });
  });

program
  .command("agent")
  .requiredOption("--message <message>")
  .option("--session <session>", "Session key", "main")
  .option("--agent <agent>", "Agent id", "main")
  .description("Send a single message to the gateway")
  .action(async (opts) => {
    const configPath = path.join(os.homedir(), ".opengrasp", "opengrasp.json");
    const raw = await fs.readFile(configPath, "utf-8");
    const config = GatewayConfigSchema.parse(JSON5.parse(raw));
    const url = `http://${config.gateway.bind}:${config.gateway.port}/api/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: opts.message, session: opts.session, agent: opts.agent })
    });
    const json = await res.json();
    console.log(json?.message?.content ?? json);
  });

program.parseAsync(process.argv);

async function writeBootstrapFiles(workspace: string): Promise<void> {
  const files: Record<string, string> = {
    "AGENTS.md": "# AGENTS\n\nOpenGrasp agent instructions.",
    "SOUL.md": "# SOUL\n\nVoice and boundaries.",
    "TOOLS.md": "# TOOLS\n\nPreferred tool usage.",
    "BOOTSTRAP.md": "# BOOTSTRAP\n\nFirst-run ritual.",
    "IDENTITY.md": "# IDENTITY\n\nName and vibe.",
    "USER.md": "# USER\n\nUser profile."
  };
  await Promise.all(
    Object.entries(files).map(async ([name, content]) => {
      const file = path.join(workspace, name);
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, content, "utf-8");
      }
    })
  );
}

async function readJson(file: string): Promise<Record<string, any>> {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON5.parse(raw);
  } catch {
    return {};
  }
}

async function readConfigIfExists(configPath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return JSON5.parse(raw);
  } catch {
    return null;
  }
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

async function writeAuthEntries(
  entries: Array<{ provider: string; type: "api_key" | "oauth"; key?: string; access?: string; refresh?: string; email?: string }>,
  agentId: string
): Promise<void> {
  if (entries.length === 0) return;
  const authDir = path.join(os.homedir(), ".opengrasp", "agents", agentId, "agent");
  const authPath = path.join(authDir, "auth-profiles.json");
  const payload = await readJson(authPath);
  payload.profiles = payload.profiles ?? {};
  for (const entry of entries) {
    const profileId = entry.email ? `${entry.provider}:${entry.email}` : `${entry.provider}:default`;
    if (entry.type === "api_key") {
      payload.profiles[profileId] = { type: "api_key", provider: entry.provider, key: entry.key };
    } else {
      payload.profiles[profileId] = {
        type: "oauth",
        provider: entry.provider,
        access: entry.access ?? "",
        refresh: entry.refresh ?? "",
        expires: Date.now() + 3600 * 1000,
        email: entry.email ?? undefined
      };
    }
  }
  await fs.mkdir(authDir, { recursive: true });
  await fs.writeFile(authPath, JSON5.stringify(payload, null, 2), "utf-8");
}

async function hashPasswordPrompt(): Promise<string | undefined> {
  const input = await promptHidden("Gateway password (hidden):");
  if (!input) return undefined;
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(input, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

async function promptHidden(label: string): Promise<string> {
  if (!process.stdin.isTTY) return "";
  process.stdout.write(`${label} `);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let input = "";
  return await new Promise((resolve) => {
    process.stdin.on("data", (data) => {
      const char = data.toString("utf-8");
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(input);
      } else if (char === "\u0003") {
        process.exit(1);
      } else if (char === "\u007f") {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    });
  });
}
