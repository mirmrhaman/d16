import { randomUUID } from 'node:crypto';
import { decryptText, encryptText, httpError } from './security.js';
import { writeAudit } from './auditService.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const channels = new Set(['internal', 'email', 'sms', 'whatsapp', 'social']);
const toMessage = (row) => ({
  id: row.id,
  consultation_id: row.consultation_id,
  actor_user_id: row.actor_user_id,
  actor_name: row.actor_name || 'Former team member',
  message_kind: row.message_kind,
  channel: row.channel,
  delivery_status: row.delivery_status,
  body: decryptText(row.body_ciphertext, `ConsultationMessage:${row.id}:body`),
  created_at: row.created_at instanceof Date ? row.created_at.toISOString() : `${String(row.created_at).replace(' ', 'T').replace(/Z$/, '')}Z`,
});

export function createConsultationInboxService({ pool }) {
  async function listMessages(consultationId) {
    if (!uuidPattern.test(String(consultationId))) throw httpError(400, 'Invalid consultation ID.');
    const [rows] = await pool.execute(
      `SELECT m.*, u.display_name AS actor_name FROM consultation_messages m
       LEFT JOIN users u ON u.id = m.actor_user_id
       WHERE m.consultation_id = ? ORDER BY m.created_at, m.id`, [consultationId],
    );
    return rows.map(toMessage);
  }

  async function addMessage(consultationId, payload, actor) {
    if (!uuidPattern.test(String(consultationId))) throw httpError(400, 'Invalid consultation ID.');
    const kind = payload?.message_kind;
    const channel = payload?.channel;
    const body = payload?.body;
    if (!['note', 'reply'].includes(kind)) throw httpError(400, 'Choose an internal note or a reply log.');
    if (!channels.has(channel) || (kind === 'note' && channel !== 'internal') || (kind === 'reply' && channel === 'internal')) throw httpError(400, 'Choose a valid channel for this message.');
    if (typeof body !== 'string' || !body.trim() || body.length > 20000) throw httpError(400, 'Message must contain 1 to 20,000 characters.');
    if (kind === 'reply' && payload?.sent_manually !== true) throw httpError(400, 'Confirm that you already sent this reply outside the website before logging it.');

    const connection = await pool.getConnection();
    const id = randomUUID();
    try {
      await connection.beginTransaction();
      const [requests] = await connection.execute('SELECT id FROM consultation_requests WHERE id = ? FOR UPDATE', [consultationId]);
      if (!requests[0]) throw httpError(404, 'Consultation request not found.');
      const deliveryStatus = kind === 'note' ? 'internal' : 'logged_manual';
      await connection.execute(
        `INSERT INTO consultation_messages
         (id, consultation_id, actor_user_id, message_kind, channel, delivery_status, body_ciphertext, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [id, consultationId, actor?.userId || null, kind, channel, deliveryStatus, encryptText(body.trim(), `ConsultationMessage:${id}:body`)],
      );
      await writeAudit(connection, {
        actor,
        action: kind === 'note' ? 'consultation.note.add' : 'consultation.reply.logged',
        entityName: 'Consultation', entityId: consultationId,
        changedFields: ['conversation_history', 'message_kind', 'channel'],
      });
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    const [rows] = await pool.execute(
      `SELECT m.*, u.display_name AS actor_name FROM consultation_messages m
       LEFT JOIN users u ON u.id = m.actor_user_id WHERE m.id = ?`, [id],
    );
    return rows[0] ? toMessage(rows[0]) : null;
  }

  return { listMessages, addMessage };
}
