# Azure CI/CD Setup (dev, qa, prod)

This repository now includes a GitHub Actions workflow:
- .github/workflows/azure-static-cicd.yml

It builds the Vite app once and deploys by branch:
- dev branch -> dev environment
- qa branch -> qa environment
- main branch -> prod environment

## 1) Prerequisites

1. Azure subscription with 3 storage accounts (one per environment) enabled for static website hosting:
- d16devwebxxxx
- d16qawebxxxx
- d16prodwebxxxx

2. Microsoft Entra app registration (service principal) with federated credentials for GitHub OIDC.

3. RBAC role assignment on each target storage account:
- Storage Blob Data Contributor

4. Local tools for bootstrap command flow:
- Azure CLI (`az`)
- `jq`

## 1.1 One-command bootstrap

Use the generated script to create app registration, federated credentials, storage targets, and RBAC:

```bash
SUBSCRIPTION_ID="<your-subscription-id>" \
GITHUB_OWNER="<your-github-owner>" \
GITHUB_REPO="<your-repo-name>" \
RESOURCE_GROUP="rg-d16-shared" \
LOCATION="eastus" \
DEV_STORAGE_ACCOUNT="d16devweb001" \
QA_STORAGE_ACCOUNT="d16qaweb001" \
PROD_STORAGE_ACCOUNT="d16prodweb001" \
bash scripts/azure/setup-cicd-oidc.sh
```

The script prints the exact secret values you must copy into GitHub environments (`dev`, `qa`, `prod`).

## 1.2 Auto-create GitHub environments and secrets

After running the Azure bootstrap script, you can set all GitHub environment secrets in one step:

```bash
GITHUB_OWNER="<your-github-owner>" \
GITHUB_REPO="<your-repo-name>" \
AZURE_CLIENT_ID="<from-bootstrap-output>" \
AZURE_TENANT_ID="<from-bootstrap-output>" \
AZURE_SUBSCRIPTION_ID="<from-bootstrap-output>" \
DEV_STORAGE_ACCOUNT="d16devweb001" \
QA_STORAGE_ACCOUNT="d16qaweb001" \
PROD_STORAGE_ACCOUNT="d16prodweb001" \
bash scripts/azure/set-github-env-secrets.sh
```

This command ensures `dev`, `qa`, and `prod` GitHub environments exist and sets:
- AZURE_CLIENT_ID
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID
- AZURE_STORAGE_ACCOUNT_NAME (environment-specific)

Prerequisite:
- Authenticate GitHub CLI first: `gh auth login`

## 1.3 Configure QA and PROD approvals automatically

Use this script to enforce manual approvals for QA and PROD deployments:

```bash
GITHUB_OWNER="<your-github-owner>" \
GITHUB_REPO="<your-repo-name>" \
QA_REVIEWERS="qa-reviewer-username" \
PROD_REVIEWERS="prod-reviewer-1,prod-reviewer-2" \
QA_WAIT_TIMER="0" \
PROD_WAIT_TIMER="0" \
bash scripts/azure/set-github-env-approvals.sh
```

Notes:
- `QA_REVIEWERS` and `PROD_REVIEWERS` are comma-separated GitHub usernames.
- The script resolves usernames to GitHub user IDs and updates environment protection rules.
- `dev` remains without required reviewers, while `qa` and `prod` require approval.

## 1.4 One-command end-to-end bootstrap

If you want to run all setup stages together (Azure + GitHub secrets + approvals):

```bash
SUBSCRIPTION_ID="<your-subscription-id>" \
GITHUB_OWNER="<your-github-owner>" \
GITHUB_REPO="<your-repo-name>" \
QA_REVIEWERS="qa-reviewer-username" \
PROD_REVIEWERS="prod-reviewer-1,prod-reviewer-2" \
RESOURCE_GROUP="rg-d16-shared" \
LOCATION="eastus" \
DEV_STORAGE_ACCOUNT="d16devweb001" \
QA_STORAGE_ACCOUNT="d16qaweb001" \
PROD_STORAGE_ACCOUNT="d16prodweb001" \
QA_WAIT_TIMER="0" \
PROD_WAIT_TIMER="0" \
bash scripts/azure/bootstrap-all-cicd.sh
```

This orchestration script executes:
1. `scripts/azure/setup-cicd-oidc.sh`
2. `scripts/azure/set-github-env-secrets.sh`
3. `scripts/azure/set-github-env-approvals.sh`

## 2) Configure GitHub Environments

Create GitHub environments in your repository:
- dev
- qa
- prod

For each environment, add these secrets:
- AZURE_CLIENT_ID
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID
- AZURE_STORAGE_ACCOUNT_NAME

Recommended protections:
- dev: no approval required
- qa: require 1 reviewer
- prod: require 1-2 reviewers

## 3) Configure Federated Credentials (OIDC)

In your Entra app registration, create federated credentials for this repository and branch refs:
- refs/heads/dev
- refs/heads/qa
- refs/heads/main

Use issuer:
- https://token.actions.githubusercontent.com

And subject format:
- repo:<org-or-user>/<repo>:ref:refs/heads/<branch>

## 4) Branch Strategy

- Push to dev branch to deploy DEV
- Push to qa branch to deploy QA
- Push to main branch to deploy PROD

## 5) First-time Validation

1. Push a small commit to dev and verify workflow succeeds.
2. Open the dev storage static site endpoint and verify app loads.
3. Repeat for qa and main.

## 6) Optional Hardening

- Add Azure CDN or Front Door for custom domain + HTTPS rules.
- Add post-deploy smoke tests for each environment URL.
- Add Infrastructure as Code (Bicep) under infra/ for repeatable storage and role setup.

## 7) Known Note about Local Azure Tooling

In this coding session, Azure MCP resource listing could not authenticate due local credential chain issues.
Pipeline generation is complete and does not depend on local CLI installation because deployment runs inside GitHub Actions using OIDC secrets.
