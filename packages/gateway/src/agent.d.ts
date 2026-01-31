import type { GatewayConfig, ChatResponse } from "@opengrasp/shared";
export declare function runAgent(config: GatewayConfig, message: string, sessionKey: string): Promise<ChatResponse>;
