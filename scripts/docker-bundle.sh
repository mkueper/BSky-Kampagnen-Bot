#!/bin/bash
set -eu
set -o pipefail 2>/dev/null || true

# Always operate from the project root, regardless of the caller's CWD
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

# Standard-Bundle-Namen auf Basis des aktuellen Datums setzen
# Format: Bsky-Kamp-Tool-YYYY-MM-DD
STAMP=$(date +%F)
DEFAULT_BUNDLE_NAME="Bsky-Kamp-Tool-${STAMP}"

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
  "packages/shared-ui"
  "packages/media-pickers"
  "packages/shared-logic"
  "tsconfig.json"
  "tsconfig.build.json"
  "README.md"
  "LICENSE"
)

if [[ -f .env.sample ]]; then
  PROJECT_CONTENT+=(".env.sample")
fi

mkdir -p "${BUNDLES_DIR}"
rm -rf "${WORK_DIR}"
mkdir -p "${APP_DIR}"

echo "Bundele Backend-Basis in ${APP_DIR}" >&2
tar -cf - "${PROJECT_CONTENT[@]}" | tar -xf - -C "${APP_DIR}"
cp scripts/docker-migrate-prod.sh "${WORK_DIR}/docker-migrate-prod.sh"

# medias-pickers: node_modules entfernen, da lokale Symlink-Struktur sonst unnötig groß ist
if [[ -d "${APP_DIR}/packages/media-pickers/node_modules" ]]; then
  rm -rf "${APP_DIR}/packages/media-pickers/node_modules"
fi

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
cp docker/nginx-frontend.conf.template "${APP_DIR}/docker/nginx-frontend.conf.template"

if [[ ! -f docker-compose.yml ]]; then
  echo "Fehlende docker-compose.yml im Projektwurzelverzeichnis" >&2
  exit 1
fi
cp docker-compose.yml "${APP_DIR}/docker-compose.yml"

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

# Sicherheitsnetz: Entferne versehentlich kopierte .env-Dateien auf Root-Ebene
find "${APP_DIR}" -maxdepth 1 -name '.env' -type f -delete

if [[ -f .env.sample ]]; then
  cp .env.sample "${WORK_DIR}/.env.sample"
fi

if [[ -f "${IMAGE_TAR}" ]]; then
  cp "${IMAGE_TAR}" "${WORK_DIR}/"
fi

cat <<'SETUP' > "${WORK_DIR}/setup-kampagnen-tool.sh"
#!/bin/bash
set -eu
set -o pipefail 2>/dev/null || true

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${SCRIPT_DIR}/app"
ENV_FILE="${SCRIPT_DIR}/.env"
SAMPLE_FILE="${SCRIPT_DIR}/.env.sample"

echo "=== Kampagnen-Tool Setup (Docker) ==="
echo

if [[ ! -d "${APP_DIR}" ]]; then
  echo "Fehler: app/-Verzeichnis nicht gefunden. Bitte im entpackten Bundle ausführen." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Fehler: Docker wird benötigt, ist aber nicht installiert oder nicht im PATH." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "Fehler: Weder 'docker compose' noch 'docker-compose' gefunden." >&2
  exit 1
fi

if [[ -f "${ENV_FILE}" ]]; then
  echo ".env existiert bereits."
  read -r -p "Vorhandene .env unverändert verwenden? [J/n] " KEEP_ENV
  KEEP_ENV=${KEEP_ENV:-J}
  if [[ "${KEEP_ENV}" = "J" || "${KEEP_ENV}" = "j" ]]; then
    echo "Verwende bestehende .env ohne Änderungen."
  else
    echo "Bestehende .env wird aktualisiert."
  fi
else
  if [[ -f "${SAMPLE_FILE}" ]]; then
    echo "Erzeuge neue .env auf Basis von .env.sample"
    cp "${SAMPLE_FILE}" "${ENV_FILE}"
  else
    echo "Erzeuge neue .env"
    touch "${ENV_FILE}"
  fi
fi

