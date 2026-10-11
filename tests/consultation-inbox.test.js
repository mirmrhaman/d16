import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import { createConsultationInboxService } from '../server/src/consultationInboxService.js';
import { decryptText } from '../server/src/security.js';

process.env.APP_ENCRYPTION_KEY_BASE64 = randomBytes(32).toString('base64');
process.env.APP_HMAC_KEY_BASE64 = randomBytes(32).toString('base64');

function createDatabase() {
  const consultationId = randomUUID();
  const actorId = randomUUID();
  const rows = [];
  const calls = [];
  let rolledBack = false;
  const connection = {
    async beginTransaction() {},
    async commit() {},
    async rollback() { rolledBack = true; },
    release() {},
    async execute(sql, params = []) {
      calls.push([sql, params]);
      if (sql.startsWith('SELECT id FROM consultation_requests')) return [[{ id: consultationId }]];
      if (sql.startsWith('INSERT INTO consultation_messages')) {
        const [id, threadId, userId, kind, channel, status, ciphertext] = params;
        rows.push({ id, consultation_id: threadId, actor_user_id: userId, message_kind: kind, channel, delivery_status: status, body_ciphertext: ciphertext, created_at: new Date('2026-09-01T12:00:00Z'), actor_name: 'QA Admin' });
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('INSERT INTO audit_logs')) return [{ affectedRows: 1 }];
      return [[]];
    },
  };
  const pool = {
    getConnection: async () => connection,
    async execute(sql, params = []) {
      calls.push([sql, params]);
      if (sql.includes('FROM consultation_messages')) return [rows.filter((row) => !params.length || row.id === params[0] || row.consultation_id === params[0])];
      return [[]];
    },
  };
  return { pool, rows, calls, consultationId, actorId, wasRolledBack: () => rolledBack };
}

test('notes and manually logged replies are encrypted, attributed and audited without message text', async () => {
  const db = createDatabase();
  const inbox = createConsultationInboxService({ pool: db.pool });
  const actor = { userId: db.actorId, ipAddress: '127.0.0.1', userAgent: 'inbox-test' };
  const note = await inbox.addMessage(db.consultationId, { message_kind: 'note', channel: 'internal', body: 'Call client next week' }, actor);
  assert.equal(note.actor_user_id, db.actorId);
  assert.equal(note.body, 'Call client next week');
  assert.equal(note.delivery_status, 'internal');
  const stored = db.rows[0];
  assert(!stored.body_ciphertext.toString().includes('Call client next week'));
  assert.equal(decryptText(stored.body_ciphertext, `ConsultationMessage:${stored.id}:body`), 'Call client next week');
  const audit = db.calls.find(([sql]) => sql.startsWith('INSERT INTO audit_logs'));
  assert.equal(audit[1][2], 'consultation.note.add');
  assert(!JSON.stringify(audit).includes('Call client next week'));

  const reply = await inbox.addMessage(db.consultationId, { message_kind: 'reply', channel: 'email', body: 'Thank you for your inquiry', sent_manually: true }, actor);
  assert.equal(reply.delivery_status, 'logged_manual');
  assert.equal(reply.channel, 'email');
  assert.equal((await inbox.listMessages(db.consultationId)).length, 2);
});

test('external reply cannot be recorded as sent without explicit confirmation', async () => {
  const db = createDatabase();
  const inbox = createConsultationInboxService({ pool: db.pool });
  await assert.rejects(
    inbox.addMessage(db.consultationId, { message_kind: 'reply', channel: 'whatsapp', body: 'Reply text', sent_manually: false }, { userId: db.actorId }),
    /already sent this reply outside the website/,
  );
  assert.equal(db.rows.length, 0);
  assert.equal(db.wasRolledBack(), false);
});

test('internal notes cannot be misclassified as external channel messages', async () => {
  const db = createDatabase();
  const inbox = createConsultationInboxService({ pool: db.pool });
  await assert.rejects(
    inbox.addMessage(db.consultationId, { message_kind: 'note', channel: 'email', body: 'Private note' }, { userId: db.actorId }),
    /valid channel/,
  );
  assert.equal(db.rows.length, 0);
});
