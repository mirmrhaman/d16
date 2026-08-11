import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { base44 } from "../../src/api/base44Client.js";
import { shouldUseLocalFallback } from "./dbFallback.js";

const decodeMaybeUtf8 = (value) => {
  if (!value) return "";
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  if (typeof value === "string") return value;
  return String(value);
};

const encodeQaCiphertext = (value) => {
  if (!value) return null;
  // QA-only placeholder encoding until envelope encryption is integrated.
  return Buffer.from(String(value), "utf8");
};

const parseLogoLocation = (logoUrl) => {
  if (!logoUrl) return null;

  try {
    const url = new URL(logoUrl);
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
      objectKey: logoUrl.slice(0, 1024),
    };
  }
};

const ensureLogoAsset = async (connection, currentLogoAssetId, logoUrl) => {
  if (!logoUrl) return currentLogoAssetId || null;

  const parsed = parseLogoLocation(logoUrl);

  if (currentLogoAssetId) {
    await connection.execute(
      `UPDATE media_assets
       SET public_url = ?, updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [logoUrl, currentLogoAssetId]
    );
    return currentLogoAssetId;
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
      [logoUrl, existingId]
    );
    return existingId;
  }

  const mediaId = randomUUID();
  await connection.execute(
    `INSERT INTO media_assets (id, storage_provider, bucket_name, object_key, public_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    [mediaId, parsed.storageProvider, parsed.bucketName, parsed.objectKey, logoUrl]
  );

  return mediaId;
};

const mapContact = (profile, locations) => ({
  id: profile.id,
  phone: decodeMaybeUtf8(profile.contact_phone_ciphertext),
  email: decodeMaybeUtf8(profile.contact_email_ciphertext),
  address: profile.address || "",
  working_hours: profile.working_hours || "",
  locations: locations.map((loc) => loc.location_name),
  theme_color: profile.theme_color || "",
  logo_url: profile.logo_url || "",
});

export const listContactInfo = async () => {
  try {
    const [profiles] = await pool.execute(
      `SELECT op.id, op.contact_phone_ciphertext, op.contact_email_ciphertext, op.address,
              op.working_hours, op.theme_color, ma.public_url AS logo_url
       FROM organization_profile op
       LEFT JOIN media_assets ma ON ma.id = op.logo_asset_id
       ORDER BY op.created_at ASC
       LIMIT 1`
    );

    if (profiles.length === 0) return [];

    const profile = profiles[0];
    const [locations] = await pool.execute(
      `SELECT location_name
       FROM organization_locations
       WHERE organization_profile_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
      [profile.id]
    );

    return [mapContact(profile, locations)];
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] contact-info DB unavailable, using local fallback:", error?.message || error);
    return base44.entities.ContactInfo.list();
  }
};

export const createContactInfo = async (payload) => {
  try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const profileId = randomUUID();
    const logoAssetId = await ensureLogoAsset(connection, null, payload.logo_url || "");

    await connection.execute(
      `INSERT INTO organization_profile (
         id, organization_name, contact_email_ciphertext, contact_phone_ciphertext,
         address, working_hours, theme_color, logo_asset_id, created_at, updated_at
       ) VALUES (?, 'D16 Interior', ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
      [
        profileId,
        encodeQaCiphertext(payload.email),
        encodeQaCiphertext(payload.phone),
        payload.address || null,
        payload.working_hours || null,
        payload.theme_color || null,
        logoAssetId,
      ]
    );

    const locations = Array.isArray(payload.locations) ? payload.locations.filter(Boolean) : [];
    for (let i = 0; i < locations.length; i += 1) {
      await connection.execute(
        `INSERT INTO organization_locations (id, organization_profile_id, location_name, sort_order, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
        [randomUUID(), profileId, locations[i], i]
      );
    }

    await connection.commit();

    const [createdList] = await Promise.all([listContactInfo()]);
    return createdList[0] || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] contact-info create fallback:", error?.message || error);
    return base44.entities.ContactInfo.create(payload);
  }
};

export const updateContactInfo = async (id, payload) => {
  try {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      `SELECT id, logo_asset_id FROM organization_profile WHERE id = ? LIMIT 1`,
      [id]
    );

    if (existingRows.length === 0) {
      throw new Error("Contact profile not found");
    }

    const existing = existingRows[0];
    const logoAssetId = await ensureLogoAsset(connection, existing.logo_asset_id, payload.logo_url || "");

    await connection.execute(
      `UPDATE organization_profile
       SET contact_email_ciphertext = ?,
           contact_phone_ciphertext = ?,
           address = ?,
           working_hours = ?,
           theme_color = ?,
           logo_asset_id = ?,
           updated_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [
        encodeQaCiphertext(payload.email),
        encodeQaCiphertext(payload.phone),
        payload.address || null,
        payload.working_hours || null,
        payload.theme_color || null,
        logoAssetId,
        id,
      ]
    );

    await connection.execute(
      `DELETE FROM organization_locations WHERE organization_profile_id = ?`,
      [id]
    );

    const locations = Array.isArray(payload.locations) ? payload.locations.filter(Boolean) : [];
    for (let i = 0; i < locations.length; i += 1) {
      await connection.execute(
        `INSERT INTO organization_locations (id, organization_profile_id, location_name, sort_order, created_at)
         VALUES (?, ?, ?, ?, UTC_TIMESTAMP())`,
        [randomUUID(), id, locations[i], i]
      );
    }

    await connection.commit();

    const [updatedList] = await Promise.all([listContactInfo()]);
    return updatedList[0] || null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  } catch (error) {
    if (!shouldUseLocalFallback(error)) throw error;
    console.warn("[api] contact-info update fallback:", error?.message || error);
    const updated = await base44.entities.ContactInfo.update(id, payload);
    if (!updated) {
      throw new Error("Contact profile not found");
    }
    return updated;
  }
};
