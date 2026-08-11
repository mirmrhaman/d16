#!/usr/bin/env bash
set -euo pipefail

# End-to-end CI/CD bootstrap for this repository:
# 1) Azure OIDC bootstrap (app reg, federated credentials, storage, RBAC)
# 2) GitHub environment secrets setup (dev, qa, prod)
# 3) GitHub environment approval setup (qa, prod)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Required inputs
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-}"
GITHUB_OWNER="${GITHUB_OWNER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"
QA_REVIEWERS="${QA_REVIEWERS:-}"
PROD_REVIEWERS="${PROD_REVIEWERS:-}"

# Optional inputs
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-d16-shared}"
LOCATION="${LOCATION:-eastus}"
DEV_STORAGE_ACCOUNT="${DEV_STORAGE_ACCOUNT:-d16devweb001}"
QA_STORAGE_ACCOUNT="${QA_STORAGE_ACCOUNT:-d16qaweb001}"
PROD_STORAGE_ACCOUNT="${PROD_STORAGE_ACCOUNT:-d16prodweb001}"
APP_REG_NAME="${APP_REG_NAME:-d16-github-actions-oidc}"
QA_WAIT_TIMER="${QA_WAIT_TIMER:-0}"
PROD_WAIT_TIMER="${PROD_WAIT_TIMER:-0}"

detect_repo() {
  local remote url slug

  if remote="$(git remote get-url origin 2>/dev/null)"; then
    url="$remote"
    if [[ "$url" =~ ^git@github.com:(.+)\\.git$ ]]; then
      slug="${BASH_REMATCH[1]}"
    elif [[ "$url" =~ ^https://github.com/(.+)\\.git$ ]]; then
      slug="${BASH_REMATCH[1]}"
    elif [[ "$url" =~ ^https://github.com/(.+)$ ]]; then
      slug="${BASH_REMATCH[1]}"
    fi

    if [[ -n "${slug:-}" ]]; then
      GITHUB_OWNER="${slug%%/*}"
      GITHUB_REPO="${slug##*/}"
      return
    fi
  fi

  if gh auth status >/dev/null 2>&1; then
    slug="$(gh repo view --json name,owner --jq '.owner.login + "/" + .name' 2>/dev/null || true)"
    if [[ -n "$slug" ]]; then
      GITHUB_OWNER="${slug%%/*}"
      GITHUB_REPO="${slug##*/}"
    fi
  fi
}

if [[ -z "$GITHUB_OWNER" || -z "$GITHUB_REPO" ]]; then
  detect_repo
fi

required=(SUBSCRIPTION_ID QA_REVIEWERS PROD_REVIEWERS)
missing=()
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done

if [[ -z "$GITHUB_OWNER" || -z "$GITHUB_REPO" ]]; then
  missing+=("GITHUB_OWNER" "GITHUB_REPO")
fi

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required environment variables: ${missing[*]}"
  echo "Required: SUBSCRIPTION_ID QA_REVIEWERS PROD_REVIEWERS"
  echo "Also required: GITHUB_OWNER and GITHUB_REPO (or configure git origin to GitHub)."
  exit 1
fi

command -v az >/dev/null 2>&1 || { echo "az CLI is required"; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "gh CLI is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required"; exit 1; }

az account show >/dev/null 2>&1 || {
  echo "Azure login required. Run: az login"
  exit 1
}

gh auth status >/dev/null 2>&1 || {
  echo "GitHub login required. Run: gh auth login"
  exit 1
}

bootstrap_log="$(mktemp)"
cleanup() {
  rm -f "$bootstrap_log"
}
trap cleanup EXIT

echo "[bootstrap-all] Step 1/3: Azure OIDC bootstrap"
(
  cd "$ROOT_DIR"
  SUBSCRIPTION_ID="$SUBSCRIPTION_ID" \
  GITHUB_OWNER="$GITHUB_OWNER" \
  GITHUB_REPO="$GITHUB_REPO" \
  RESOURCE_GROUP="$RESOURCE_GROUP" \
  LOCATION="$LOCATION" \
  DEV_STORAGE_ACCOUNT="$DEV_STORAGE_ACCOUNT" \
  QA_STORAGE_ACCOUNT="$QA_STORAGE_ACCOUNT" \
  PROD_STORAGE_ACCOUNT="$PROD_STORAGE_ACCOUNT" \
  APP_REG_NAME="$APP_REG_NAME" \
  bash scripts/azure/setup-cicd-oidc.sh
) | tee "$bootstrap_log"

AZURE_CLIENT_ID="$(grep -E '^- AZURE_CLIENT_ID=' "$bootstrap_log" | head -n 1 | sed 's/^- AZURE_CLIENT_ID=//')"
AZURE_TENANT_ID="$(grep -E '^- AZURE_TENANT_ID=' "$bootstrap_log" | head -n 1 | sed 's/^- AZURE_TENANT_ID=//')"

if [[ -z "$AZURE_CLIENT_ID" || -z "$AZURE_TENANT_ID" ]]; then
  echo "Failed to parse AZURE_CLIENT_ID or AZURE_TENANT_ID from bootstrap output"
  exit 1
fi

echo "[bootstrap-all] Step 2/3: GitHub environment secrets"
(
  cd "$ROOT_DIR"
  GITHUB_OWNER="$GITHUB_OWNER" \
  GITHUB_REPO="$GITHUB_REPO" \
  AZURE_CLIENT_ID="$AZURE_CLIENT_ID" \
  AZURE_TENANT_ID="$AZURE_TENANT_ID" \
  AZURE_SUBSCRIPTION_ID="$SUBSCRIPTION_ID" \
  DEV_STORAGE_ACCOUNT="$DEV_STORAGE_ACCOUNT" \
  QA_STORAGE_ACCOUNT="$QA_STORAGE_ACCOUNT" \
  PROD_STORAGE_ACCOUNT="$PROD_STORAGE_ACCOUNT" \
  bash scripts/azure/set-github-env-secrets.sh
)

echo "[bootstrap-all] Step 3/3: GitHub approval gates"
(
  cd "$ROOT_DIR"
  GITHUB_OWNER="$GITHUB_OWNER" \
  GITHUB_REPO="$GITHUB_REPO" \
  QA_REVIEWERS="$QA_REVIEWERS" \
  PROD_REVIEWERS="$PROD_REVIEWERS" \
  QA_WAIT_TIMER="$QA_WAIT_TIMER" \
  PROD_WAIT_TIMER="$PROD_WAIT_TIMER" \
  bash scripts/azure/set-github-env-approvals.sh
)

echo "[bootstrap-all] COMPLETE"
