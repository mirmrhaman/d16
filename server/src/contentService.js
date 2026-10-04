import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { pool } from "./db.js";
import { encryptText, decryptText, lookupHash } from "./security.js";
import { writeAudit } from "./auditService.js";
import { validateCustomPage } from "./customPageSchema.js";
import { validateSocialLinks, validateFloatingSocial, normalizeSocialMedia } from "./socialMediaSchema.js";

const publicFields = {
  HeroSlide: ["title", "subtitle", "image", "order", "active"],
  Stat: ["label", "value", "icon", "order"],
  Service: ["title", "slug", "description", "image", "icon", "features", "order", "sub_services"],
  Project: ["title", "location", "project_type", "style", "area", "category", "featured_image", "gallery_images", "description", "featured", "order"],
  BlogPost: ["title", "excerpt", "content", "category", "featured_image", "author", "published_date", "published", "order"],
  GalleryVideo: ["title", "thumbnail", "video_url", "external_video_url", "duration", "category", "order"],
  GalleryConcept: ["title", "slug", "description", "image", "features", "order", "sub_services"],
  PicYourConcept: ["title", "slug", "description", "image", "features", "order", "sub_services"],
  ContactInfo: ["organization_name", "address", "working_hours", "locations", "theme_color", "logo_url", "social_links", "floating_social"],
  AboutPage: ["title", "subtitle", "hero_image", "philosophy_title", "philosophy_text", "philosophy_detail", "mission_summary", "philosophy_image", "approach_title", "approach_subtitle", "approach_steps", "principles_title", "principles_subtitle", "vision_title", "vision_text", "mission_title", "mission_text", "team_title", "team_subtitle", "team_members"],
  DashboardLayout: ["title", "card_order"],
  WebsiteIcons: ["title", "icons"],
  NavigationMenu: ["title", "items", "dropdown_enabled", "dropdown_label"],
  CustomPage: ["title", "page_type", "intro", "body", "hero_image", "items", "published"],
};
export const ABOUT_PAGE_ID = "8c3de170-4be7-4e45-9f3d-618d0b20c613";
export const DASHBOARD_LAYOUT_ID = "79310606-6485-4cc3-ab09-d99d08d67f5e";
export const WEBSITE_ICONS_ID = "fb68d11f-55bc-4e6b-942f-f784dcb0c912";
export const NAVIGATION_MENU_ID = "a7bf2755-1d82-4c2e-9ad3-729f04c565d1";
const singletonIds = { AboutPage: ABOUT_PAGE_ID, DashboardLayout: DASHBOARD_LAYOUT_ID, WebsiteIcons: WEBSITE_ICONS_ID, NavigationMenu: NAVIGATION_MENU_ID };
const appearanceEntities = new Set(["DashboardLayout", "WebsiteIcons"]);
const versionedConfigurations = new Set([...appearanceEntities, "NavigationMenu", "CustomPage"]);
const dashboardCards = new Set(["AdminAbout", "AdminHistory", "AdminHeroSlides", "AdminStats", "AdminServices", "AdminProjects", "AdminGallery", "AdminPicYourConcept", "AdminBlog", "AdminConsultations", "AdminContactInfo", "AdminLogo", "AdminLocations", "AdminSocialMedia", "AdminTheme", "AdminUsers", "AdminAccessControl", "AdminIcons", "AdminNavigation"]);
const navigationPages = new Set(["Home", "About", "Services", "Portfolio", "PicYourConcept", "Gallery", "Blog", "Contact"]);
// Kept server-side so API deployments do not depend on frontend source files.
// Tests verify parity with the public icon picker; no arbitrary component names.
export const WEBSITE_ICON_NAMES = [
  "UserCheck", "Wallet", "Target", "Clock", "MessageSquare", "FileText", "Hammer",
  "CheckCircle", "Home", "Building2", "Coffee", "Hotel", "Award", "Users",
  "TrendingUp", "Star", "Briefcase", "Lightbulb", "Rocket", "Sparkles", "Heart",
  "Image", "BarChart3", "FolderOpen", "BookOpen", "Phone", "UserCog",
  "ShieldCheck", "Images", "Palette", "MapPin", "Share2",
];
const websiteIconNames = new Set(WEBSITE_ICON_NAMES);
const privateFields = ["full_name", "email", "phone", "location", "budget", "message", "preferred_date"];
const consultationFields = [...privateFields, "project_type", "status", "assigned_to_user_id"];
const consultationStatuses = new Set(["pending", "contacted", "in_progress", "completed"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const errorWithStatus = (message, status) => Object.assign(new Error(message), { status, statusCode: status });
const context = (entity, id, field) => `${entity}:${id}:${field}`;
const normalizeEntity = (entity) => entity === "Stats" ? "Stat" : entity;
const isoDate = (value) => value instanceof Date ? value.toISOString() : value ? `${String(value).replace(" ", "T").replace(/Z$/, "")}Z` : null;
const jsonObject = (value) => typeof value === "string" ? JSON.parse(value) : value || {};

const assertImageUrl = (value, label = "About images") => {
  if (!value) return;
  if (typeof value !== "string" || value.length > 2048 || value.includes("\\") || [...value].some((character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127)) throw errorWithStatus(`${label} must use a valid http/https URL or local upload path`, 400);
  if (/^\/uploads\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(value)) return;
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) return;
  } catch { /* handled below */ }
  throw errorWithStatus(`${label} must use a valid http/https URL or local upload path`, 400);
};

const validateAboutPayload = (result) => {
  for (const [field, value] of Object.entries(result)) {
    if (["approach_steps", "team_members"].includes(field)) continue;
    if (typeof value !== "string" || value.length > (field.endsWith("_image") ? 2048 : /text|detail|summary/.test(field) ? 10000 : 300)) throw errorWithStatus(`Invalid About page ${field}`, 400);
  }
  for (const field of ["hero_image", "philosophy_image"]) assertImageUrl(result[field]);
  for (const [field, limit, fields, required] of [
    ["approach_steps", 12, ["id", "title", "description", "icon"], ["id", "title", "description", "icon"]],
    ["team_members", 50, ["id", "name", "role", "image"], ["id", "name", "role"]],
  ]) {
    if (result[field] === undefined) continue;
    if (!Array.isArray(result[field]) || result[field].length > limit) throw errorWithStatus(`${field} must contain at most ${limit} items`, 400);
    const ids = new Set();
    for (const item of result[field]) {
      if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some((key) => !fields.includes(key))) throw errorWithStatus(`${field} accepts public presentation fields only`, 400);
      for (const key of required) if (typeof item[key] !== "string" || !item[key].trim()) throw errorWithStatus(`${field}: ${key} is required`, 400);
      for (const [key, value] of Object.entries(item)) if (typeof value !== "string" || value.length > (key === "description" ? 5000 : key === "image" ? 2048 : 300)) throw errorWithStatus(`Invalid ${field} ${key}`, 400);
      if (!/^[a-z0-9_-]{1,64}$/i.test(item.id) || ids.has(item.id)) throw errorWithStatus(`${field} needs unique valid item IDs`, 400);
      ids.add(item.id);
      if (field === "approach_steps" && !["Lightbulb", "Rocket", "Award", "Sparkles"].includes(item.icon)) throw errorWithStatus("Unsupported approach icon", 400);
      if (field === "team_members") assertImageUrl(item.image);
    }
  }
};

