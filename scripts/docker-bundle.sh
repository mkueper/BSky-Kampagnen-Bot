#!/usr/bin/env bash
set -euo pipefail

BUNDLE_NAME=${1:-bsky-kampagnen-bot-bundle}
IMAGE_PREFIX=${2:-bsky-kampagnen-bot}
BUNDLES_DIR="dist/bundles"
WORK_DIR="${BUNDLES_DIR}/${BUNDLE_NAME}"
APP_DIR="${WORK_DIR}/app"
IMAGES_DIR="dist/docker"
IMAGE_TAR="${IMAGES_DIR}/${IMAGE_PREFIX}-images.tar"

mkdir -p "${BUNDLES_DIR}"
rm -rf "${WORK_DIR}"
mkdir -p "${APP_DIR}"

echo "Kopiere Projektdateien (ohne node_modules/dist) in ${APP_DIR}" >&2
tar \
  --exclude='./.git' \
  --exclude='./dist' \
  --exclude='./node_modules' \
  --exclude='./dashboard/node_modules' \
  --exclude='./data' \
  -cf - . | tar -xf - -C "${APP_DIR}"

if compgen -G "data/*.sqlite" > /dev/null; then
  mkdir -p "${APP_DIR}/data"
  cp data/*.sqlite "${APP_DIR}/data/"
fi

if [[ -f .env ]]; then
  cp .env "${WORK_DIR}/.env"
fi

if [[ -f "${IMAGE_TAR}" ]]; then
  cp "${IMAGE_TAR}" "${WORK_DIR}/"
fi

cat <<'INSTRUCTIONS' > "${WORK_DIR}/BUNDLE_USAGE.txt"
Bundle-Inhalt:
- app/ … vollständiges Projekt (ohne node_modules, dist)
- app/data/*.sqlite … aktuelle SQLite-Datenbank
- optional: vorhandene Image-Tarballs in dist/docker/

Vorgehen auf dem Server:
1. Archive entpacken (z. B. unzip <bundle>.zip)
2. In das Verzeichnis app/ wechseln
3. Optional .env anpassen oder eine neue Datei erstellen
4. docker compose build
5. docker compose up -d

Die SQLite-Datenbank wird via benanntem Volume (`bsky-kamp-app-data`) eingebunden.
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
