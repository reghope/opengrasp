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
const packageOrder = ["shared", "memory", "gateway", "tui", "cli"];
let rootFilter = null;

const normalizedArgs = [];
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--root") {
    const value = args[i + 1];
    if (!value) {
      console.error("run-all.mjs: --root requires a value (packages, apps, or comma-separated).");
      process.exit(1);
    }
    rootFilter = value.split(",").map((root) => root.trim()).filter(Boolean);
    i += 1;
    continue;
  }
  normalizedArgs.push(arg);
}

function orderEntries(root, entries) {
  if (root !== "packages") return entries;
  const byName = new Map(entries.map((entry) => [entry.name, entry]));
  const ordered = [];
  for (const name of packageOrder) {
    const entry = byName.get(name);
    if (entry) {
      ordered.push(entry);
      byName.delete(name);
    }
  }
  for (const entry of [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    ordered.push(entry);
  }
  return ordered;
}

const activeRoots = rootFilter?.length
  ? roots.filter((root) => rootFilter.includes(root))
  : roots;

for (const root of activeRoots) {
  if (!existsSync(root)) continue;
  const entries = orderEntries(root, readdirSync(root, { withFileTypes: true }));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    if (!existsSync(join(dir, "package.json"))) continue;
    console.log(`→ ${dir} (${cmd})`);
    const result = spawnSync("bun", ["run", cmd, ...normalizedArgs], {
      cwd: dir,
      stdio: "inherit",
      shell: true
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