const validateAppearancePayload = (entity, result) => {
  if (typeof result.title !== "string" || result.title.length > 300) throw errorWithStatus("Configuration title must be at most 300 characters", 400);
  if (entity === "DashboardLayout") {
    if (!Array.isArray(result.card_order) || result.card_order.length > dashboardCards.size || result.card_order.some((id) => typeof id !== "string" || !dashboardCards.has(id))) throw errorWithStatus("Dashboard order must contain known dashboard card names", 400);
    if (new Set(result.card_order).size !== result.card_order.length) throw errorWithStatus("Dashboard order cannot contain duplicate cards", 400);
    return;
  }
  if (!result.icons || typeof result.icons !== "object" || Array.isArray(result.icons)) throw errorWithStatus("Website icons must be an object", 400);
  const entries = Object.entries(result.icons);
  if (entries.length > 120) throw errorWithStatus("Configure at most 120 website icons", 400);
  for (const [key, value] of entries) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/.test(key) || !/^(dashboard|values|process|services|stats|about)\.[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(key)) throw errorWithStatus("Invalid website icon slot key", 400);
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((field) => !["icon_name", "icon_url"].includes(field))) throw errorWithStatus("Icon overrides accept only icon_name and icon_url", 400);
    if (typeof value.icon_name !== "string" || (value.icon_name !== "" && !websiteIconNames.has(value.icon_name))) throw errorWithStatus("Choose a supported website icon", 400);
    if (typeof value.icon_url !== "string") throw errorWithStatus("Icon image URL must be text", 400);
    assertImageUrl(value.icon_url, "Icon images");
  }
};

