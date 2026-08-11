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

const toIsoDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const mapBlogPost = (row) => ({
  id: row.id,
  title: row.title,
  excerpt: row.excerpt || "",
  content: row.content || "",
  category: row.category || "",
  featured_image: row.featured_image || "",
  author: row.author_display_name || "",
  published_date: toIsoDate(row.published_at),
});

export const listBlogPosts = async () => {
  try {
    const [rows] = await pool.execute(
      `SELECT b.id, b.title, b.excerpt, b.content, b.category,
              b.author_display_name, b.published_at, ma.public_url AS featured_image
       FROM blog_posts b
       LEFT JOIN media_assets ma ON ma.id = b.featured_image_asset_id
       ORDER BY b.published_at DESC, b.created_at DESC`
    );

    return rows.map(mapBlogPost);
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] blog-posts DB unavailable, using local fallback:", error?.message || error);
    return base44.entities.BlogPost.list("-published_date");
  }
};

export const createBlogPost = async (payload) => {
  try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const id = randomUUID();
    const imageAssetId = await ensureImageAsset(connection, null, payload.featured_image || "");

    await connection.execute(
      `INSERT INTO blog_posts (
         id, title, excerpt, content, category, featured_image_asset_id,
         author_display_name, published_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [
        id,
        payload.title,
        payload.excerpt || null,
        payload.content || null,
        payload.category || null,
        imageAssetId,
        payload.author || null,
        payload.published_date ? new Date(payload.published_date) : null,
      ]
    );

    await connection.commit();

    const [rows] = await pool.execute(
      `SELECT b.id, b.title, b.excerpt, b.content, b.category,
              b.author_display_name, b.published_at, ma.public_url AS featured_image
       FROM blog_posts b
       LEFT JOIN media_assets ma ON ma.id = b.featured_image_asset_id
       WHERE b.id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] ? mapBlogPost(rows[0]) : null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] blog-posts create fallback:", error?.message || error);
    return base44.entities.BlogPost.create(payload);
  }
};

export const updateBlogPost = async (id, payload) => {
  try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      `SELECT id, featured_image_asset_id FROM blog_posts WHERE id = ? LIMIT 1`,
      [id]
    );

    if (existingRows.length === 0) {
      throw new Error("Blog post not found");
    }

    const imageAssetId = await ensureImageAsset(connection, existingRows[0].featured_image_asset_id, payload.featured_image || "");

    await connection.execute(
      `UPDATE blog_posts
       SET title = ?,
           excerpt = ?,
           content = ?,
           category = ?,
           featured_image_asset_id = ?,
           author_display_name = ?,
           published_at = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        payload.title,
        payload.excerpt || null,
        payload.content || null,
        payload.category || null,
        imageAssetId,
        payload.author || null,
        payload.published_date ? new Date(payload.published_date) : null,
        id,
      ]
    );

    await connection.commit();

    const [rows] = await pool.execute(
      `SELECT b.id, b.title, b.excerpt, b.content, b.category,
              b.author_display_name, b.published_at, ma.public_url AS featured_image
       FROM blog_posts b
       LEFT JOIN media_assets ma ON ma.id = b.featured_image_asset_id
       WHERE b.id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] ? mapBlogPost(rows[0]) : null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] blog-posts update fallback:", error?.message || error);
    const updated = await base44.entities.BlogPost.update(id, payload);
    if (!updated) {
      throw new Error("Blog post not found");
    }
    return updated;
  }
};

export const deleteBlogPost = async (id) => {
  try {
    const [result] = await pool.execute(`DELETE FROM blog_posts WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] blog-posts delete fallback:", error?.message || error);
    const existing = await base44.entities.BlogPost.list("-published_date");
    if (!existing.some((item) => item.id === id)) return false;
    await base44.entities.BlogPost.delete(id);
    return true;
  }
};
