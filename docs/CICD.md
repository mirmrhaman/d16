# D16 two-branch delivery

## Branches

- `qa`: ongoing work, automated checks, candidate packages and optional client design preview.
- `production`: reviewed promotion from QA, automated checks and candidate packages for the intended DianaHost release.
- Existing `main`, `master` and other branches are preserved. `main` is historical, not part of this new release path. Its old remote workflows remain until a separate reviewed cleanup; do not push releases there.

Both new branches start with the synchronized local application. They are not proof that DianaHost has been deployed. The runtime production guard remains enabled.

## What runs now

On every push to QA/production and pull request targeting either branch, GitHub Actions runs lint, unit/security tests, disposable MariaDB integration and frontend builds. No hosted database credentials are available to these jobs. Official actions are pinned to exact revisions.

Successful branch pushes create a candidate such as `0.0.0-qa.RUN_ID.ATTEMPT`, based on the package version and a unique GitHub run. The downloadable archive and manifest identify the exact source commit and SHA-256 of each bundled file. Artifacts are retained for 90 days, subject to repository policy. Retain approved release archives separately for long-term rollback. Candidate build numbers are not client approval or production release numbers.

The archive contains built frontend, runtime source, dependency manifests and schema/migrations. Private configuration, secrets, local databases, uploads and dependency folders are excluded. Upload only `dist/` as public static files; never place the entire archive under a public web directory.

## Optional GitHub Pages design preview

The existing client URL is https://mirmrhaman.github.io/d16/.

The QA preview jobs are disabled by default. After approval to update this link, restrict the `github-pages` environment to branch `qa`, then set repository variable `D16_QA_PREVIEW_ENABLED` to `true`. A subsequent QA push must pass tests before publishing. This replaces that design-preview link only; it does not deploy DianaHost.

The preview deliberately uses sample/browser-only data: admin edits do not reach a shared database, and real consultations/account management are disabled. Real client acceptance of database behavior requires a separate hosted QA application, database, encryption keys and uploads.

## Approval and DianaHost release boundary

Record client acceptance against the exact QA candidate commit in the promotion pull request. After subsequent edits, repeat testing and approval. The prepared `dianahost-production` environment requires the owner's approval and restricts deployments to `production`; no DianaHost deployment job or credentials are enabled yet.

Before adding the real deployment job, confirm the production domain, provider-supported Node runtime, SSH port or other supported deployment transport, verified host identity, application/release paths, process restart mechanism, same-origin HTTPS `/api` routing and persistent upload storage. Do not assume cPanel login access provides SSH or a Node process.

Complete production security readiness and explicitly review the QA-only runtime guard change. Configure separate least-privilege production secrets in a protected environment, never in Git or `VITE_*` values. The production deployment must depend on passing checks, immutable approved candidate identity and environment approval; it must not rebuild a moving branch after approval.

For long-term releases use unique semantic versions such as `1.0.0`, `1.0.1`, `1.1.0` and retain immutable archives with approval/test records. Production and QA builds currently produce separate candidates; exact-artifact promotion is part of the pending verified DianaHost deployment integration, not implemented by these checks alone.

## Recovery

Keep the previous compatible frontend/backend package before release and test the restore procedure in QA. A rollback deploys that prior package with a new deployment record, without rewriting its original version. Keep uploads and encryption/lookup keys outside release folders and back them up securely.

Application rollback does not undo database/CMS changes. Prefer backward-compatible additive schema migrations. Never automatically restore an old database or run destructive down-migrations: newer enquiries could be lost. Data recovery requires explicit approval and a reconciliation plan. Existing History stores who/when/changed fields, not restorable prior content snapshots.

## Everyday workflow

1. Develop locally on QA or a short-lived feature branch, without real client data.
2. Push/open a pull request to QA and wait for checks; review the resulting candidate.
3. Test with the client and record approval for that exact revision.
4. Open a QA-to-production pull request using the approval checklist.
5. After hosting integration is completed, approve the protected DianaHost deployment and verify health/core actions.

No branch push currently deploys to DianaHost. Automatic Azure deployment workflows have been retired in these two branches because DianaHost is the selected production host.
