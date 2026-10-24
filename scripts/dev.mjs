import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const services = [
  { name: "API", args: ["run", "dev:api"] },
  { name: "Frontend", args: ["run", "dev:web"] },
];

const children = services.map(({ name, args }) => {
  const child = spawn(npmCommand, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    windowsHide: true,
  });

  child.on("error", (error) => {
    process.stderr.write(`[${name}] Could not start: ${error.message}\n`);
  });
  child.on("exit", (code) => {
    if (code && code !== 0) {
      process.stderr.write(`[${name}] stopped with exit code ${code}\n`);
    }
  });

  return child;
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    if (!child.pid) continue;
    if (process.platform === "win32") {
      spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

process.stdout.write("Starting LabNEXUS API and frontend. Ensure PostgreSQL is running.\n");
