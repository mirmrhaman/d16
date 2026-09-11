import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createUploadService } from './uploadService.js';
import { validateSecurityConfig } from './security.js';

export { createApp } from './app.js';

export async function startServer() {
  // Import configuration only for the real server, never when testing createApp.
  const { pool } = await import('./db.js');
  validateSecurityConfig();
  const content = await import('./contentService.js');
  const upload = createUploadService({ auditUpload: async (id, actor) => {
    const { writeAudit } = await import('./auditService.js');
    await writeAudit(pool, { actor, action: 'upload.create', entityName: 'media_assets', entityId: id, changedFields: ['image'] });
  } });
  const app = createApp({ pool, content, upload });
  const port = Number(process.env.PORT || 8787);
  const host = process.env.D16_BIND_HOST || '127.0.0.1';
  return app.listen(port, host, () => console.log(`[d16-api] listening at ${host}:${port} (database mode)`));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().catch((error) => { console.error(`[d16-api] startup failed: ${error.message}`); process.exitCode = 1; });
}
