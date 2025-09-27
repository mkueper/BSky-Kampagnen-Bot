#!/usr/bin/env bash
set -euo pipefail

# Nutzung: ./scripts/run-workspace.sh <ws-path> <script> [-- <args>]
# Beispiel: ./scripts/run-workspace.sh dashboard build -- --watch

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <workspace> <script> [-- <args>]" >&2
  exit 1
fi

workspace="$1"
script="$2"
shift 2

# Workspaces benötigen npm_config_workspaces=true, wenn die globale .npmrc workspaces=false setzt.
# Wir setzen die Variable nur für diesen Aufruf.
export npm_config_workspaces=true

exec npm run "$script" --workspace "$workspace" -- "$@"
