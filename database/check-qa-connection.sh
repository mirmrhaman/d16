#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ENV_FILE="${1:-$SCRIPT_DIR/.env.qa.local}"
if [[ "${D16_QA_ENV_LOADED:-}" != "1" ]]; then
  exec node "$SCRIPT_DIR/run-qa-env.mjs" "$ENV_FILE" bash "$0" "$ENV_FILE"
fi

echo "[qa-db-check] Starting QA database connectivity check"

if ! command -v mysql >/dev/null 2>&1 && command -v brew >/dev/null 2>&1; then
  MYSQL_PREFIX="$(brew --prefix mysql-client 2>/dev/null || true)"
  if [[ -n "$MYSQL_PREFIX" && -x "$MYSQL_PREFIX/bin/mysql" ]]; then
    export PATH="$MYSQL_PREFIX/bin:$PATH"
  fi
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "[qa-db-check] ERROR: mysql client not found in PATH"
  echo "[qa-db-check] Install a MySQL/MariaDB client first (e.g., brew install mysql-client)"
  exit 1
fi

echo "[qa-db-check] Environment loaded safely"

required_vars=(DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD)
missing=()
for key in "${required_vars[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "[qa-db-check] ERROR: Missing required environment variables: ${missing[*]}"
  echo "[qa-db-check] Provide them in $ENV_FILE or export them in shell"
  exit 1
fi

if [[ "$DB_NAME" != "dinterio_d16_qa" ]]; then
  echo "[qa-db-check] ERROR: DB_NAME must be dinterio_d16_qa for QA-only policy"
  echo "[qa-db-check] Current DB_NAME=$DB_NAME"
  exit 1
fi

if [[ "${NODE_ENV:-qa}" != "qa" ]]; then
  echo "[qa-db-check] ERROR: NODE_ENV must be qa for this check"
  echo "[qa-db-check] Current NODE_ENV=${NODE_ENV:-unset}"
  exit 1
fi

mysql_host="$DB_HOST"
if [[ "$mysql_host" == "localhost" ]]; then
  mysql_host="127.0.0.1"
fi

query="SELECT DATABASE() AS db_name, UTC_TIMESTAMP() AS utc_now, 1 AS ok;"

if MYSQL_PWD="$DB_PASSWORD" mysql --connect-timeout=10 --protocol=TCP -h "$mysql_host" -P "$DB_PORT" -u "$DB_USER" -D "$DB_NAME" -e "$query"; then
  echo "[qa-db-check] SUCCESS: QA database connection is healthy"
else
  echo "[qa-db-check] ERROR: Connection failed (host=$mysql_host port=$DB_PORT db=$DB_NAME)"
  exit 1
fi
