import type { Request, Response } from "express";
export declare function createSession(): string;
export declare function destroySession(id: string): void;
export declare function getSessionId(req: Request): string | null;
export declare function isAuthenticated(req: Request): boolean;
export declare function setSessionCookie(res: Response, sessionId: string): void;
export declare function clearSessionCookie(res: Response): void;
export declare function verifyPassword(password: string, storedHash?: string): boolean;
