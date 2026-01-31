export type MemoryPaths = {
    workspace: string;
    memoryDir: string;
    longTerm: string;
};
export type MemoryFlushConfig = {
    enabled: boolean;
    softThresholdTokens: number;
    systemPrompt: string;
    prompt: string;
};
export declare function ensureWorkspace(workspace: string): Promise<MemoryPaths>;
export declare function dailyMemoryPath(memoryDir: string, date?: Date): string;
export declare function readStartupMemory(paths: MemoryPaths): Promise<string[]>;
export declare function appendDailyMemory(paths: MemoryPaths, content: string): Promise<void>;
export declare function appendLongTermMemory(paths: MemoryPaths, content: string): Promise<void>;
export declare function shouldFlushMemory(estimatedTokens: number, contextWindow: number, reserveTokensFloor: number, softThresholdTokens: number): boolean;
export declare function estimateTokens(text: string): number;
