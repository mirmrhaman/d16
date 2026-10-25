# QA setup — synchronized project

Do not apply these steps to production. The API deliberately permits only `dinterio_d16_qa` and rejects `NODE_ENV=production`.

## 1. Hosting prerequisites

Confirm the hosting plan can run this Node.js/Express API with a persistent upload directory. A static Netlify upload alone cannot run the current backend.

Use same-origin HTTPS routing: the browser calls `/api`, which is routed to the Node process. Keep MySQL private. On the hosting server `DB_HOST=localhost` means that server; on a Mac it means the Mac. Use a provider-approved SSH tunnel or verified TLS database connection if running the API elsewhere. SSH may use a provider-specific port; do not assume port 22 is enabled.

Cross-site cookie authentication is intentionally not enabled. A separate API hostname must be same-site and correctly configured, or exposed through a reviewed same-origin reverse proxy.

For DianaHost cPanel, the approved QA hostname is `qa.d16interior.com`; its separate document root is `/home/dinterio/qa.d16interior.com`. HTTPS has been provisioned. The hostname alone is not the running QA application. Use cPanel's **Application Manager** (Passenger) if available, with Node.js 22, application URL `https://qa.d16interior.com/`, application root in the account home directory (not inside the public document root), startup file `app.js`, and production dependencies installed from `package-lock.json`. `app.js` serves the built `dist/` site and `/api` from one HTTPS origin. Let Passenger provide `PORT`; leave `D16_BIND_HOST` unset for Passenger. If Application Manager or environment-variable support is missing, ask DianaHost support whether Passenger Node.js apps and app environment variables are enabled on the plan.

Do not enable client testing until `/api/health` reports HTTP 200 with QA database mode, the static directory listing is gone, sign-in works over HTTPS, and a test record has been confirmed in QA. The GitHub Pages client preview remains demo-only and is not the hosted persistent QA environment.

## 2. Back up QA, then prepare schema

Export the existing QA database first. In phpMyAdmin, explicitly select `dinterio_d16_qa`.

For an EMPTY QA database only, import `database/schema.mysql.sql`. Existing installations already have the native schema; do not rebuild tables. MySQL/MariaDB DDL is not one atomic rollback operation, so take a backup even for additive migrations.

Apply, in this order:

1. `database/migrations/001_secure_content.sql`
2. `database/migrations/002_section_permissions.sql`
3. `database/migrations/003_about_page.sql`
4. `database/migrations/004_dashboard_icons.sql`
5. `database/migrations/005_navigation.sql`
6. `database/migrations/006_consultation_inbox.sql`
7. `database/migrations/007_email_replies.sql`

The migrations retain native tables and seed richer public CMS content without overwriting existing app-content rows. The second and third migrations do not restore revoked section permissions on a sequential rerun. The third migration adds the About page and its section permission; its sample team profiles need client approval or replacement in Admin About before release. Avoid concurrent migration runners.

Optional `seed.qa.synthetic.mysql.sql` is for a fresh disposable test database, BEFORE migrations. It contains placeholder images and is not real business content. Do not import it over a populated QA site merely to make row-count checks pass.

Migration 004 adds separate dashboard-layout and website-icon settings without overwriting saved values. Dashboard layout reads and writes require an administrator. Public pages can read website icons; only administrators can change them. Layout and icon updates require the loaded record version and are audited. Custom icons use the same persistent image upload configuration as other public photos.

Migration 006 adds encrypted consultation notes and manually logged replies. Migration 007 adds SMTP delivery status values while retaining existing history. Back up QA before applying migrations. The admin inbox can send plain-text email replies when SMTP settings are configured; SMS/WhatsApp/social replies are still sent externally and can be logged manually. Email messages are stored encrypted, and the activity log records the sender and delivery status without storing the message body. “Accepted” means the SMTP server accepted the recipient, not that the message reached the inbox. Do not use the demo browser preview for real client details.

## 3. Configure server-only secrets

Create or update `database/.env.qa.local` from `database/.env.qa.example` privately. Existing local credentials were not changed by this task.

Required: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, APP_ENCRYPTION_KEY_BASE64, APP_HMAC_KEY_BASE64.

The two encryption/lookup keys must be DIFFERENT cryptographically random 32-byte values encoded in base64. Generate and store them in your approved secret store, never in chat, browser code, SQL seeds, Git, or VITE_* variables. Preserve encrypted backups of the keys separately from database backups. Changing/deleting the key without a migration makes stored confidential data unreadable. KMS integration and key rotation remain release prerequisites, not completed features.

