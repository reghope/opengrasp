import { format, subDays } from "date-fns";
import fs from "node:fs/promises";
import path from "node:path";
const utf8 = "utf-8";
export async function ensureWorkspace(workspace) {
    const memoryDir = path.join(workspace, "memory");
    const longTerm = path.join(workspace, "MEMORY.md");
    await fs.mkdir(memoryDir, { recursive: true });
    return { workspace, memoryDir, longTerm };
}
export function dailyMemoryPath(memoryDir, date = new Date()) {
    const name = `${format(date, "yyyy-MM-dd")}.md`;
    return path.join(memoryDir, name);
}
export async function readStartupMemory(paths) {
    const today = dailyMemoryPath(paths.memoryDir, new Date());
    const yesterday = dailyMemoryPath(paths.memoryDir, subDays(new Date(), 1));
    const outputs = [];
    for (const file of [today, yesterday, paths.longTerm]) {
        try {
            const content = await fs.readFile(file, utf8);
            outputs.push(content);
        }
        catch {
            // missing files are allowed
        }
    }
    return outputs;
}
export async function appendDailyMemory(paths, content) {
    const file = dailyMemoryPath(paths.memoryDir, new Date());
    const line = content.endsWith("\n") ? content : `${content}\n`;
    await fs.appendFile(file, line, utf8);
}
export async function appendLongTermMemory(paths, content) {
    const line = content.endsWith("\n") ? content : `${content}\n`;
    await fs.appendFile(paths.longTerm, line, utf8);
}
export function shouldFlushMemory(estimatedTokens, contextWindow, reserveTokensFloor, softThresholdTokens) {
    const trigger = contextWindow - reserveTokensFloor - softThresholdTokens;
    return estimatedTokens >= trigger;
}
export function estimateTokens(text) {
    // Rough heuristic: 4 chars per token
    return Math.ceil(text.length / 4);
}
