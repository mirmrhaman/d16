# Environment Status

## Active now
- Environment: QA
- Database: dinterio_d16_qa
- Purpose: all app integration and validation work

## Deferred
- Environment: Production
- Status: committed in repository, not active
- Activation: later, after explicit rollout approval

## Files
- Active schema and seed flow:
  - database/schema.mysql.sql
  - database/seed.qa.synthetic.mysql.sql
  - database/QA_SETUP.md
  - database/.env.qa.example
- Deferred production references:
  - database/.env.server.example

## Guardrails
- Never use production credentials in active local or QA testing.
- Keep QA and production encryption keys separate.
- Rotate credentials if ever exposed in messages or logs.
