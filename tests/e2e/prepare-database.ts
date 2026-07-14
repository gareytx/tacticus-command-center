import { spawnSync } from "node:child_process";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const prepared = spawnSync(npx, ["prisma", "migrate", "reset", "--force"], {
  cwd: process.cwd(),
  env: { ...process.env, DATABASE_URL: "file:./playwright.db" },
  shell: process.platform === "win32",
  stdio: "inherit",
});
process.exit(prepared.status ?? 1);
