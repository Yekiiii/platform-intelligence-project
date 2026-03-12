#!/usr/bin/env bash
set -euo pipefail

# Export all current local data into an idempotent SQL snapshot.
# This uses DATABASE_URL from .env and writes to migrations/004_sample_data_snapshot.sql.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_FILE="$ROOT_DIR/migrations/004_sample_data_snapshot.sql"

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "Error: .env not found at $ROOT_DIR/.env"
  exit 1
fi

set -a
source "$ROOT_DIR/.env"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set in .env"
  exit 1
fi

echo "Exporting data snapshot from DATABASE_URL to $OUT_FILE"

pg_dump \
  --dbname="$DATABASE_URL" \
  --data-only \
  --inserts \
  --column-inserts \
  --on-conflict-do-nothing \
  --no-owner \
  --no-privileges \
  --file="$OUT_FILE"

# Remove statements that may not exist on older PostgreSQL/psql versions.
sed -i '/^\\restrict /d;/^\\unrestrict /d;/^SET transaction_timeout =/d' "$OUT_FILE"

echo "Snapshot export complete: $OUT_FILE"