const validateNavigationPayload = (result) => {
  if (typeof result.title !== "string" || result.title.length > 300) throw errorWithStatus("Navigation title must be at most 300 characters", 400);
  if (!Array.isArray(result.items) || result.items.length > 250) throw errorWithStatus("Navigation must contain at most 250 items", 400);
  if (!Object.hasOwn(result, "dropdown_enabled")) result.dropdown_enabled = false;
  if (!Object.hasOwn(result, "dropdown_label")) result.dropdown_label = "More";
  if (typeof result.dropdown_enabled !== "boolean") throw errorWithStatus("Navigation dropdown visibility must be a boolean", 400);
  if (typeof result.dropdown_label !== "string" || !result.dropdown_label.trim() || result.dropdown_label.trim().length > 60 || [...result.dropdown_label].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw errorWithStatus("Navigation dropdown title must contain 1 to 60 characters without control characters", 400);
  result.dropdown_label = result.dropdown_label.trim();
  const ids = new Set(); const pages = new Set();
  result.items = result.items.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item) || Object.keys(item).some((key) => !["id", "page", "label", "visible", "in_dropdown"].includes(key))) throw errorWithStatus("Navigation items accept only id, page, label, visible and in_dropdown", 400);
    if (typeof item.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(item.id) || ids.has(item.id)) throw errorWithStatus("Navigation items need unique valid IDs", 400);
    const customPage = typeof item.page === "string" && item.page.startsWith("custom:") && uuidPattern.test(item.page.slice(7));
    if (typeof item.page !== "string" || (!navigationPages.has(item.page) && !customPage) || pages.has(item.page.toLowerCase())) throw errorWithStatus("Navigation items need unique supported pages", 400);
    if (typeof item.label !== "string" || !item.label.trim() || item.label.trim().length > 60 || [...item.label].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw errorWithStatus("Navigation labels must contain 1 to 60 characters without control characters", 400);
    if (typeof item.visible !== "boolean") throw errorWithStatus("Navigation visibility must be a boolean", 400);
    if (Object.hasOwn(item, "in_dropdown") && typeof item.in_dropdown !== "boolean") throw errorWithStatus("Navigation dropdown placement must be a boolean", 400);
    ids.add(item.id); pages.add(item.page.toLowerCase());
    return { id: item.id, page: customPage ? item.page.toLowerCase() : item.page, label: item.label.trim(), visible: item.visible, in_dropdown: item.in_dropdown ?? false };
  });
};

