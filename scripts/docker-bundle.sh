#!/usr/bin/env bash
set -euo pipefail

# Always operate from the project root, regardless of the caller's CWD
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# Standard-Bundle-Namen auf Basis des aktuellen Datums setzen
# Format: Bsky-Kamp-Bot-YYYY-MM-DD
STAMP=$(date +%F)
DEFAULT_BUNDLE_NAME="Bsky-Kamp-Bot-${STAMP}"

BUNDLE_NAME=${1:-${DEFAULT_BUNDLE_NAME}}
IMAGE_PREFIX=${2:-bsky-kampagnen-bot}
BUNDLES_DIR="dist/bundles"
WORK_DIR="${BUNDLES_DIR}/${BUNDLE_NAME}"
APP_DIR="${WORK_DIR}/app"
IMAGES_DIR="dist/docker"
IMAGE_TAR="${IMAGES_DIR}/${IMAGE_PREFIX}-images.tar"
PROJECT_CONTENT=(
  "package.json"
  "package-lock.json"
  "backend"
  "config"
  "migrations"
  "tsconfig.json"
  "tsconfig.build.json"
  "README.md"
  "LICENSE"
)

if [[ -f .env.sample ]]; then
  PROJECT_CONTENT+=(".env.sample")
fi

if [[ -f .npmrc ]]; then
  PROJECT_CONTENT+=(".npmrc")
fi

mkdir -p "${BUNDLES_DIR}"
rm -rf "${WORK_DIR}"
mkdir -p "${APP_DIR}"

echo "Bundele Backend-Basis in ${APP_DIR}" >&2
tar -cf - "${PROJECT_CONTENT[@]}" | tar -xf - -C "${APP_DIR}"

if [[ -d dashboard ]]; then
  echo "Füge Dashboard-Quellcode hinzu (ohne node_modules/dist)" >&2
  tar \
    --exclude='./dashboard/node_modules' \
    --exclude='./dashboard/dist' \
    --exclude='./dashboard/.env' \
    --exclude='./dashboard/.env.local' \
    --exclude='./dashboard/.env.dev' \
    --exclude='./dashboard/.env.prod' \
    -cf - dashboard | tar -xf - -C "${APP_DIR}"
fi

# Entferne alle node_modules-Verzeichnisse, um Bundle schlank zu halten
find "${APP_DIR}" -type d -name 'node_modules' -prune -exec rm -rf '{}' +

# Docker-Artefakte für beide Container bereitstellen
mkdir -p "${APP_DIR}/docker"
cp docker/Dockerfile.backend "${APP_DIR}/docker/Dockerfile.backend"
cp docker/Dockerfile.frontend "${APP_DIR}/docker/Dockerfile.frontend"
cp docker/nginx-frontend.conf "${APP_DIR}/docker/nginx-frontend.conf"

if [[ ! -f docker-compose.yml ]]; then
  echo "Fehlende docker-compose.yml im Projektwurzelverzeichnis" >&2
  exit 1
fi
cp docker-compose.yml "${APP_DIR}/docker-compose.yml"

# Sicherheitsnetz: Entferne versehentlich kopierte .env-Dateien auf Root-Ebene
find "${APP_DIR}" -maxdepth 1 -name '.env' -type f -delete

if [[ -f .env.sample ]]; then
  cp .env.sample "${WORK_DIR}/.env.sample"
fi

if [[ -f "${IMAGE_TAR}" ]]; then
  cp "${IMAGE_TAR}" "${WORK_DIR}/"
fi

cat <<'INSTRUCTIONS' > "${WORK_DIR}/BUNDLE_USAGE.txt"
Bundle-Inhalt:
- app/ … Backend und Dashboard (ohne node_modules, ohne Dashboard-Build)
- optional: vorhandene Image-Tarballs in dist/docker/

Vorgehen auf dem Server:
1. Archive entpacken (z. B. unzip <bundle>.zip)
2. In das Verzeichnis app/ wechseln
3. Optional `.env.sample` kopieren und als `.env` anpassen
4. docker compose build
5. docker compose up -d

Services:
- backend → Express-API & Scheduler (Port ${BACKEND_PORT:-3000})
- frontend → Nginx mit gebuildetem Dashboard (Port ${FRONTEND_PORT:-8080})

Die SQLite-Datenbank wird beim ersten Start neu angelegt (benanntes Volume `data`, Compose benennt es i. d. R. `<projekt>_data`).

Hinweise zu Environments:
- Dieses Bundle enthält keine `.env`. Lege auf dem Zielsystem eine `.env` an (siehe `.env.sample`).
- Für Entwicklung/Test eignen sich `.env.dev` mit Test‑Accounts (keine Follower), für Produktion `.env.prod` mit echten Zugangsdaten.
- Lokal kann die aktive `.env` mit `npm run switchenv:dev` bzw. `npm run switchenv:prod` umgeschaltet werden.
INSTRUCTIONS

pushd "${BUNDLES_DIR}" > /dev/null
zip -r "${BUNDLE_NAME}.zip" "${BUNDLE_NAME}" > /dev/null
popd > /dev/null

echo "Bundle erstellt: ${BUNDLES_DIR}/${BUNDLE_NAME}.zip"
if [[ -f "${IMAGE_TAR}" ]]; then
  echo "Beigefügter Image-Tarball: ${IMAGE_TAR}"
else
  echo "Hinweis: Images werden auf dem Server via 'docker compose build' erzeugt."
fi
