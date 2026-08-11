# QA Database Setup (cPanel MySQL/MariaDB)

This repository is currently configured for QA-first execution.
Use only the QA database in all active testing and integration steps.
Production schema files remain committed for later rollout, but are not active now.

Use this order for an idempotent QA bootstrap.

## 1) Apply schema

Option A: phpMyAdmin
- Open QA database dinterio_d16_qa
- Import database/schema.mysql.sql

Option B: CLI
```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < database/schema.mysql.sql
```

## 2) Apply synthetic QA seed

```bash
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < database/seed.qa.synthetic.mysql.sql
```

## 3) Sanity checks

```sql
SELECT COUNT(*) AS roles_count FROM roles;
SELECT COUNT(*) AS permissions_count FROM permissions;
SELECT COUNT(*) AS services_count FROM services;
SELECT COUNT(*) AS projects_count FROM projects;
SELECT COUNT(*) AS blog_count FROM blog_posts;
SELECT COUNT(*) AS qa_org_count FROM organization_profile;
```

Quick connectivity check command:
```bash
npm run db:qa:check
```

macOS helper (install mysql client and run connectivity check):
```bash
npm run db:qa:prepare-macos
```

Full schema + synthetic seed verification:
```bash
npm run db:qa:verify
```

When DB host is localhost on cPanel, run through SSH tunnel from macOS:
```bash
npm run db:qa:tunnel-check
npm run db:qa:tunnel-verify
```

Optional custom env file path:
```bash
bash database/check-qa-connection.sh database/.env.qa.local
bash database/check-qa-schema-seed.sh database/.env.qa.local
```

## 4) Security requirements
- Keep production and QA credentials different.
- Use QA-only encryption keys.
- Never commit real passwords, tokens, or keys.
- Rotate credentials immediately if they were shared in messages, logs, or screenshots.

## 5) Active Environment Policy
- Active environment now: QA only.
- Use DB_NAME=dinterio_d16_qa and QA credentials only in runtime.
- Do not point app runtime to production until explicit release approval.
- Keep production SQL files committed for future deployment.

## 6) Notes
- This QA seed intentionally avoids real personal data.
- Confidential *_ciphertext fields are left for app-driven encrypted test inserts.
- If QA DB host is `localhost` on cPanel, it is local to the cPanel server, not your laptop.
- From local macOS, use one of these approaches:
	- Run verification commands on cPanel terminal/SSH session directly.
	- Or create an SSH tunnel and point DB_HOST to 127.0.0.1 with tunneled local port.
- For tunnel mode, set these in your local env file:
	- QA_SSH_HOST, QA_SSH_USER, QA_SSH_PORT
	- QA_REMOTE_DB_HOST, QA_REMOTE_DB_PORT, QA_LOCAL_FORWARD_PORT

## 7) Troubleshooting (Local to cPanel)
- If `npm run db:qa:tunnel-check` shows `ssh: connect to host ... port 22: Connection refused`, SSH is not reachable from your network.
- Enable SSH access in cPanel hosting settings (or ask hosting support to allow SSH on port 22 for your account/IP).
- If SSH cannot be enabled, run checks inside cPanel Terminal instead:
```bash
npm run db:qa:check
npm run db:qa:verify
```
- If direct MySQL access from local macOS is required, hosting support must allow remote MySQL access and your client IP.

## 8) API Backend Validation (Local)
- Start API server (QA mode only):
```bash
npm run dev:api
```
- Check API health:
```bash
curl http://localhost:8787/api/health
```
- Expected success response:
```json
{"ok":true,"service":"d16-api"}
```

If you get:
```json
{"ok":false,"error":"Database connection failed"}
```
then the API is running but cannot reach MySQL.

Common causes:
- DB_HOST is localhost but no local MySQL server is running.
- SSH tunnel is not established.
- SSH to hosting is blocked (for example: connection refused on port 22).

Recommended local settings for tunnel mode:
- DB_HOST=127.0.0.1
- DB_PORT=<local forwarded port, e.g. 13306>

Frontend note:
- The React client still falls back to local mock data when API calls fail, so UI remains usable while DB connectivity is being fixed.
