#!/usr/bin/env bash
set -euo pipefail

# One-time setup for GitHub Actions OIDC CI/CD (dev, qa, prod) for static Vite site.
# Requires: az CLI, jq, logged-in Azure account with RBAC permissions.

# ---------- Required inputs ----------
# Azure
SUBSCRIPTION_ID="${SUBSCRIPTION_ID:-REPLACE_SUBSCRIPTION_ID}"
LOCATION="${LOCATION:-eastus}"
RESOURCE_GROUP="${RESOURCE_GROUP:-rg-d16-shared}"

# GitHub repository identity used by federated credentials
GITHUB_OWNER="${GITHUB_OWNER:-REPLACE_GITHUB_OWNER}"
GITHUB_REPO="${GITHUB_REPO:-REPLACE_GITHUB_REPO}"

# Naming
APP_REG_NAME="${APP_REG_NAME:-d16-github-actions-oidc}"
DEV_STORAGE_ACCOUNT="${DEV_STORAGE_ACCOUNT:-d16devweb001}"
QA_STORAGE_ACCOUNT="${QA_STORAGE_ACCOUNT:-d16qaweb001}"
PROD_STORAGE_ACCOUNT="${PROD_STORAGE_ACCOUNT:-d16prodweb001}"

# ---------- Prereq checks ----------
command -v az >/dev/null 2>&1 || { echo "az CLI is required"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required"; exit 1; }

if [[ "$SUBSCRIPTION_ID" == "REPLACE_SUBSCRIPTION_ID" || "$GITHUB_OWNER" == "REPLACE_GITHUB_OWNER" || "$GITHUB_REPO" == "REPLACE_GITHUB_REPO" ]]; then
  echo "Please set SUBSCRIPTION_ID, GITHUB_OWNER, and GITHUB_REPO before running."
  exit 1
fi

az account set --subscription "$SUBSCRIPTION_ID"
TENANT_ID="$(az account show --query tenantId -o tsv)"

# ---------- Resource group ----------
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null

# ---------- Storage accounts (static website) ----------
create_storage() {
  local name="$1"
  az storage account create \
    --name "$name" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --sku Standard_LRS \
    --kind StorageV2 \
    --allow-blob-public-access false \
    --min-tls-version TLS1_2 \
    --https-only true \
    --allow-shared-key-access false >/dev/null

  az storage blob service-properties update \
    --account-name "$name" \
    --auth-mode login \
    --static-website \
    --index-document index.html \
    --404-document index.html >/dev/null
}

create_storage "$DEV_STORAGE_ACCOUNT"
create_storage "$QA_STORAGE_ACCOUNT"
create_storage "$PROD_STORAGE_ACCOUNT"

# ---------- App registration + service principal ----------
APP_JSON="$(az ad app list --display-name "$APP_REG_NAME" --query '[0]' -o json)"
if [[ "$APP_JSON" == "null" || -z "$APP_JSON" ]]; then
  APP_JSON="$(az ad app create --display-name "$APP_REG_NAME" -o json)"
fi

APP_OBJECT_ID="$(echo "$APP_JSON" | jq -r '.id')"
APP_CLIENT_ID="$(echo "$APP_JSON" | jq -r '.appId')"

SP_JSON="$(az ad sp list --filter "appId eq '$APP_CLIENT_ID'" --query '[0]' -o json)"
if [[ "$SP_JSON" == "null" || -z "$SP_JSON" ]]; then
  az ad sp create --id "$APP_CLIENT_ID" >/dev/null
fi

# ---------- Federated credentials per branch ----------
create_fic() {
  local branch="$1"
  local fic_name="gh-${branch}"
  local subject="repo:${GITHUB_OWNER}/${GITHUB_REPO}:ref:refs/heads/${branch}"

  local body
  body="$(cat <<JSON
{
  "name": "${fic_name}",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "${subject}",
  "description": "GitHub Actions branch ${branch}",
  "audiences": ["api://AzureADTokenExchange"]
}
JSON
)"

  az ad app federated-credential create --id "$APP_OBJECT_ID" --parameters "$body" >/dev/null || true
}

create_fic dev
create_fic qa
create_fic main

# ---------- RBAC role assignment ----------
assign_role() {
  local account_name="$1"
  local scope
  scope="$(az storage account show --name "$account_name" --resource-group "$RESOURCE_GROUP" --query id -o tsv)"

  az role assignment create \
    --assignee "$APP_CLIENT_ID" \
    --role "Storage Blob Data Contributor" \
    --scope "$scope" >/dev/null || true
}

assign_role "$DEV_STORAGE_ACCOUNT"
assign_role "$QA_STORAGE_ACCOUNT"
assign_role "$PROD_STORAGE_ACCOUNT"

cat <<EOF

Setup complete.

Use these GitHub Environment Secrets:

For environment: dev
- AZURE_CLIENT_ID=$APP_CLIENT_ID
- AZURE_TENANT_ID=$TENANT_ID
- AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
- AZURE_STORAGE_ACCOUNT_NAME=$DEV_STORAGE_ACCOUNT

For environment: qa
- AZURE_CLIENT_ID=$APP_CLIENT_ID
- AZURE_TENANT_ID=$TENANT_ID
- AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
- AZURE_STORAGE_ACCOUNT_NAME=$QA_STORAGE_ACCOUNT

For environment: prod
- AZURE_CLIENT_ID=$APP_CLIENT_ID
- AZURE_TENANT_ID=$TENANT_ID
- AZURE_SUBSCRIPTION_ID=$SUBSCRIPTION_ID
- AZURE_STORAGE_ACCOUNT_NAME=$PROD_STORAGE_ACCOUNT

Next:
1) In GitHub, create environments: dev, qa, prod
2) Add above secrets to each environment
3) Add approvals on qa/prod environments
4) Push to dev, qa, main branches to deploy

EOF
