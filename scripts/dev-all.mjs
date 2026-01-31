import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function run(cmd, args, options = {}) {
  return spawn(cmd, args, {
    stdio: "inherit",
    shell: true,
    ...options
  });
}

function kill(child) {
  if (!child || child.killed) return;
  child.kill("SIGTERM");
}

const build = run("bun", [join(root, "scripts/run-all.mjs"), "build"], { cwd: root });

build.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  const gateway = run("bun", ["packages/cli/dist/index.js", "gateway"], { cwd: root });
  const web = run("bun", ["run", "dev"], { cwd: join(root, "apps/web") });

  const shutdown = () => {
    kill(gateway);
    kill(web);
  };

  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    shutdown();
    process.exit(0);
  });
});
