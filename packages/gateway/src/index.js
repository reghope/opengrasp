import { loadConfig } from "./config.js";
import { createGatewayServer } from "./server.js";
export async function startGateway() {
    const { config } = await loadConfig();
    const { server } = await createGatewayServer(config);
    const port = config.gateway.port;
    const host = config.gateway.bind;
    return new Promise((resolve) => {
        server.listen(port, host, () => {
            console.log(`OpenGrasp Gateway running at http://${host}:${port}`);
            resolve();
        });
    });
}
if (process.argv[1]?.includes("gateway")) {
    startGateway().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
