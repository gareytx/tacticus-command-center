import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

let server: ChildProcess | undefined;

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null)
      throw new Error("The isolated Playwright server exited before startup.");
    try {
      const response = await fetch("http://localhost:3100");
      if (response.ok) return;
    } catch {
      // The development server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("The isolated Playwright server did not start in time.");
}

export default async function globalSetup() {
  server = spawn(
    process.execPath,
    [
      path.resolve("node_modules", "next", "dist", "bin", "next"),
      "dev",
      "--port",
      "3100",
    ],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: "file:./playwright.db" },
      stdio: "inherit",
    },
  );
  await waitForServer();
  return () => {
    if (!server?.pid) return;
    if (process.platform === "win32")
      spawnSync("taskkill.exe", ["/PID", String(server.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    else server.kill("SIGTERM");
  };
}
