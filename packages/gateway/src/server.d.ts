import express from "express";
import { type Server as HttpServer } from "node:http";
import type { GatewayConfig } from "@opengrasp/shared";
export declare function createGatewayServer(config: GatewayConfig): Promise<{
    app: express.Express;
    server: HttpServer;
}>;
