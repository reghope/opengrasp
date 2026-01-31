import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import JSON5 from "json5";
import { GatewayConfigSchema, type GatewayConfig } from "@opengrasp/shared";

const CONFIG_DIR = ".opengrasp";
const CONFIG_FILE = "opengrasp.json";

export function getConfigPath(): string {
  return path.join(os.homedir(), CONFIG_DIR, CONFIG_FILE);
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

function withExpandedPaths(config: GatewayConfig): GatewayConfig {
  return {
    ...config,
    agents: {
      ...config.agents,
      defaults: {
        ...config.agents.defaults,
        workspace: expandHome(config.agents.defaults.workspace)
      }
    }
  };
}

export async function loadConfig(): Promise<{ config: GatewayConfig; path: string; created: boolean }>
{
  const configPath = getConfigPath();
  let created = false;
  let raw: unknown = {};
  try {
    const file = await fs.readFile(configPath, "utf-8");
    raw = JSON5.parse(file);
  } catch {
    created = true;
  }

  let config = GatewayConfigSchema.parse(raw);
  config = withExpandedPaths(config);

  if (!config.gateway.auth.token && config.gateway.auth.mode === "token") {
    config.gateway.auth.token = crypto.randomBytes(24).toString("hex");
    created = true;
  }

  if (created) {
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    const serialized = JSON5.stringify(config, null, 2);
    await fs.writeFile(configPath, serialized, "utf-8");
  }

  return { config, path: configPath, created };
}

export async function writeConfig(config: GatewayConfig): Promise<void> {
  const configPath = getConfigPath();
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  const serialized = JSON5.stringify(config, null, 2);
  await fs.writeFile(configPath, serialized, "utf-8");
}
