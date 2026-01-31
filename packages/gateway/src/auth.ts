import crypto from "node:crypto";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";
import signature from "cookie-signature";
import type { Request, Response } from "express";

const COOKIE_NAME = "og_session";
const COOKIE_SECRET = crypto.randomBytes(16).toString("hex");
const sessions = new Set<string>();

export function createSession(): string {
  const id = crypto.randomBytes(18).toString("hex");
  sessions.add(id);
  return id;
}

export function destroySession(id: string): void {
  sessions.delete(id);
}

export function getSessionId(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const cookies = parseCookie(header);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return null;
  if (!raw.startsWith("s:")) return null;
  const unsigned = signature.unsign(raw.slice(2), COOKIE_SECRET);
  if (!unsigned) return null;
  return unsigned;
}

export function isAuthenticated(req: Request): boolean {
  const sessionId = getSessionId(req);
  if (!sessionId) return false;
  return sessions.has(sessionId);
}

export function setSessionCookie(res: Response, sessionId: string): void {
  const signed = `s:${signature.sign(sessionId, COOKIE_SECRET)}`;
  const cookie = serializeCookie(COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false
  });
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res: Response): void {
  const cookie = serializeCookie(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  res.setHeader("Set-Cookie", cookie);
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3) return false;
  const [algo, salt, hash] = parts;
  if (algo !== "scrypt") return false;
  const derived = crypto.scryptSync(password, salt, 32).toString("hex");
  return timingSafeEqual(hash, derived);
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
