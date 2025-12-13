#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_CMD="${COMPOSE_CMD:-docker compose}"
CONTAINER="${CONTAINER:-backend}"

echo "Running production migrations inside ${CONTAINER} container..."
$COMPOSE_CMD -f docker-compose.yml exec "$CONTAINER" sh -c 'NODE_ENV=production npx sequelize db:migrate'
echo "Migrations finished."
