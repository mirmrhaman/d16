// Imports public content only; existing matching titles/slugs are never overwritten.
import { LIVE_SERVICES, LIVE_CONCEPTS } from '../src/data/liveContent.js';
const { pool } = await import('../server/src/db.js');
let importLock;
try {
  const { createContent, listContent } = await import('../server/src/contentService.js');
  const apply = process.argv.includes('--apply');
  const actorId = process.env.D16_SEED_ACTOR_ID;
  if (apply) {
    importLock = await pool.getConnection();
    const [[lock]] = await importLock.query("SELECT GET_LOCK('d16_qa_public_catalogue_import', 5) AS acquired");
    if (Number(lock.acquired) !== 1) throw new Error('Another catalogue import is running; try again later.');
    if (!actorId) throw new Error('Set D16_SEED_ACTOR_ID to the administrator UUID so imports have attributed history.');
    const [rows] = await pool.execute("SELECT u.id FROM users u JOIN user_role_assignments a ON a.user_id=u.id JOIN roles r ON r.id=a.role_id WHERE u.id=? AND u.is_active=1 AND u.is_verified=1 AND r.role_key='admin'", [actorId]);
    if (!rows.length) throw new Error('The import actor must be an active, approved administrator.');
  }
  for (const [entity, seeds] of [['Service', LIVE_SERVICES], ['PicYourConcept', LIVE_CONCEPTS]]) {
    const existing = await listContent(entity);
    let added = 0, skipped = 0;
    for (const seed of seeds) {
      if (existing.some((row) => row.slug === seed.slug || row.title?.trim().toLowerCase() === seed.title.toLowerCase())) { skipped++; continue; }
      if (apply) await createContent(entity, seed, { userId: actorId, userAgent: 'D16 reviewed public catalogue import' });
      added++;
    }
    console.log(`${entity}: ${apply ? 'added' : 'would add'} ${added}; retained ${skipped} existing matches.`);
  }
  if (!apply) console.log('Preview only. Rerun with --apply after reviewing and backing up QA.');
} finally {
  if (importLock) { try { await importLock.query("SELECT RELEASE_LOCK('d16_qa_public_catalogue_import')"); } finally { importLock.release(); } }
  await pool.end();
}