const assertSafeJson = (value, depth = 0) => {
  if (depth > 8) throw errorWithStatus("Content nesting is too deep", 400);
  if (Array.isArray(value)) {
    if (value.length > 250) throw errorWithStatus("Too many content items", 400);
    value.forEach((child) => assertSafeJson(child, depth + 1));
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(key) || /password|token|ciphertext|otp|secret|private_key/i.test(key)) throw errorWithStatus("Private fields cannot be stored in public content", 400);
      assertSafeJson(child, depth + 1);
    }
  }
};

export const cleanPublicPayload = (entity, payload, previous = {}) => {
  const canonical = normalizeEntity(entity);
  const fields = publicFields[canonical];
  if (!fields) throw errorWithStatus("Unsupported content entity", 400);
  const result = {};
  for (const field of fields) {
    if (Object.hasOwn(payload, field)) result[field] = payload[field];
    else if (Object.hasOwn(previous, field)) result[field] = previous[field];
  }
  assertSafeJson(result);
  if (Buffer.byteLength(JSON.stringify(result)) > 1024 * 1024) throw errorWithStatus("Content is too large", 400);
  if (canonical === "CustomPage") {
    try { return validateCustomPage(result); }
    catch (error) { throw errorWithStatus(error.message, 400); }
  }
  const arrayFields = new Set(["features", "gallery_images", "sub_services", "locations", "approach_steps", "team_members", "card_order", "items"]);
  const booleanFields = new Set(["active", "featured", "published"]);
  for (const [field, value] of Object.entries(result)) {
    if (arrayFields.has(field) || field === "social_links" || field === "floating_social" || field === "icons" || field === "order" || (canonical === "NavigationMenu" && field === "dropdown_enabled")) continue;
    if (booleanFields.has(field)) {
      if (![true, false, 0, 1].includes(value)) throw errorWithStatus(`${field} must be a boolean`, 400);
      result[field] = Boolean(value);
    } else if (value != null && typeof value !== "string") throw errorWithStatus(`${field} must be text`, 400);
  }
  if (canonical !== "ContactInfo") {
    const required = canonical === "Stat" ? "label" : "title";
    if (typeof result[required] !== "string" || !result[required].trim()) throw errorWithStatus(`${required} is required`, 400);
  }
  if (result.order != null && (!Number.isFinite(Number(result.order)) || Math.abs(Number(result.order)) > 1000000)) throw errorWithStatus("Invalid order", 400);
  if (result.order != null) result.order = Number(result.order);
  if (result.theme_color && !/^#[0-9a-f]{6}$/i.test(result.theme_color)) throw errorWithStatus("Invalid theme color", 400);
  for (const field of ["features", "gallery_images", "sub_services", "locations"]) {
    if (result[field] != null && !Array.isArray(result[field])) throw errorWithStatus(`${field} must be an array`, 400);
  }
  for (const field of ["features", "gallery_images", "locations"]) {
    if (result[field]?.some((item) => typeof item !== "string")) throw errorWithStatus(`${field} must contain strings`, 400);
  }
  if (result.sub_services) {
    const childFields = new Set(["id", "title", "slug", "description", "image", "features", "order"]);
    for (const child of result.sub_services) {
      if (!child || typeof child !== "object" || Array.isArray(child) || Object.keys(child).some((key) => !childFields.has(key))) throw errorWithStatus("Sub-services accept public presentation fields only", 400);
      for (const [key, value] of Object.entries(child)) {
        if (key === "features") {
          if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw errorWithStatus("Sub-service features must contain strings", 400);
        } else if (key === "order") {
          if (!Number.isFinite(Number(value)) || typeof value === "object") throw errorWithStatus("Invalid sub-service order", 400);
        } else if (key === "id") {
          if (!["string", "number"].includes(typeof value)) throw errorWithStatus("Invalid sub-service id", 400);
        } else if (typeof value !== "string") throw errorWithStatus("Invalid sub-service value", 400);
      }
    }
  }
  if (result.locations) result.locations = [...new Set(result.locations.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()))];
  if (canonical === "ContactInfo") {
    result.social_links = validateSocialLinks(result.social_links);
    result.floating_social = validateFloatingSocial(result.floating_social, result.social_links);
  }
  if (canonical === "AboutPage") validateAboutPayload(result);
  if (appearanceEntities.has(canonical)) validateAppearancePayload(canonical, result);
  if (canonical === "NavigationMenu") validateNavigationPayload(result);
  return result;
};

