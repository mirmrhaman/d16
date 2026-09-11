# D16 Interior

This is the synchronized D16 application: React frontend and Node.js/MySQL backend.

Start with [CI/CD and branch guide](docs/CICD.md) for the `qa` / `production` process, approval and deployment boundaries. Follow [QA setup](database/QA_SETUP.md) for real database integration.

`npm run dev` opens the local visual preview. It does not connect to QA or production.
`npm run dev:full` starts the real QA API and frontend, after server-side configuration.

Install dependencies with `npm ci`. Run `npm test` and `npm run lint`; database integration tests use a disposable local Docker container through `npm run test:database`.

The live Netlify website was used as a visual/content reference. Pushing these branches currently runs checks and creates versioned candidate packages; it does not deploy DianaHost. GitHub Pages preview publishing is opt-in. Never upload private environment files or database backups.
