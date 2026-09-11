#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-$SCRIPT_DIR/.env.qa.local}"
MODE="${2:-verify}"
if [[ "${D16_QA_ENV_LOADED:-}" != "1" ]]; then
  exec node "$SCRIPT_DIR/run-qa-env.mjs" "$ENV_FILE" bash "$0" "$ENV_FILE" "$MODE"
fi

echo "[qa-db-tunnel] Starting QA check via SSH tunnel"

echo "[qa-db-tunnel] Environment loaded safely"

required_vars=(DB_NAME DB_USER DB_PASSWORD)
missing=()
for key in "${required_vars[@]}"; do
	if [[ -z "${!key:-}" ]]; then
		missing+=("$key")
	fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
	echo "[qa-db-tunnel] ERROR: Missing required environment variables: ${missing[*]}"
	exit 1
fi

if [[ "$DB_NAME" != "dinterio_d16_qa" ]]; then
	echo "[qa-db-tunnel] ERROR: DB_NAME must be dinterio_d16_qa for QA-only policy"
	echo "[qa-db-tunnel] Current DB_NAME=$DB_NAME"
	exit 1
fi

if [[ "${NODE_ENV:-qa}" != "qa" ]]; then
	echo "[qa-db-tunnel] ERROR: NODE_ENV must be qa for this check"
	echo "[qa-db-tunnel] Current NODE_ENV=${NODE_ENV:-unset}"
	exit 1
fi

if ! command -v ssh >/dev/null 2>&1; then
	echo "[qa-db-tunnel] ERROR: ssh client not found"
	exit 1
fi

QA_SSH_HOST="${QA_SSH_HOST:-}"
QA_SSH_USER="${QA_SSH_USER:-}"
QA_SSH_PORT="${QA_SSH_PORT:-22}"
QA_REMOTE_DB_HOST="${QA_REMOTE_DB_HOST:-localhost}"
QA_REMOTE_DB_PORT="${QA_REMOTE_DB_PORT:-${DB_PORT:-3306}}"
QA_LOCAL_FORWARD_PORT="${QA_LOCAL_FORWARD_PORT:-13306}"

missing_ssh=()
if [[ -z "$QA_SSH_HOST" ]]; then
	missing_ssh+=("QA_SSH_HOST")
fi
if [[ -z "$QA_SSH_USER" ]]; then
	missing_ssh+=("QA_SSH_USER")
fi

if [[ ${#missing_ssh[@]} -gt 0 ]]; then
	echo "[qa-db-tunnel] ERROR: Missing required SSH variables: ${missing_ssh[*]}"
	echo "[qa-db-tunnel] Example: QA_SSH_HOST=server.example.com, QA_SSH_USER=cpaneluser"
	exit 1
fi

if [[ "$MODE" != "check" && "$MODE" != "verify" ]]; then
	echo "[qa-db-tunnel] ERROR: mode must be 'check' or 'verify'"
	echo "[qa-db-tunnel] Usage: bash database/check-qa-via-ssh-tunnel.sh [env-file] [check|verify]"
	exit 1
fi

SSH_PID=""
SSH_LOG="$(mktemp)"

cleanup() {
	if [[ -n "$SSH_PID" ]] && kill -0 "$SSH_PID" >/dev/null 2>&1; then
		kill "$SSH_PID" >/dev/null 2>&1 || true
		wait "$SSH_PID" >/dev/null 2>&1 || true
	fi
	rm -f "$SSH_LOG"
}
trap cleanup EXIT INT TERM

echo "[qa-db-tunnel] Opening SSH tunnel: 127.0.0.1:$QA_LOCAL_FORWARD_PORT -> $QA_REMOTE_DB_HOST:$QA_REMOTE_DB_PORT via $QA_SSH_USER@$QA_SSH_HOST:$QA_SSH_PORT"
ssh -p "$QA_SSH_PORT" \
	-o ExitOnForwardFailure=yes \
	-o ConnectTimeout=10 \
	-o ServerAliveInterval=30 \
	-L "127.0.0.1:${QA_LOCAL_FORWARD_PORT}:${QA_REMOTE_DB_HOST}:${QA_REMOTE_DB_PORT}" \
	"${QA_SSH_USER}@${QA_SSH_HOST}" \
	-N >"$SSH_LOG" 2>&1 &
SSH_PID="$!"

tunnel_ready="false"
for _ in {1..12}; do
	if ! kill -0 "$SSH_PID" >/dev/null 2>&1; then
		break
	fi
	if command -v nc >/dev/null 2>&1 && nc -z 127.0.0.1 "$QA_LOCAL_FORWARD_PORT" >/dev/null 2>&1; then
		tunnel_ready="true"
		break
	fi
	sleep 0.5
done

if [[ "$tunnel_ready" != "true" ]]; then
	echo "[qa-db-tunnel] ERROR: SSH tunnel did not become ready on 127.0.0.1:$QA_LOCAL_FORWARD_PORT"
	if [[ -s "$SSH_LOG" ]]; then
		echo "[qa-db-tunnel] SSH details:"
		sed -n '1,40p' "$SSH_LOG"
	else
		echo "[qa-db-tunnel] SSH details: no output captured"
	fi
	exit 1
fi

echo "[qa-db-tunnel] SSH tunnel is ready"

if [[ "$MODE" == "check" ]]; then
	DB_HOST=127.0.0.1 DB_PORT="$QA_LOCAL_FORWARD_PORT" NODE_ENV=qa bash "$SCRIPT_DIR/check-qa-connection.sh" -
else
	DB_HOST=127.0.0.1 DB_PORT="$QA_LOCAL_FORWARD_PORT" NODE_ENV=qa bash "$SCRIPT_DIR/check-qa-schema-seed.sh" -
fi

echo "[qa-db-tunnel] SUCCESS: Completed QA $MODE via SSH tunnel"