export const createContentRepository = ({ database, encrypt = encryptText, decrypt = decryptText, hash = lookupHash, audit = writeAudit }) => {
  const transaction = async (callback) => {
    const connection = await database.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      try { await connection.rollback(); } catch { /* retain original error */ }
      throw error;
    } finally { connection.release(); }
  };
  const assertActor = (actor) => { if (!actor?.userId) throw errorWithStatus("Authentication required", 401); };
  const assertId = (id) => { if (!uuidPattern.test(id)) throw errorWithStatus("Invalid record id", 400); };
  const readPublic = async (connection, entity, id, lock = false) => {
    const [rows] = await connection.execute(`SELECT * FROM app_content WHERE entity_type = ? AND id = ?${lock ? " FOR UPDATE" : ""}`, [entity, id]);
    return rows[0];
  };
  const mapPublic = (row) => {
    const payload = jsonObject(row.payload);
    // Older saved menus have no placement/settings fields. Add harmless read
    // defaults without rewriting their saved content or increasing its version.
    const normalized = row.entity_type === "NavigationMenu" ? {
      dropdown_enabled: false, dropdown_label: "More", ...payload,
      items: Array.isArray(payload.items) ? payload.items.map((item) => ({ in_dropdown: false, ...item })) : payload.items,
    } : payload;
    return { ...normalized, id: row.id, created_date: isoDate(row.created_at), updated_date: isoDate(row.updated_at), version: row.version };
  };
  const savePublic = async (connection, entity, id, payload, isNew) => {
    if (isNew) await connection.execute("INSERT INTO app_content (entity_type, id, payload, version, created_at, updated_at) VALUES (?, ?, ?, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())", [entity, id, JSON.stringify(payload)]);
    else await connection.execute("UPDATE app_content SET payload = ?, version = version + 1, updated_at = UTC_TIMESTAMP() WHERE entity_type = ? AND id = ?", [JSON.stringify(payload), entity, id]);
  };
  const mapContact = async (connection, row) => {
    const metadata = await readPublic(connection, "ContactInfo", row.id);
    const publicMetadata = jsonObject(metadata?.payload);
    const [locations] = await connection.execute("SELECT location_name FROM organization_locations WHERE organization_profile_id = ? ORDER BY sort_order, created_at", [row.id]);
    return {
      organization_name: row.organization_name, address: row.address || "", working_hours: row.working_hours || "", theme_color: row.theme_color || "",
      locations: locations.map((item) => item.location_name), logo_url: row.logo_url || "", ...publicMetadata, ...normalizeSocialMedia(publicMetadata),
      id: row.id, email: decrypt(row.contact_email_ciphertext, context("ContactInfo", row.id, "email")) || "",
      phone: decrypt(row.contact_phone_ciphertext, context("ContactInfo", row.id, "phone")) || "",
      created_date: isoDate(row.created_at), updated_date: isoDate(row.updated_at), version: metadata?.version || 1,
    };
  };
  const mapConsultation = async (connection, row) => {
    const [details] = await connection.execute("SELECT payload_ciphertext FROM app_private_details WHERE entity_type = 'Consultation' AND entity_id = ?", [row.id]);
    if (!details.length && [row.location, row.budget, row.message, row.preferred_date].some((value) => value != null)) throw errorWithStatus("Legacy consultation requires a controlled encryption migration", 409);
    const extra = details[0] ? JSON.parse(decrypt(details[0].payload_ciphertext, context("Consultation", row.id, "details"))) : {};
    return { ...extra, id: row.id,
      full_name: decrypt(row.full_name_ciphertext, context("Consultation", row.id, "full_name")),
      email: decrypt(row.email_ciphertext, context("Consultation", row.id, "email")),
      phone: decrypt(row.phone_ciphertext, context("Consultation", row.id, "phone")),
      status: row.status, project_type: extra.project_type ?? row.project_type ?? "", assigned_to_user_id: row.assigned_to_user_id,
      created_date: isoDate(row.created_at), updated_date: isoDate(row.updated_at),
    };
  };
  const listContent = async (requested) => {
    const entity = normalizeEntity(requested);
    if (entity === "ContactInfo") {
      const [rows] = await database.execute("SELECT op.*, ma.public_url AS logo_url FROM organization_profile op LEFT JOIN media_assets ma ON ma.id = op.logo_asset_id ORDER BY op.created_at, op.id");
      return Promise.all(rows.map((row) => mapContact(database, row)));
    }
    if (entity === "Consultation") {
      const [rows] = await database.execute("SELECT * FROM consultation_requests ORDER BY created_at DESC LIMIT 500");
      return Promise.all(rows.map((row) => mapConsultation(database, row)));
    }
    if (!publicFields[entity]) throw errorWithStatus("Unsupported content entity", 400);
    const [rows] = await database.execute("SELECT * FROM app_content WHERE entity_type = ? ORDER BY created_at DESC", [entity]);
    return rows.map(mapPublic).sort((a, b) => (a.order || 0) - (b.order || 0));
  };
  const saveContact = async (connection, id, payload, actor, isNew) => {
    let existing = {};
    if (!isNew) {
      const [rows] = await connection.execute("SELECT * FROM organization_profile WHERE id = ? FOR UPDATE", [id]);
      if (!rows[0]) throw errorWithStatus("Contact profile not found", 404);
      existing = await mapContact(connection, rows[0]);
      if ((Object.hasOwn(payload, "social_links") || Object.hasOwn(payload, "floating_social")) && (!Number.isSafeInteger(payload.version) || payload.version < 1)) throw errorWithStatus("A valid saved version is required; refresh social media before saving", 400);
      if (payload.version != null && Number(payload.version) !== existing.version) throw errorWithStatus("Contact info was changed by another editor; refresh before saving", 409);
    }
    const publicData = cleanPublicPayload("ContactInfo", payload, existing);
    const merged = { ...existing, ...payload, ...publicData };
    for (const field of ["email", "phone"]) if (merged[field] != null && typeof merged[field] !== "string") throw errorWithStatus(`Invalid ${field}`, 400);
    const values = [publicData.organization_name || "D16 Interior", encrypt(merged.email || null, context("ContactInfo", id, "email")),
      encrypt(merged.phone || null, context("ContactInfo", id, "phone")), merged.email ? hash(merged.email.trim().toLowerCase()) : null,
      merged.phone ? hash(merged.phone.replace(/\s/g, "")) : null, publicData.address || null, publicData.working_hours || null, publicData.theme_color || null];
    if (isNew) await connection.execute("INSERT INTO organization_profile (id, organization_name, contact_email_ciphertext, contact_phone_ciphertext, contact_email_hash, contact_phone_hash, address, working_hours, theme_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())", [id, ...values]);
    else await connection.execute("UPDATE organization_profile SET organization_name = ?, contact_email_ciphertext = ?, contact_phone_ciphertext = ?, contact_email_hash = ?, contact_phone_hash = ?, address = ?, working_hours = ?, theme_color = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?", [...values, id]);
    const metadata = await readPublic(connection, "ContactInfo", id);
    await savePublic(connection, "ContactInfo", id, publicData, !metadata);
    // Legacy profiles without app_content report version 1 on read. Their first
    // edit must advance to version 2 as well, so another editor cannot reuse 1.
    if (!metadata && !isNew) await savePublic(connection, "ContactInfo", id, publicData, false);
    await connection.execute("DELETE FROM organization_locations WHERE organization_profile_id = ?", [id]);
    for (const [order, location] of (publicData.locations || []).entries()) await connection.execute("INSERT INTO organization_locations (id, organization_profile_id, location_name, sort_order) VALUES (?, ?, ?, ?)", [randomUUID(), id, location, order]);
    await audit(connection, { actor, action: isNew ? "create" : "update", entityName: "ContactInfo", entityId: id, changedFields: Object.keys(payload).filter((field) => [...publicFields.ContactInfo, "email", "phone"].includes(field)) });
    const [rows] = await connection.execute("SELECT * FROM organization_profile WHERE id = ?", [id]);
    return mapContact(connection, rows[0]);
  };
  const saveConsultation = async (connection, id, payload, actor, isNew) => {
    let existing = {};
    if (!isNew) {
      const [rows] = await connection.execute("SELECT * FROM consultation_requests WHERE id = ? FOR UPDATE", [id]);
      if (!rows[0]) throw errorWithStatus("Consultation not found", 404);
      existing = await mapConsultation(connection, rows[0]);
    }
    const merged = { ...existing };
    for (const field of consultationFields) if (Object.hasOwn(payload, field)) merged[field] = payload[field];
    for (const field of ["full_name", "email", "phone"]) if (typeof merged[field] !== "string" || !merged[field].trim()) throw errorWithStatus(`${field} is required`, 400);
    for (const field of privateFields) if (merged[field] != null && (typeof merged[field] !== "string" || merged[field].length > 20000)) throw errorWithStatus(`Invalid ${field}`, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(merged.email)) throw errorWithStatus("Invalid email", 400);
    const status = isNew && !actor?.userId ? "pending" : merged.status || "pending";
    if (!consultationStatuses.has(status)) throw errorWithStatus("Invalid consultation status", 400);
    const projectType = merged.project_type || null;
    if (projectType && !["residential", "commercial", "restaurant", "office", "other"].includes(projectType)) throw errorWithStatus("Invalid project type", 400);
    const assigned = actor?.userId ? merged.assigned_to_user_id || null : null;
    if (assigned) assertId(assigned);
    const details = Object.fromEntries(["location", "budget", "message", "preferred_date"].map((field) => [field, merged[field] || ""]));
    details.project_type = projectType;
    const values = [encrypt(merged.full_name, context("Consultation", id, "full_name")), encrypt(merged.email, context("Consultation", id, "email")), encrypt(merged.phone, context("Consultation", id, "phone")), hash(merged.email.trim().toLowerCase()), hash(merged.phone.replace(/\s/g, "")), null, status, assigned];
    if (isNew) await connection.execute("INSERT INTO consultation_requests (id, full_name_ciphertext, email_ciphertext, phone_ciphertext, email_hash, phone_hash, project_type, status, assigned_to_user_id, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())", [id, ...values, actor?.userId || null]);
    else await connection.execute("UPDATE consultation_requests SET full_name_ciphertext = ?, email_ciphertext = ?, phone_ciphertext = ?, email_hash = ?, phone_hash = ?, project_type = ?, status = ?, assigned_to_user_id = ?, location = NULL, budget = NULL, message = NULL, preferred_date = NULL, updated_at = UTC_TIMESTAMP() WHERE id = ?", [...values, id]);
    await connection.execute("INSERT INTO app_private_details (entity_type, entity_id, payload_ciphertext) VALUES ('Consultation', ?, ?) ON DUPLICATE KEY UPDATE payload_ciphertext = VALUES(payload_ciphertext)", [id, encrypt(JSON.stringify(details), context("Consultation", id, "details"))]);
    await audit(connection, { actor, action: isNew ? "create" : "update", entityName: "Consultation", entityId: id, changedFields: Object.keys(payload).filter((field) => consultationFields.includes(field)) });
    return { ...merged, id, status, assigned_to_user_id: assigned };
  };
  const save = async (requested, id, payload, actor, isNew) => {
    const entity = normalizeEntity(requested);
    if (entity !== "Consultation" || !isNew) assertActor(actor);
    assertId(id);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw errorWithStatus("Invalid content payload", 400);
    return transaction(async (connection) => {
      if (entity === "ContactInfo") return saveContact(connection, id, payload, actor, isNew);
      if (entity === "Consultation") return saveConsultation(connection, id, payload, actor, isNew);
      const previous = isNew ? null : await readPublic(connection, entity, id, true);
      if (!isNew && !previous) throw errorWithStatus("Content not found", 404);
      if (!isNew && versionedConfigurations.has(entity) && (!Number.isSafeInteger(payload.version) || payload.version < 1)) throw errorWithStatus("A valid saved version is required; refresh this configuration before saving", 400);
      if (previous && payload.version != null && Number(payload.version) !== previous.version) throw errorWithStatus("Content was changed by another editor; refresh before saving", 409);
      const previousPayload = previous ? jsonObject(previous.payload) : {};
      const cleaned = cleanPublicPayload(entity, payload, previousPayload);
      if (entity === "NavigationMenu") {
        for (const item of cleaned.items) if (item.page.startsWith("custom:") && !await readPublic(connection, "CustomPage", item.page.slice(7))) throw errorWithStatus("A linked custom page no longer exists; choose a saved page before saving navigation", 400);
      }
      try { await savePublic(connection, entity, id, cleaned, isNew); }
      catch (error) {
        if (Object.hasOwn(singletonIds, entity) && error.code === "ER_DUP_ENTRY") throw errorWithStatus("This configuration already exists; refresh before saving", 409);
        throw error;
      }
      const changedFields = Object.keys(cleaned).filter((key) => Object.hasOwn(payload, key)
        && ((!Object.hasOwn(singletonIds, entity) && entity !== "CustomPage") || isNew || !isDeepStrictEqual(cleaned[key], previousPayload[key])));
      await audit(connection, { actor, action: isNew ? "create" : "update", entityName: entity, entityId: id, changedFields });
      return mapPublic(await readPublic(connection, entity, id));
    });
  };
  const deleteContent = async (requested, id, actor) => {
    assertActor(actor); assertId(id);
    const entity = normalizeEntity(requested);
    if (entity === "ContactInfo") throw errorWithStatus("Contact profile deletion is not supported", 405);
    if (entity === "AboutPage") throw errorWithStatus("The About page cannot be deleted; edit its sections instead", 405);
    if (entity === "CustomPage") throw errorWithStatus("Custom pages cannot be deleted; unpublish the page to keep its content and history", 405);
    if (versionedConfigurations.has(entity)) throw errorWithStatus("This configuration cannot be deleted; reset its settings instead", 405);
    if (entity !== "Consultation" && !publicFields[entity]) throw errorWithStatus("Unsupported content entity", 400);
    return transaction(async (connection) => {
      const [result] = entity === "Consultation"
        ? await connection.execute("DELETE FROM consultation_requests WHERE id = ?", [id])
        : await connection.execute("DELETE FROM app_content WHERE entity_type = ? AND id = ?", [entity, id]);
      if (!result.affectedRows) throw errorWithStatus("Content not found", 404);
      if (entity === "Consultation") await connection.execute("DELETE FROM app_private_details WHERE entity_type = 'Consultation' AND entity_id = ?", [id]);
      await audit(connection, { actor, action: "delete", entityName: entity, entityId: id, changedFields: [] });
      return true;
    });
  };
  return { listContent, createContent: (entity, payload, actor) => save(entity, Object.hasOwn(singletonIds, entity) ? singletonIds[entity] : randomUUID(), payload, actor, true), updateContent: (entity, id, payload, actor) => save(entity, id, payload, actor, false), deleteContent };
};

export const { listContent, createContent, updateContent, deleteContent } = createContentRepository({ database: pool });
