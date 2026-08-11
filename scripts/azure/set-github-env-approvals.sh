#!/usr/bin/env bash
set -euo pipefail

# Configure GitHub environment approval gates for dev, qa, prod.
# Requires: gh CLI authenticated with repo admin access.

GITHUB_OWNER="${GITHUB_OWNER:-}"
GITHUB_REPO="${GITHUB_REPO:-}"

# Comma-separated GitHub usernames for required reviewers.
QA_REVIEWERS="${QA_REVIEWERS:-REPLACE_QA_REVIEWER_USERNAMES}"
PROD_REVIEWERS="${PROD_REVIEWERS:-REPLACE_PROD_REVIEWER_USERNAMES}"

# Optional wait timers in minutes.
QA_WAIT_TIMER="${QA_WAIT_TIMER:-0}"
PROD_WAIT_TIMER="${PROD_WAIT_TIMER:-0}"

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

if [[ "$QA_REVIEWERS" == "REPLACE_QA_REVIEWER_USERNAMES" || "$PROD_REVIEWERS" == "REPLACE_PROD_REVIEWER_USERNAMES" ]]; then
  echo "Set QA_REVIEWERS and PROD_REVIEWERS first (comma-separated usernames)."
  exit 1
fi

repo="${GITHUB_OWNER}/${GITHUB_REPO}"

ensure_environment() {
  local env_name="$1"
  gh api --method PUT "repos/${repo}/environments/${env_name}" >/dev/null
  echo "Ensured environment exists: ${env_name}"
}

build_reviewers_json() {
  local csv="$1"
  local payload="[]"

  IFS=',' read -r -a users <<< "$csv"
  for username in "${users[@]}"; do
    username="$(echo "$username" | xargs)"
    if [[ -z "$username" ]]; then
      continue
    fi

    local user_id
    user_id="$(gh api "users/${username}" --jq '.id')"

    payload="$(echo "$payload" | jq --argjson id "$user_id" '. + [{"type":"User","id":$id}]')"
  done

  echo "$payload"
}

set_protection_rule() {
  local env_name="$1"
  local wait_timer="$2"
  local reviewers_json="$3"

  local body
  body="$(jq -n \
    --argjson wait_timer "$wait_timer" \
    --argjson reviewers "$reviewers_json" \
    '{
      wait_timer: $wait_timer,
      prevent_self_review: true,
      reviewers: $reviewers,
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: false
      }
    }')"

  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "repos/${repo}/environments/${env_name}" \
    --input - <<< "$body" >/dev/null

  echo "Configured approval rule for environment: ${env_name}"
}

# Ensure environments exist first.
ensure_environment dev
ensure_environment qa
ensure_environment prod

qa_reviewers_json="$(build_reviewers_json "$QA_REVIEWERS")"
prod_reviewers_json="$(build_reviewers_json "$PROD_REVIEWERS")"

# Configure review gates.
set_protection_rule qa "$QA_WAIT_TIMER" "$qa_reviewers_json"
set_protection_rule prod "$PROD_WAIT_TIMER" "$prod_reviewers_json"

echo "Done. QA and PROD approval gates are configured."
