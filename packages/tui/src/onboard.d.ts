import type { AuthProvider, OnboardResult } from "@opengrasp/shared";
type OnboardDefaults = {
    workspace?: string;
    providers?: AuthProvider[];
    gateway?: {
        port?: number;
        bind?: string;
        authMode?: "token" | "password" | "none";
    };
    configExists?: boolean;
};
export declare function runOnboardingTui(defaults?: OnboardDefaults): Promise<OnboardResult>;
export {};
