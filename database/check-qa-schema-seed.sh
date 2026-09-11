#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${1:-$SCRIPT_DIR/.env.qa.local}"
if [[ "${D16_QA_ENV_LOADED:-}" != "1" ]]; then
  exec node "$SCRIPT_DIR/run-qa-env.mjs" "$ENV_FILE" bash "$0" "$ENV_FILE"
fi

echo "[qa-db-verify] Starting QA schema/seed verification"

if ! command -v mysql >/dev/null 2>&1 && command -v brew >/dev/null 2>&1; then
  MYSQL_PREFIX="$(brew --prefix mysql-client 2>/dev/null || true)"
  if [[ -n "$MYSQL_PREFIX" && -x "$MYSQL_PREFIX/bin/mysql" ]]; then
    export PATH="$MYSQL_PREFIX/bin:$PATH"
  fi
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "[qa-db-verify] ERROR: mysql client not found in PATH"
  echo "[qa-db-verify] Install a MySQL/MariaDB client first (e.g., brew install mysql-client)"
  exit 1
fi

echo "[qa-db-verify] Environment loaded safely"

required_vars=(DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD)
missing=()
for key in "${required_vars[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "[qa-db-verify] ERROR: Missing required environment variables: ${missing[*]}"
  echo "[qa-db-verify] Provide them in $ENV_FILE or export them in shell"
  exit 1
fi

if [[ "$DB_NAME" != "dinterio_d16_qa" ]]; then
  echo "[qa-db-verify] ERROR: DB_NAME must be dinterio_d16_qa for QA-only policy"
  echo "[qa-db-verify] Current DB_NAME=$DB_NAME"
  exit 1
fi

if [[ "${NODE_ENV:-qa}" != "qa" ]]; then
  echo "[qa-db-verify] ERROR: NODE_ENV must be qa for this check"
  echo "[qa-db-verify] Current NODE_ENV=${NODE_ENV:-unset}"
  exit 1
fi

mysql_host="$DB_HOST"
if [[ "$mysql_host" == "localhost" ]]; then
  mysql_host="127.0.0.1"
fi

# 1) Basic connectivity
if ! MYSQL_PWD="$DB_PASSWORD" mysql --protocol=TCP -h "$mysql_host" -P "$DB_PORT" -u "$DB_USER" -D "$DB_NAME" -e "SELECT 1 AS ok;" >/dev/null; then
  echo "[qa-db-verify] ERROR: Cannot connect to QA database (host=$mysql_host port=$DB_PORT db=$DB_NAME)"
  exit 1
fi

echo "[qa-db-verify] Connectivity OK"

# 2) Required tables exist
required_tables=(
  roles permissions role_permissions users media_assets
  organization_profile organization_locations hero_slides
  stats services service_features projects project_gallery_images
  blog_posts gallery_videos gallery_concepts gallery_concept_features audit_logs
  consultation_requests user_role_assignments mfa_methods mfa_challenges auth_sessions
  app_content app_private_details app_schema_migrations
)

missing_tables=()
for t in "${required_tables[@]}"; do
  count=$(MYSQL_PWD="$DB_PASSWORD" mysql -N -s --protocol=TCP -h "$mysql_host" -P "$DB_PORT" -u "$DB_USER" -D "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='${t}';")
  if [[ "$count" != "1" ]]; then
    missing_tables+=("$t")
  fi
done

if [[ ${#missing_tables[@]} -gt 0 ]]; then
  echo "[qa-db-verify] ERROR: Missing required tables: ${missing_tables[*]}"
  exit 1
fi

echo "[qa-db-verify] Schema tables OK"

# 3) Seed sanity checks (synthetic QA content)
read_count() {
  local query="$1"
  MYSQL_PWD="$DB_PASSWORD" mysql -N -s --protocol=TCP -h "$mysql_host" -P "$DB_PORT" -u "$DB_USER" -D "$DB_NAME" -e "$query"
}

roles_count=$(read_count "SELECT COUNT(*) FROM roles;")
perms_count=$(read_count "SELECT COUNT(*) FROM permissions;")
org_count=$(read_count "SELECT COUNT(*) FROM organization_profile;")
services_count=$(read_count "SELECT COUNT(*) FROM services;")
projects_count=$(read_count "SELECT COUNT(*) FROM projects;")
blog_count=$(read_count "SELECT COUNT(*) FROM blog_posts;")

echo "[qa-db-verify] Counts: roles=$roles_count permissions=$perms_count org=$org_count services=$services_count projects=$projects_count blog_posts=$blog_count"

if (( roles_count < 3 )); then
  echo "[qa-db-verify] ERROR: roles seed looks incomplete"
  exit 1
fi
if (( perms_count < 6 )); then
  echo "[qa-db-verify] ERROR: permissions seed looks incomplete"
  exit 1
fi
if (( org_count < 1 )); then
  echo "[qa-db-verify] ERROR: organization_profile synthetic seed missing"
  exit 1
fi
if (( services_count < 1 || projects_count < 1 || blog_count < 1 )); then
  echo "[qa-db-verify] ERROR: synthetic content seed looks incomplete"
  exit 1
fi

echo "[qa-db-verify] SUCCESS: QA schema and synthetic seed verified"
