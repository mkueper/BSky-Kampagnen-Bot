#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-v1.1.0}"
TITLE="${2:-v1.1.0}"
ASSET="${3:-dist/BSky Kampagnen Tool-1.1.0.AppImage}"
NOTES_FILE="${4:-RELEASE_NOTES_v1.1.0.md}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) not found. Install: https://cli.github.com/" >&2
  exit 1
fi

echo "Creating GitHub Release ${TAG}…"
gh release create "${TAG}" "${ASSET}" \
  --title "${TITLE}" \
  --notes-file "${NOTES_FILE}"

echo "Done."

