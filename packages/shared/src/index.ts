import { z } from "zod";

export const AuthProviderSchema = z.enum([
  "anthropic",
  "openai-codex",
  "kimi",
  "openai",
  "openrouter",
  "google",
  "gemini",
  "minimax",
  "moonshot",
  "venice",
  "zai",
  "local"
]);

export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const GatewayConfigSchema = z.object({
  gateway: z
    .object({
      port: z.number().default(18789),
      bind: z.string().default("127.0.0.1"),
      auth: z
        .object({
          mode: z.enum(["token", "password", "none"]).default("token"),
          token: z.string().default(""),
          passwordHash: z.string().optional()
        })
        .default({ mode: "token", token: "" })
    })
    .default({ port: 18789, bind: "127.0.0.1", auth: { mode: "token", token: "" } }),
  dev: z
    .object({
      preview: z
        .object({
          mode: z.enum(["auto", "fixed"]).default("auto"),
          url: z.string().nullable().default(null),
          ports: z.array(z.number()).default([3000, 5173, 8080, 4173, 9000])
        })
        .default({ mode: "auto", url: null, ports: [3000, 5173, 8080, 4173, 9000] })
    })
    .default({ preview: { mode: "auto", url: null, ports: [3000, 5173, 8080, 4173, 9000] } }),
  auth: z
    .object({
      providers: z.array(AuthProviderSchema).default([
        "anthropic",
        "openai-codex",
        "kimi"
      ])
    })
    .default({ providers: ["anthropic", "openai-codex", "kimi"] }),
  agents: z
    .object({
      defaults: z
        .object({
          workspace: z.string().default("~/.opengrasp/workspace"),
          model: z
            .object({
              primary: z.string().default(""),
              fallbacks: z.array(z.string()).default([])
            })
            .default({ primary: "", fallbacks: [] }),
          compaction: z
            .object({
              reserveTokensFloor: z.number().default(20000),
              memoryFlush: z
                .object({
                  enabled: z.boolean().default(true),
                  softThresholdTokens: z.number().default(4000),
                  systemPrompt: z
                    .string()
                    .default("Session nearing compaction. Store durable memories now."),
                  prompt: z
                    .string()
                    .default(
                      "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
                    )
                })
                .default({
                  enabled: true,
                  softThresholdTokens: 4000,
                  systemPrompt: "Session nearing compaction. Store durable memories now.",
                  prompt:
                    "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store."
                })
            })
            .default({ reserveTokensFloor: 20000, memoryFlush: { enabled: true, softThresholdTokens: 4000, systemPrompt: "Session nearing compaction. Store durable memories now.", prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store." } })
        })
        .default({ workspace: "~/.opengrasp/workspace", model: { primary: "", fallbacks: [] }, compaction: { reserveTokensFloor: 20000, memoryFlush: { enabled: true, softThresholdTokens: 4000, systemPrompt: "Session nearing compaction. Store durable memories now.", prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store." } } })
    })
    .default({ defaults: { workspace: "~/.opengrasp/workspace", model: { primary: "", fallbacks: [] }, compaction: { reserveTokensFloor: 20000, memoryFlush: { enabled: true, softThresholdTokens: 4000, systemPrompt: "Session nearing compaction. Store durable memories now.", prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply with NO_REPLY if nothing to store." } } } }),
  memorySearch: z
    .object({
      enabled: z.boolean().default(true),
      provider: z.enum(["local", "openai", "gemini"]).optional(),
      extraPaths: z.array(z.string()).default([])
    })
    .default({ enabled: true, provider: undefined, extraPaths: [] })
});

export type GatewayConfig = z.infer<typeof GatewayConfigSchema>;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
};

export type ChatRequest = {
  message: string;
  session: string;
  agent: string;
};

export type ChatResponse = {
  message: ChatMessage;
};

export type OnboardAuthEntry =
  | {
      provider: AuthProvider;
      type: "api_key";
      key: string;
      email?: string;
    }
  | {
      provider: AuthProvider;
      type: "oauth";
      access: string;
      refresh: string;
      email?: string;
    };

export type OnboardResult = {
  action: "keep" | "write";
  workspace: string;
  providers: AuthProvider[];
  authEntries: OnboardAuthEntry[];
  gateway: {
    port: number;
    bind: string;
    authMode: "token" | "password" | "none";
    passwordHash?: string;
  };
};
