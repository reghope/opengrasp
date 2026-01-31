import { type GatewayConfig } from "@opengrasp/shared";
export declare function getConfigPath(): string;
export declare function loadConfig(): Promise<{
    config: GatewayConfig;
    path: string;
    created: boolean;
}>;
export declare function writeConfig(config: GatewayConfig): Promise<void>;
