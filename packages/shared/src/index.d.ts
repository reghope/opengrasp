import { z } from "zod";
export declare const AuthProviderSchema: z.ZodEnum<{
    anthropic: "anthropic";
    "openai-codex": "openai-codex";
    kimi: "kimi";
    openai: "openai";
    openrouter: "openrouter";
    google: "google";
    gemini: "gemini";
    minimax: "minimax";
    moonshot: "moonshot";
    venice: "venice";
    zai: "zai";
    local: "local";
}>;
export type AuthProvider = z.infer<typeof AuthProviderSchema>;
export declare const GatewayConfigSchema: z.ZodObject<{
    gateway: z.ZodDefault<z.ZodObject<{
        port: z.ZodDefault<z.ZodNumber>;
        bind: z.ZodDefault<z.ZodString>;
        auth: z.ZodDefault<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<{
                token: "token";
                password: "password";
                none: "none";
            }>>;
            token: z.ZodDefault<z.ZodString>;
            passwordHash: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    dev: z.ZodDefault<z.ZodObject<{
        preview: z.ZodDefault<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<{
                auto: "auto";
                fixed: "fixed";
            }>>;
            url: z.ZodDefault<z.ZodNullable<z.ZodString>>;
            ports: z.ZodDefault<z.ZodArray<z.ZodNumber>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    auth: z.ZodDefault<z.ZodObject<{
        providers: z.ZodDefault<z.ZodArray<z.ZodEnum<{
            anthropic: "anthropic";
            "openai-codex": "openai-codex";
            kimi: "kimi";
            openai: "openai";
            openrouter: "openrouter";
            google: "google";
            gemini: "gemini";
            minimax: "minimax";
            moonshot: "moonshot";
            venice: "venice";
            zai: "zai";
            local: "local";
        }>>>;
    }, z.core.$strip>>;
    agents: z.ZodDefault<z.ZodObject<{
        defaults: z.ZodDefault<z.ZodObject<{
            workspace: z.ZodDefault<z.ZodString>;
            model: z.ZodDefault<z.ZodObject<{
                primary: z.ZodDefault<z.ZodString>;
                fallbacks: z.ZodDefault<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>>;
            compaction: z.ZodDefault<z.ZodObject<{
                reserveTokensFloor: z.ZodDefault<z.ZodNumber>;
                memoryFlush: z.ZodDefault<z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    softThresholdTokens: z.ZodDefault<z.ZodNumber>;
                    systemPrompt: z.ZodDefault<z.ZodString>;
                    prompt: z.ZodDefault<z.ZodString>;
                }, z.core.$strip>>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    memorySearch: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        provider: z.ZodOptional<z.ZodEnum<{
            openai: "openai";
            gemini: "gemini";
            local: "local";
        }>>;
        extraPaths: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
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
export type OnboardAuthEntry = {
    provider: AuthProvider;
    type: "api_key";
    key: string;
    email?: string;
} | {
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
