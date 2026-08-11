import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { base44 } from "../../src/api/base44Client.js";
import { shouldUseLocalFallback } from "./dbFallback.js";

const mapStat = (row) => ({
  id: row.id,
  label: row.label,
  value: row.value_text,
  icon: row.icon_key || "Award",
  order: row.sort_order ?? 0,
});

export const listStats = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, label, value_text, icon_key, sort_order
       FROM stats
       ORDER BY sort_order ASC, created_at ASC`
    );

    return rows.map(mapStat);
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] stats DB unavailable, using local fallback:", error?.message || error);
    return base44.entities.Stats.list("order");
  }
};

export const createStat = async (payload) => {
  try {
    const id = randomUUID();
    await pool.execute(
      `INSERT INTO stats (id, label, value_text, icon_key, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [id, payload.label, payload.value, payload.icon || "Award", Number(payload.order || 0)]
    );

    const [rows] = await pool.execute(
      `SELECT id, label, value_text, icon_key, sort_order
       FROM stats
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] ? mapStat(rows[0]) : null;
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] stats create fallback:", error?.message || error);
    return base44.entities.Stats.create(payload);
  }
};

export const updateStat = async (id, payload) => {
  try {
    const [result] = await pool.execute(
      `UPDATE stats
       SET label = ?,
           value_text = ?,
           icon_key = ?,
           sort_order = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [payload.label, payload.value, payload.icon || "Award", Number(payload.order || 0), id]
    );

    if (result.affectedRows === 0) {
      throw new Error("Stat not found");
    }

    const [rows] = await pool.execute(
      `SELECT id, label, value_text, icon_key, sort_order
       FROM stats
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] ? mapStat(rows[0]) : null;
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] stats update fallback:", error?.message || error);
    const updated = await base44.entities.Stats.update(id, payload);
    if (!updated) {
      throw new Error("Stat not found");
    }
    return updated;
  }
};

export const deleteStat = async (id) => {
  try {
    const [result] = await pool.execute(`DELETE FROM stats WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] stats delete fallback:", error?.message || error);
    const existing = await base44.entities.Stats.list("order");
    if (!existing.some((item) => item.id === id)) return false;
    await base44.entities.Stats.delete(id);
    return true;
  }
};
