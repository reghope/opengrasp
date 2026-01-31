import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-vite-plugin";

export default defineConfig({
  plugins: [TanStackRouterVite(), react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:18789",
        changeOrigin: true
      },
      "/ws": {
        target: "ws://127.0.0.1:18789",
        ws: true
      }
    }
  }
});
