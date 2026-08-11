#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[qa-db-prepare] ERROR: This helper is for macOS only"
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "[qa-db-prepare] ERROR: Homebrew is not installed"
  echo "[qa-db-prepare] Install Homebrew first: https://brew.sh"
  exit 1
fi

install_requested="false"
run_check_after="true"
for arg in "$@"; do
  case "$arg" in
    --no-check)
      run_check_after="false"
      ;;
    --install)
      install_requested="true"
      ;;
    *)
      ;;
  esac
done

mysql_bin_state="missing"
if command -v mysql >/dev/null 2>&1; then
  mysql_bin_state="present"
fi

echo "[qa-db-prepare] mysql_client_before=$mysql_bin_state"

if [[ "$mysql_bin_state" == "missing" ]]; then
  echo "[qa-db-prepare] mysql client not found in PATH"

  if [[ "$install_requested" == "true" ]]; then
    echo "[qa-db-prepare] Installing mysql-client via Homebrew"
    brew list mysql-client >/dev/null 2>&1 || brew install mysql-client
  else
    echo "[qa-db-prepare] Re-run with --install to install automatically"
  fi
fi

MYSQL_PREFIX="$(brew --prefix mysql-client 2>/dev/null || true)"
if [[ -n "$MYSQL_PREFIX" && -x "$MYSQL_PREFIX/bin/mysql" ]]; then
  export PATH="$MYSQL_PREFIX/bin:$PATH"
fi

if command -v mysql >/dev/null 2>&1; then
  echo "[qa-db-prepare] mysql_client_after=present"
  echo "[qa-db-prepare] mysql_version=$(mysql --version | head -n 1)"
else
  echo "[qa-db-prepare] mysql_client_after=missing"
fi

if [[ -n "$MYSQL_PREFIX" ]]; then
  echo "[qa-db-prepare] To persist PATH, add to your shell profile:"
  echo "export PATH=\"$MYSQL_PREFIX/bin:\$PATH\""
fi

if [[ "$run_check_after" == "true" ]]; then
  echo "[qa-db-prepare] Running QA DB connectivity check"
  bash "$SCRIPT_DIR/check-qa-connection.sh"
fi
