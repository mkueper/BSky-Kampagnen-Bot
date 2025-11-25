#!/usr/bin/env node

/**
 * Aggregates all build commands and prints a concise summary.
 * Exits with code 1 if any step fails.
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const workspaceDir = path.resolve(__dirname, "..");

const steps = [
  { label: "Backend", args: ["run", "build:backend"] },
  { label: "Bsky-Client", args: ["run", "build:bsky-client"] },
  { label: "Dashboard", args: ["run", "build:frontend"] },
  { label: "Shared UI", args: ["run", "build:shared-ui"] },
  { label: "Media-Pickers", args: ["run", "build", "--workspace", "packages/media-pickers"] },
];

const results = [];

for (const step of steps) {
  console.log(`\n[build:all] ▶ ${step.label}`);
  const started = Date.now();
  const result = spawnSync(npmCmd, step.args, {
    cwd: workspaceDir,
    stdio: "inherit",
    env: process.env,
  });
  const durationSec = ((Date.now() - started) / 1000).toFixed(1);
  const status = typeof result.status === "number" ? result.status : 1;

  if (status === 0) {
    console.log(`[build:all] ✅ ${step.label} (${durationSec}s)`);
  } else {
    console.error(`[build:all] ❌ ${step.label} (${durationSec}s)`);
  }

  results.push({
    label: step.label,
    durationSec,
    status,
  });

  if (status !== 0) {
    break;
  }
}

console.log("\n[build:all] Zusammenfassung");
for (const result of results) {
  const icon = result.status === 0 ? "✅" : "❌";
  console.log(`  ${icon} ${result.label} (${result.durationSec}s)`);
}

const failed = results.find((r) => r.status !== 0);
if (failed) {
  console.error(`\n[build:all] Fehler in Schritt "${failed.label}".`);
  process.exitCode = failed.status || 1;
} else {
  console.log("\n[build:all] Alle Builds erfolgreich abgeschlossen.");
}
