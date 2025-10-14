#!/usr/bin/env bash
set -euo pipefail

echo "[lock-check] Verifiziere Dashboard-Lockfile mit isoliertem npm ci…" >&2
pushd "dashboard" > /dev/null
npm ci --ignore-scripts
popd > /dev/null

# Aufräumen, um nachfolgende Workspace-Installation nicht zu beeinflussen
rm -rf "dashboard/node_modules"

echo "[lock-check] Verifiziere Root/Workspaces-Installation gemäß Root-Lockfile…" >&2
npm ci --workspaces --include-workspace-root

echo "[lock-check] OK: Lockfiles sind konsistent." >&2

