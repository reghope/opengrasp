import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import type { GatewayConfig, ChatResponse, ChatMessage } from "@opengrasp/shared";
import {
  ensureWorkspace,
  readStartupMemory,
  appendDailyMemory,
  appendLongTermMemory,
  estimateTokens,
  shouldFlushMemory
} from "@opengrasp/memory";

const BOOTSTRAP_FILES = [
  "AGENTS.md",
  "SOUL.md",
  "TOOLS.md",
  "BOOTSTRAP.md",
  "IDENTITY.md",
  "USER.md"
];

type SessionState = {
  history: ChatMessage[];
  tokenEstimate: number;
  memoryFlushed: boolean;
};

const sessions = new Map<string, SessionState>();

async function readBootstrap(workspace: string): Promise<string[]> {
  const contents: string[] = [];
  for (const file of BOOTSTRAP_FILES) {
    const full = path.join(workspace, file);
    try {
      const text = await fs.readFile(full, "utf-8");
      if (text.trim().length > 0) contents.push(text);
    } catch {
      contents.push(`[missing ${file}]`);
    }
  }
  return contents;
}

function buildMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: Date.now()
  };
}

export async function runAgent(
  config: GatewayConfig,
  message: string,
  sessionKey: string
): Promise<ChatResponse> {
  const session = sessions.get(sessionKey) ?? {
    history: [],
    tokenEstimate: 0,
    memoryFlushed: false
  };

  const paths = await ensureWorkspace(config.agents.defaults.workspace);

  if (session.history.length === 0) {
    const bootstrap = await readBootstrap(paths.workspace);
    const memory = await readStartupMemory(paths);
    const systemContent = [...bootstrap, ...memory].join("\n\n");
    if (systemContent.trim().length > 0) {
      session.history.push(buildMessage("system", systemContent));
    }
  }

  const userMessage = buildMessage("user", message);
  session.history.push(userMessage);
  session.tokenEstimate += estimateTokens(message);

  if (
    config.agents.defaults.compaction.memoryFlush.enabled &&
    !session.memoryFlushed &&
    shouldFlushMemory(
      session.tokenEstimate,
      128000,
      config.agents.defaults.compaction.reserveTokensFloor,
      config.agents.defaults.compaction.memoryFlush.softThresholdTokens
    )
  ) {
    await appendDailyMemory(paths, "AUTO_FLUSH: session nearing compaction.");
    session.memoryFlushed = true;
  }

  const rememberMatch = message.match(/remember(?: this)?:\s*(.+)/i);
  if (rememberMatch?.[1]) {
    await appendDailyMemory(paths, rememberMatch[1].trim());
  }

  if (/long[- ]term/i.test(message)) {
    await appendLongTermMemory(paths, message.trim());
  }

  const assistant = buildMessage("assistant", `Echo: ${message}`);
  session.history.push(assistant);
  session.tokenEstimate += estimateTokens(assistant.content);

  sessions.set(sessionKey, session);
  return { message: assistant };
}
