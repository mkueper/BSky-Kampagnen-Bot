#!/bin/bash
set -eu
set -o pipefail 2>/dev/null || true

# Always operate from the project root, regardless of the caller's CWD
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# Standard-Bundle-Namen auf Basis des aktuellen Datums setzen
# Format: Bsky-Client-YYYY-MM-DD
STAMP=$(date +%F)
DEFAULT_BUNDLE_NAME="Bsky-Client-${STAMP}"

BUNDLE_NAME=${1:-${DEFAULT_BUNDLE_NAME}}
BUNDLES_DIR="dist/bundles"
WORK_DIR="${BUNDLES_DIR}/${BUNDLE_NAME}"
APP_DIR="${WORK_DIR}/app"
PROJECT_CONTENT=(
  "package.json"
  "package-lock.json"
  "bsky-client"
  "packages/shared-ui"
  "packages/shared-logic"
  "packages/media-pickers"
)
CLIENT_ENV_SAMPLE="bsky-client/.env.sample"

mkdir -p "${BUNDLES_DIR}"
rm -rf "${WORK_DIR}"
mkdir -p "${APP_DIR}"

echo "Bundele Bluesky-Client-Basis in ${APP_DIR}" >&2
tar -cf - "${PROJECT_CONTENT[@]}" | tar -xf - -C "${APP_DIR}"

# Entferne alle node_modules-Verzeichnisse, um Bundle schlank zu halten
find "${APP_DIR}" -type d -name 'node_modules' -prune -exec rm -rf '{}' +

# Entferne vorhandene Build-Ausgaben (werden im Container neu erzeugt)
rm -rf "${APP_DIR}/bsky-client/dist"

# Entferne versehentlich kopierte .env-Dateien
find "${APP_DIR}" -name '.env' -type f -delete

# Docker-Artefakte für den Client bereitstellen
mkdir -p "${APP_DIR}/docker"
cp docker/Dockerfile.bsky-client "${APP_DIR}/docker/Dockerfile.bsky-client"
cp docker/docker-compose.bsky-client.yml "${APP_DIR}/docker-compose.yml"

# .dockerignore für robuste Docker-Builds in das Bundle aufnehmen (falls vorhanden)
if [[ -f .dockerignore ]]; then
  cp .dockerignore "${APP_DIR}/.dockerignore"
fi

# Use dedicated npm configuration for container builds if available
if [[ -f .docker-npmrc ]]; then
  cp .docker-npmrc "${APP_DIR}/.npmrc"
elif [[ -f .npmrc ]]; then
  cp .npmrc "${APP_DIR}/.npmrc"
fi

if [[ -f "${CLIENT_ENV_SAMPLE}" ]]; then
  cp "${CLIENT_ENV_SAMPLE}" "${WORK_DIR}/.env.sample"
fi

cat <<'INSTRUCTIONS' > "${WORK_DIR}/BUNDLE_USAGE.txt"
Bundle-Inhalt:
- app/ … Bluesky-Client + Shared-Packages (ohne node_modules, ohne Client-Build)

Vorgehen auf dem Server:
1. Archive entpacken (z. B. unzip <bundle>.zip)
2. In das Verzeichnis app/ wechseln
3. Optional `.env.sample` kopieren und als `.env` anpassen
4. docker compose build
5. docker compose up -d

Service:
- bsky-client → Node-Container (Vite Preview, Port ${BSKY_CLIENT_PORT:-5173})

Hinweise zu Environments:
- VITE_* Variablen werden beim Build eingebunden (docker compose build).
- Dieses Bundle enthält keine `.env`. Lege auf dem Zielsystem eine `.env` an (siehe `.env.sample`).
INSTRUCTIONS

pushd "${BUNDLES_DIR}" > /dev/null
zip -r "${BUNDLE_NAME}.zip" "${BUNDLE_NAME}" > /dev/null
popd > /dev/null

echo "Bundle erstellt: ${BUNDLES_DIR}/${BUNDLE_NAME}.zip"
