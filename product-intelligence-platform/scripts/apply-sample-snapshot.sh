#!/usr/bin/env bash
set -euo pipefail

# Apply local sample snapshot to whichever database DATABASE_URL points to.
# Intended for EC2 use after pulling this repository.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT_FILE="$ROOT_DIR/migrations/004_sample_data_snapshot.sql"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "Error: .env not found at $ROOT_DIR/.env"
  exit 1
fi

if [[ ! -f "$SNAPSHOT_FILE" ]]; then
  echo "Error: snapshot SQL file not found at $SNAPSHOT_FILE"
  exit 1
fi

# Load env vars from .env
set -a
source "$ROOT_DIR/.env"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set in .env"
  exit 1
fi

echo "Applying snapshot file: $SNAPSHOT_FILE"
echo "Target database: ${DATABASE_URL%@*}@***"

# ON_ERROR_STOP ensures import fails fast on SQL errors
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SNAPSHOT_FILE"

echo "Snapshot import complete."