For HTTPS QA set `D16_SECURE_COOKIES=true`. Set `D16_ALLOWED_ORIGINS` to exact trusted origins without paths. Under cPanel Passenger leave `D16_BIND_HOST` unset so the app listens on the port assigned by Passenger. For a separately managed reverse proxy, bind to the provider's required local interface. Remote database connections require verified TLS; use DB_SSL_CA_FILE if your provider requires its CA. TLS certificate verification is never disabled.

Persistent uploads need an absolute `D16_UPLOAD_DIR` outside your source/deployment folder and an HTTPS `D16_PUBLIC_UPLOAD_BASE_URL` pointing to its served public path. Only PNG/JPEG/WebP images up to 5 MB are supported. Use trusted hosted URLs for videos; video-file upload is not implemented.

Email replies use server-only environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and optionally `SMTP_FROM` (defaults to `SMTP_USER`). For the current DianaHost mailbox use `SMTP_HOST=mail.d16interior.com`, `SMTP_PORT=465`, `SMTP_USER=admin@d16interior.com`, and `SMTP_FROM=admin@d16interior.com`. Set `SMTP_PASSWORD` to the mailbox password privately in the cPanel Node.js application environment, never in Git, source code, frontend variables, or chat. Port 465 is configured for implicit TLS with TLS 1.2 minimum; SMTP authentication is required. Do not configure until the matching application code and migration 007 are deployed. Use a test enquiry whose recipient is an address controlled by the site owner before client use.

## 4. Initialize real access and public catalogue

After migrations and keys are configured, run `npm run qa:bootstrap-admin` interactively. It prompts for the first administrator's email, display name and hidden password (12+ characters). No default account/password exists. The command refuses if an administrator already exists; it does not send an invitation.

Sign in to manage accounts and permissions. MFA-enabled accounts intentionally cannot sign in until a real verification provider is integrated. No fake OTP/email/SMS success is used.

Run `npm run qa:catalogue-preview` to see which recovered service/concept records would be added. Existing matching titles/slugs are retained. Review and back up QA, set D16_SEED_ACTOR_ID to the approved administrator's UUID, then run `npm run qa:catalogue-import`. Imports are serialized by an advisory lock and each inserted record has attributed audit history. This does not merge conflicting existing descriptions automatically.

The public catalogue import covers 18 services/72 subsections and 12 concepts. Configure the three required hero slides and business branding in admin; the script does not replace existing branding, hero edits or client records.

## 5. Run and verify

- `npm run dev`: demo-only frontend; no database required.
- `npm run dev:full`: QA API + database-mode frontend on localhost. Stop the demo server first if it occupies port 5173.
- `npm run build:qa`: database-mode frontend build. It does not deploy or migrate anything.
- `npm test`, `npm run lint`: offline/local checks.
- `npm run test:database`: Docker-based disposable local integration test. It does not read the hosted QA environment file; it removes only its own synthetic test container afterward.

`/api/health` returns HTTP 200 only with database and security configuration available. Missing configuration/network access returns HTTP 503; never treat it as a successful save. A network interruption during a write can leave the outcome uncertain: reload/check before retrying.

Legacy shell connectivity checks are read-only. They verify the native schema/synthetic seed, not the full CMS/auth/encryption integration. Use them only if that synthetic seed was intentionally applied. The environment loader parses passwords as data, not executable shell content.

## 6. Before production release

This code is QA-first, not a signed-off production release. Complete and verify:

- Hosting runtime/reverse proxy/HTTPS connectivity, actual QA migrations and encrypted end-to-end saves.
- Controlled re-encryption migration for any old raw UTF-8 or differently encrypted records. The API rejects them rather than silently displaying plaintext.
- Separate production credentials/keys and least-privilege users. Runtime audit_logs grants should be SELECT/INSERT only; remove UPDATE/DELETE/DDL rights. Current cPanel ALL grants are not append-only protection.
- Restore-tested database + upload + key backups, retention rules and alerting.
- Real MFA/delivery provider, key rotation/KMS integration, shared rate limiting if more than one API process.
- Client UAT, real approved photographs/team profiles/video URLs, accessibility and cross-browser review.
- Explicit release approval and a separately reviewed production configuration change.

Never upload the full source folder, private backups or .env files into public_html or Netlify's published directory.
