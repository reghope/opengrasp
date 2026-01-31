import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const cmd = process.argv[2];
const args = process.argv.slice(3);

if (!cmd) {
  console.error("usage: run-all.mjs <script> [args...]");
  process.exit(1);
}

const roots = ["packages", "apps"];

for (const root of roots) {
  if (!existsSync(root)) continue;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    if (!existsSync(join(dir, "package.json"))) continue;
    console.log(`→ ${dir} (${cmd})`);
    const result = spawnSync("bun", ["run", cmd, ...args], {
      cwd: dir,
      stdio: "inherit",
      shell: true
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
