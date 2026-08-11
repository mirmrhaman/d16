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

const listFeaturesByServiceIds = async (serviceIds) => {
  if (!serviceIds.length) return new Map();

  const placeholders = serviceIds.map(() => "?").join(",");
  const [rows] = await pool.execute(
    `SELECT service_id, feature_text
     FROM service_features
     WHERE service_id IN (${placeholders})
     ORDER BY sort_order ASC, created_at ASC`,
    serviceIds
  );

  const featuresMap = new Map();
  for (const row of rows) {
    const current = featuresMap.get(row.service_id) || [];
    current.push(row.feature_text);
    featuresMap.set(row.service_id, current);
  }

  return featuresMap;
};

const mapService = (row, featuresMap) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  image: row.image || "",
  order: row.sort_order ?? 0,
  features: featuresMap.get(row.id) || [],
});

export const listServices = async () => {
  try {
    const [services] = await pool.execute(
      `SELECT s.id, s.title, s.description, s.sort_order, ma.public_url AS image
       FROM services s
       LEFT JOIN media_assets ma ON ma.id = s.image_asset_id
       ORDER BY s.sort_order ASC, s.created_at ASC`
    );

    const ids = services.map((s) => s.id);
    const featuresMap = await listFeaturesByServiceIds(ids);

    return services.map((service) => mapService(service, featuresMap));
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] services DB unavailable, using local fallback:", error?.message || error);
    return base44.entities.Service.list("order");
  }
};

export const createService = async (payload) => {
  try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const serviceId = randomUUID();
    const imageAssetId = await ensureImageAsset(connection, null, payload.image || "");

    await connection.execute(
      `INSERT INTO services (
         id, title, description, image_asset_id, sort_order, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [serviceId, payload.title, payload.description, imageAssetId, Number(payload.order || 0)]
    );

    const features = Array.isArray(payload.features) ? payload.features.filter(Boolean) : [];
    for (let i = 0; i < features.length; i += 1) {
      await connection.execute(
        `INSERT INTO service_features (id, service_id, feature_text, sort_order, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
        [randomUUID(), serviceId, features[i], i]
      );
    }

    await connection.commit();
    const all = await listServices();
    return all.find((item) => item.id === serviceId) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] services create fallback:", error?.message || error);
    return base44.entities.Service.create(payload);
  }
};

export const updateService = async (id, payload) => {
  try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      `SELECT id, image_asset_id FROM services WHERE id = ? LIMIT 1`,
      [id]
    );

    if (existingRows.length === 0) {
      throw new Error("Service not found");
    }

    const imageAssetId = await ensureImageAsset(connection, existingRows[0].image_asset_id, payload.image || "");

    await connection.execute(
      `UPDATE services
       SET title = ?,
           description = ?,
           image_asset_id = ?,
           sort_order = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [payload.title, payload.description, imageAssetId, Number(payload.order || 0), id]
    );

    await connection.execute(`DELETE FROM service_features WHERE service_id = ?`, [id]);

    const features = Array.isArray(payload.features) ? payload.features.filter(Boolean) : [];
    for (let i = 0; i < features.length; i += 1) {
      await connection.execute(
        `INSERT INTO service_features (id, service_id, feature_text, sort_order, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
        [randomUUID(), id, features[i], i]
      );
    }

    await connection.commit();
    const all = await listServices();
    return all.find((item) => item.id === id) || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] services update fallback:", error?.message || error);
    const updated = await base44.entities.Service.update(id, payload);
    if (!updated) {
      throw new Error("Service not found");
    }
    return updated;
  }
};

export const deleteService = async (id) => {
  try {
    const [result] = await pool.execute(`DELETE FROM services WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] services delete fallback:", error?.message || error);
    const existing = await base44.entities.Service.list("order");
    if (!existing.some((item) => item.id === id)) return false;
    await base44.entities.Service.delete(id);
    return true;
  }
};
