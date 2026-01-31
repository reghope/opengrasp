import express from "express";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { WebSocketServer } from "ws";
import { runAgent } from "./agent.js";
import { createSession, isAuthenticated, setSessionCookie, clearSessionCookie, verifyPassword } from "./auth.js";
import net from "node:net";
export async function createGatewayServer(config) {
    const app = express();
    app.use(express.json({ limit: "2mb" }));
    app.get("/api/health", (_req, res) => res.json({ ok: true }));
    app.get("/api/config", (_req, res) => {
        res.json({
            gateway: { port: config.gateway.port, bind: config.gateway.bind, auth: { mode: config.gateway.auth.mode } },
            dev: config.dev,
            auth: config.auth
        });
    });
    app.get("/api/session", (req, res) => {
        if (config.gateway.auth.mode === "none") {
            return res.json({ authenticated: true });
        }
        return res.json({ authenticated: isAuthenticated(req) });
    });
    app.post("/api/login", (req, res) => {
        const token = String(req.body?.token ?? "");
        const password = String(req.body?.password ?? "");
        if (config.gateway.auth.mode === "none") {
            return res.json({ ok: true });
        }
        if (config.gateway.auth.mode === "token" && token === config.gateway.auth.token) {
            const sessionId = createSession();
            setSessionCookie(res, sessionId);
            return res.json({ ok: true });
        }
        if (config.gateway.auth.mode === "password" && verifyPassword(password, config.gateway.auth.passwordHash)) {
            const sessionId = createSession();
            setSessionCookie(res, sessionId);
            return res.json({ ok: true });
        }
        return res.status(401).json({ ok: false, error: "unauthorized" });
    });
    app.post("/api/logout", (_req, res) => {
        clearSessionCookie(res);
        res.json({ ok: true });
    });
    app.post("/api/chat", async (req, res) => {
        if (config.gateway.auth.mode !== "none" && !isAuthenticated(req)) {
            return res.status(401).json({ ok: false, error: "unauthorized" });
        }
        const { message, session = "main", agent = "main" } = req.body ?? {};
        if (!message || typeof message !== "string") {
            return res.status(400).json({ ok: false, error: "message required" });
        }
        const response = await runAgent(config, message, `${agent}:${session}`);
        res.json({ ok: true, ...response });
    });
    app.get("/api/dev-preview", async (_req, res) => {
        const url = await detectDevUrl(config.dev.preview);
        res.json({ url });
    });
    const distPath = path.resolve(process.cwd(), "apps/web/dist");
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get(/.*/, (_req, res) => res.sendFile(path.join(distPath, "index.html")));
    }
    else {
        app.get("/", (_req, res) => res.send("OpenGrasp gateway running. Build the web UI to view."));
    }
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server, path: "/ws" });
    wss.on("connection", (socket, req) => {
        if (config.gateway.auth.mode !== "none") {
            const authHeader = req.headers["authorization"] || req.headers["Authorization"];
            const token = typeof authHeader === "string" ? authHeader.replace("Bearer ", "") : null;
            const cookieAuth = isAuthenticated(req);
            const tokenAuth = config.gateway.auth.mode === "token" && token === config.gateway.auth.token;
            if (!cookieAuth && !tokenAuth) {
                socket.close();
                return;
            }
        }
        socket.on("message", async (raw) => {
            try {
                const parsed = JSON.parse(raw.toString());
                if (parsed.type === "chat") {
                    const response = await runAgent(config, String(parsed.message ?? ""), `${parsed.agent ?? "main"}:${parsed.session ?? "main"}`);
                    socket.send(JSON.stringify({ type: "chat", response }));
                }
            }
            catch (err) {
                socket.send(JSON.stringify({ type: "error", error: String(err) }));
            }
        });
    });
    return { app, server };
}
async function detectDevUrl(preview) {
    if (preview.mode === "fixed" && preview.url)
        return preview.url;
    for (const port of preview.ports) {
        const open = await isPortOpen(port);
        if (open)
            return `http://127.0.0.1:${port}`;
    }
    return null;
}
function isPortOpen(port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(300);
        socket.once("connect", () => {
            socket.destroy();
            resolve(true);
        });
        socket.once("timeout", () => {
            socket.destroy();
            resolve(false);
        });
        socket.once("error", () => {
            resolve(false);
        });
        socket.connect(port, "127.0.0.1");
    });
}
