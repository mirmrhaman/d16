import { base44 } from "@/api/base44Client";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const PROJECTS_ENDPOINT = `${API_BASE_URL}/api/projects`;
const IS_GITHUB_PAGES = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload && typeof payload === "object") return [payload];
  return [];
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

export const projectsClient = {
  async list() {
    if (IS_GITHUB_PAGES) {
      return base44.entities.Project.list("-created_date");
    }
    try {
      const payload = await requestJson(PROJECTS_ENDPOINT, { method: "GET" });
      return toArray(payload);
    } catch (error) {
      console.warn("[projectsClient] API list failed, using local fallback", error);
      return base44.entities.Project.list("-created_date");
    }
  },

  async create(data) {
    if (IS_GITHUB_PAGES) {
      return base44.entities.Project.create(data);
    }
    try {
      const payload = await requestJson(PROJECTS_ENDPOINT, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return payload?.data || payload;
    } catch (error) {
      console.warn("[projectsClient] API create failed, using local fallback", error);
      return base44.entities.Project.create(data);
    }
  },

  async update(id, data) {
    if (IS_GITHUB_PAGES) {
      return base44.entities.Project.update(id, data);
    }
    try {
      const payload = await requestJson(`${PROJECTS_ENDPOINT}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return payload?.data || payload;
    } catch (error) {
      console.warn("[projectsClient] API update failed, using local fallback", error);
      return base44.entities.Project.update(id, data);
    }
  },

  async delete(id) {
    if (IS_GITHUB_PAGES) {
      return base44.entities.Project.delete(id);
    }
    try {
      await requestJson(`${PROJECTS_ENDPOINT}/${id}`, { method: "DELETE" });
      return true;
    } catch (error) {
      console.warn("[projectsClient] API delete failed, using local fallback", error);
      return base44.entities.Project.delete(id);
    }
  },
};
