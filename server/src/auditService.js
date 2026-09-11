import { randomUUID } from "node:crypto";

export const writeAudit = async (connection, { actor = {}, action, entityName, entityId = null, changedFields = [] }) => {
  const fields = [...new Set(changedFields)].filter((field) => typeof field === "string" && /^[a-zA-Z0-9_.-]{1,80}$/.test(field)).sort();
  // Only field names and event metadata. Never snapshot decrypted data or secrets.
  await connection.execute(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_name, entity_id, old_data, new_data, ip_address, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, UTC_TIMESTAMP())`,
    [randomUUID(), actor?.userId || null, action, entityName, entityId,
      JSON.stringify({ changed_fields: fields, schema_version: 1 }), actor?.ipAddress?.slice(0, 45) || null,
      actor?.userAgent?.slice(0, 500) || null]
  );
};

export const listAudit = async (connection, limit = 100) => {
  const count = Math.min(200, Math.max(1, Number(limit) || 100));
  const [rows] = await connection.query(
    `SELECT id, actor_user_id, action, entity_name, entity_id, old_data, new_data, created_at
     FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT ?`, [count]
  );
  return rows;
};
