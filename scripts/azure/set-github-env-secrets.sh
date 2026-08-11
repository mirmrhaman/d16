#!/usr/bin/env bash
set -euo pipefail

# Sets GitHub environment secrets for dev, qa, prod using GitHub CLI.
# Requires: gh CLI authenticated with repo admin access.

GITHUB_OWNER="${GITHUB_OWNER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"

AZURE_CLIENT_ID="${AZURE_CLIENT_ID:-}"
AZURE_TENANT_ID="${AZURE_TENANT_ID:-}"
AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-}"

DEV_STORAGE_ACCOUNT="${DEV_STORAGE_ACCOUNT:-d16devweb001}"
QA_STORAGE_ACCOUNT="${QA_STORAGE_ACCOUNT:-d16qaweb001}"
PROD_STORAGE_ACCOUNT="${PROD_STORAGE_ACCOUNT:-d16prodweb001}"

command -v gh >/dev/null 2>&1 || { echo "gh CLI is required"; exit 1; }

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

if [[ -z "$GITHUB_OWNER" || -z "$GITHUB_REPO" ]]; then
  echo "Set GITHUB_OWNER and GITHUB_REPO first (or configure git origin to GitHub)."
  exit 1
fi

required=(AZURE_CLIENT_ID AZURE_TENANT_ID AZURE_SUBSCRIPTION_ID)
missing=()
for key in "${required[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    missing+=("$key")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required values: ${missing[*]}"
  echo "Export them from the output of scripts/azure/setup-cicd-oidc.sh"
  exit 1
fi

repo="${GITHUB_OWNER}/${GITHUB_REPO}"

envs=(dev qa prod)
for env_name in "${envs[@]}"; do
  gh api --method PUT "repos/${repo}/environments/${env_name}" >/dev/null
  echo "Ensured environment exists: ${env_name}"
done

set_env_secret() {
  local env_name="$1"
  local key="$2"
  local value="$3"
  gh secret set "$key" --env "$env_name" --repo "$repo" --body "$value" >/dev/null
}

for env_name in "${envs[@]}"; do
  set_env_secret "$env_name" AZURE_CLIENT_ID "$AZURE_CLIENT_ID"
  set_env_secret "$env_name" AZURE_TENANT_ID "$AZURE_TENANT_ID"
  set_env_secret "$env_name" AZURE_SUBSCRIPTION_ID "$AZURE_SUBSCRIPTION_ID"
done

set_env_secret dev AZURE_STORAGE_ACCOUNT_NAME "$DEV_STORAGE_ACCOUNT"
set_env_secret qa AZURE_STORAGE_ACCOUNT_NAME "$QA_STORAGE_ACCOUNT"
set_env_secret prod AZURE_STORAGE_ACCOUNT_NAME "$PROD_STORAGE_ACCOUNT"

echo "GitHub environment secrets configured for dev, qa, prod"
