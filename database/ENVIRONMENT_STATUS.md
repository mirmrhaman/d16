# Environment status — 2026-09-08

| Environment | Actual status |
|---|---|
| Local visual preview | Explicit demo mode; sample public content; real submissions/account management disabled |
| Isolated local MariaDB 10.11 | Schema, migrations, encryption, authentication, permissions and audit integration verified; disposable test data removed |
| Hosted QA: dinterio_d16_qa | Intended next target; not updated or verified by this synchronization task |
| Hosted production: dinterio_d16_prod | Untouched; runtime production guard remains enabled |
| Published Netlify website | Reference only; not redeployed |

Current setup: [QA_SETUP.md](QA_SETUP.md). Main handover: [../START_HERE.md](../START_HERE.md).

An existing database/user in cPanel does not prove connectivity or production readiness. Earlier Mac SSH/3306 checks were blocked; hosting support must confirm the supported access method. No new connectivity result is implied here.