update_or_append() {
  local key="$1"
  local value="$2"

  if [[ -z "${value}" ]]; then
    return 0
  fi

  if grep -qE "^${key}=" "${ENV_FILE}" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    printf '\n%s=%s\n' "${key}" "${value}" >> "${ENV_FILE}"
  fi
}

echo
echo "--- Basis-Konfiguration ---"
read -r -p "Bluesky Server URL [https://bsky.social]: " BSKY_URL
BSKY_URL=${BSKY_URL:-https://bsky.social}
read -r -p "Bluesky Identifier (Handle/E-Mail): " BSKY_IDENT
read -r -s -p "Bluesky App Password: " BSKY_APP_PW
echo
read -r -p "Admin-Benutzername [admin]: " AUTH_USER
AUTH_USER=${AUTH_USER:-admin}

echo
echo "--- Admin-Passwort für Dashboard/API ---"
while true; do
  read -r -s -p "Passwort eingeben: " AUTH_PW_1
  echo
  read -r -s -p "Passwort wiederholen: " AUTH_PW_2
  echo
  if [[ -z "${AUTH_PW_1}" ]]; then
    echo "Passwort darf nicht leer sein."
    continue
  fi
  if [[ "${AUTH_PW_1}" != "${AUTH_PW_2}" ]]; then
    echo "Passwörter stimmen nicht überein – bitte erneut versuchen."
    continue
  fi
  AUTH_PW="${AUTH_PW_1}"
  unset AUTH_PW_1 AUTH_PW_2
  break
done

echo
read -r -p "AUTH_TOKEN_SECRET automatisch generieren? [J/n] " GEN_SECRET
GEN_SECRET=${GEN_SECRET:-J}
if [[ "${GEN_SECRET}" = "J" || "${GEN_SECRET}" = "j" ]]; then
  if command -v openssl >/dev/null 2>&1; then
    AUTH_TOKEN_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
  else
    AUTH_TOKEN_SECRET="$(head -c 32 /dev/urandom | base64 | tr -d '\n' | head -c 43)"
  fi
  echo "AUTH_TOKEN_SECRET wurde generiert."
else
  read -r -p "AUTH_TOKEN_SECRET manuell eingeben: " AUTH_TOKEN_SECRET
fi

echo
echo "Erzeuge Passwort-Hash über Backend-Container (dies kann den ersten Build auslösen)…"
pushd "${APP_DIR}" > /dev/null
HASH_OUTPUT=$(${COMPOSE_CMD} run --rm backend node scripts/hashPassword.js "${AUTH_PW}" 2>/dev/null || true)
popd > /dev/null

AUTH_HASH="$(echo "${HASH_OUTPUT}" | tail -n1 | tr -d '\r\n')"
if [[ -z "${AUTH_HASH}" ]]; then
  echo "Fehler: Konnte Passwort-Hash nicht erzeugen. Ausgabe war:"
  echo "${HASH_OUTPUT}"
  exit 1
fi

update_or_append "BLUESKY_SERVER_URL" "${BSKY_URL}"
update_or_append "BLUESKY_IDENTIFIER" "${BSKY_IDENT}"
update_or_append "BLUESKY_APP_PASSWORD" "${BSKY_APP_PW}"
update_or_append "AUTH_USERNAME" "${AUTH_USER}"
update_or_append "AUTH_PASSWORD_HASH" "${AUTH_HASH}"
update_or_append "AUTH_TOKEN_SECRET" "${AUTH_TOKEN_SECRET}"

echo
echo "Konfiguration in .env aktualisiert."
echo
echo "--- Starte Container & führe Migrationen aus ---"
pushd "${APP_DIR}" > /dev/null
${COMPOSE_CMD} up -d
${COMPOSE_CMD} exec backend npm run migrate:prod
popd > /dev/null

echo
echo "Setup abgeschlossen."
echo "Backend und Dashboard sollten jetzt über die in .env konfigurierten Ports erreichbar sein."
echo "Zum Anpassen der Konfiguration kannst du die Datei .env im Bundle-Verzeichnis bearbeiten."

SETUP
chmod +x "${WORK_DIR}/setup-kampagnen-tool.sh"

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
