import { base44 } from "@/api/base44Client";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const CONTACT_INFO_ENDPOINT = `${API_BASE_URL}/api/contact-info`;
const IS_GITHUB_PAGES = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload && typeof payload === "object") return [payload];
  return [];
};

const normalizeContact = (item) => {
  if (!item || typeof item !== "object") return item;
  const locations = Array.isArray(item.locations)
    ? item.locations
    : typeof item.locations === "string"
      ? item.locations.split(",").map((v) => v.trim()).filter(Boolean)
      : [];

  return {
    ...item,
    locations,
  };
};

const requestJson = async (url, options) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status}${bodyText ? `: ${bodyText}` : ""}`);
  }

  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const contactInfoClient = {
  async list() {
    if (IS_GITHUB_PAGES) {
      return base44.entities.ContactInfo.list();
    }
    try {
      const payload = await requestJson(CONTACT_INFO_ENDPOINT, { method: "GET" });
      return toArray(payload).map(normalizeContact);
    } catch (error) {
      console.warn("[contactInfoClient] API list failed, using local fallback", error);
      return base44.entities.ContactInfo.list();
    }
  },

  async create(data) {
    if (IS_GITHUB_PAGES) {
      return base44.entities.ContactInfo.create(data);
    }
    try {
      const payload = await requestJson(CONTACT_INFO_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return normalizeContact(payload?.data || payload);
    } catch (error) {
      console.warn("[contactInfoClient] API create failed, using local fallback", error);
      return base44.entities.ContactInfo.create(data);
    }
  },

  async update(id, data) {
    if (IS_GITHUB_PAGES) {
      return base44.entities.ContactInfo.update(id, data);
    }
    try {
      const payload = await requestJson(`${CONTACT_INFO_ENDPOINT}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return normalizeContact(payload?.data || payload);
    } catch (error) {
      console.warn("[contactInfoClient] API update failed, using local fallback", error);
      return base44.entities.ContactInfo.update(id, data);
    }
  },
};
