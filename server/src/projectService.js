import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { base44 } from "../../src/api/base44Client.js";
import { shouldUseLocalFallback } from "./dbFallback.js";

const parseAssetLocation = (assetUrl) => {
  if (!assetUrl) return null;

  try {
    const url = new URL(assetUrl);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const host = url.hostname.toLowerCase();

    let storageProvider = "supabase";
    if (host.includes("blob.core.windows.net")) storageProvider = "azure_blob";
    else if (host.includes("amazonaws.com")) storageProvider = "s3";
    else if (host.includes("storage.googleapis.com")) storageProvider = "gcs";

    const bucketName = pathParts[0] || "public";
    const objectKey = pathParts.slice(1).join("/") || url.pathname.replace(/^\//, "") || randomUUID();

    return { storageProvider, bucketName, objectKey };
  } catch {
    return {
      storageProvider: "supabase",
      bucketName: "public",
      objectKey: assetUrl.slice(0, 1024),
    };
  }
};

const ensureImageAsset = async (connection, currentAssetId, assetUrl) => {
  if (!assetUrl) return currentAssetId || null;

  const parsed = parseAssetLocation(assetUrl);

  if (currentAssetId) {
    await connection.execute(
      `UPDATE media_assets
       SET public_url = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [assetUrl, currentAssetId]
    );
    return currentAssetId;
  }

  const [existing] = await connection.execute(
    `SELECT id FROM media_assets
     WHERE storage_provider = ? AND bucket_name = ? AND object_key = ?
     LIMIT 1`,
    [parsed.storageProvider, parsed.bucketName, parsed.objectKey]
  );

  if (existing.length > 0) {
    const existingId = existing[0].id;
    await connection.execute(
      `UPDATE media_assets
       SET public_url = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [assetUrl, existingId]
    );
    return existingId;
  }

  const mediaId = randomUUID();
  await connection.execute(
    `INSERT INTO media_assets (id, storage_provider, bucket_name, object_key, public_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [mediaId, parsed.storageProvider, parsed.bucketName, parsed.objectKey, assetUrl]
  );

  return mediaId;
};

const mapProject = (row) => ({
  id: row.id,
  title: row.title,
  location: row.location,
  project_type: row.project_type || "",
  style: row.style || "",
  area: row.area_text || "",
  category: row.category,
  featured_image: row.featured_image || "",
  description: row.description || "",
  featured: Boolean(row.is_featured),
});

export const listProjects = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT p.id, p.title, p.location, p.project_type, p.style, p.area_text,
              p.category, p.description, p.is_featured, p.created_at,
              ma.public_url AS featured_image
       FROM projects p
       LEFT JOIN media_assets ma ON ma.id = p.featured_image_asset_id
       ORDER BY p.created_at DESC`
    );

    return rows.map(mapProject);
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] projects DB unavailable, using local fallback:", error?.message || error);
    return base44.entities.Project.list("-created_date");
  }
};

export const createProject = async (payload) => {
  try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const id = randomUUID();
    const imageAssetId = await ensureImageAsset(connection, null, payload.featured_image || "");

    await connection.execute(
      `INSERT INTO projects (
         id, title, location, project_type, style, area_text,
         category, featured_image_asset_id, description, is_featured,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [
        id,
        payload.title,
        payload.location,
        payload.project_type || null,
        payload.style || null,
        payload.area || null,
        payload.category,
        imageAssetId,
        payload.description || null,
        payload.featured ? 1 : 0,
      ]
    );

    await connection.commit();

    const [rows] = await pool.execute(
      `SELECT p.id, p.title, p.location, p.project_type, p.style, p.area_text,
              p.category, p.description, p.is_featured,
              ma.public_url AS featured_image
       FROM projects p
       LEFT JOIN media_assets ma ON ma.id = p.featured_image_asset_id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] ? mapProject(rows[0]) : null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] projects create fallback:", error?.message || error);
    return base44.entities.Project.create(payload);
  }
};

export const updateProject = async (id, payload) => {
  try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      `SELECT id, featured_image_asset_id FROM projects WHERE id = ? LIMIT 1`,
      [id]
    );

    if (existingRows.length === 0) {
      throw new Error("Project not found");
    }

    const imageAssetId = await ensureImageAsset(connection, existingRows[0].featured_image_asset_id, payload.featured_image || "");

    await connection.execute(
      `UPDATE projects
       SET title = ?,
           location = ?,
           project_type = ?,
           style = ?,
           area_text = ?,
           category = ?,
           featured_image_asset_id = ?,
           description = ?,
           is_featured = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        payload.title,
        payload.location,
        payload.project_type || null,
        payload.style || null,
        payload.area || null,
        payload.category,
        imageAssetId,
        payload.description || null,
        payload.featured ? 1 : 0,
        id,
      ]
    );

    await connection.commit();

    const [rows] = await pool.execute(
      `SELECT p.id, p.title, p.location, p.project_type, p.style, p.area_text,
              p.category, p.description, p.is_featured,
              ma.public_url AS featured_image
       FROM projects p
       LEFT JOIN media_assets ma ON ma.id = p.featured_image_asset_id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] ? mapProject(rows[0]) : null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] projects update fallback:", error?.message || error);
    const updated = await base44.entities.Project.update(id, payload);
    if (!updated) {
      throw new Error("Project not found");
    }
    return updated;
  }
};

export const deleteProject = async (id) => {
  try {
    const [result] = await pool.execute(`DELETE FROM projects WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] projects delete fallback:", error?.message || error);
    const existing = await base44.entities.Project.list("-created_date");
    if (!existing.some((item) => item.id === id)) return false;
    await base44.entities.Project.delete(id);
    return true;
  }
};
