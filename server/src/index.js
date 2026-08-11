import express from "express";
import cors from "cors";
import { pool } from "./db.js";
import { createContactInfo, listContactInfo, updateContactInfo } from "./contactInfoService.js";
import { createService, deleteService, listServices, updateService } from "./serviceService.js";
import { createStat, deleteStat, listStats, updateStat } from "./statsService.js";
import { createProject, deleteProject, listProjects, updateProject } from "./projectService.js";
import { createBlogPost, deleteBlogPost, listBlogPosts, updateBlogPost } from "./blogPostService.js";
import { shouldUseLocalFallback } from "./dbFallback.js";

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.execute("SELECT 1");
    res.json({ ok: true, service: "d16-api", database: "connected" });
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      console.warn("[api] health check degraded, using local fallback:", error?.message || error);
      res.json({ ok: true, service: "d16-api", database: "unavailable", mode: "local-fallback" });
      return;
    }

    console.error("[api] health check failed:", error?.message || error);
    res.status(500).json({ ok: false, error: "Database connection failed" });
  }
});

app.get("/api/contact-info", async (_req, res) => {
  try {
    const data = await listContactInfo();
    res.json(data);
  } catch (error) {
    console.error("[api] GET /api/contact-info failed:", error?.message || error);
    res.status(500).json({ error: "Failed to load contact info" });
  }
});

app.post("/api/contact-info", async (req, res) => {
  try {
    const created = await createContactInfo(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    console.error("[api] POST /api/contact-info failed:", error?.message || error);
    res.status(500).json({ error: "Failed to create contact info" });
  }
});

app.put("/api/contact-info/:id", async (req, res) => {
  try {
    const updated = await updateContactInfo(req.params.id, req.body || {});
    res.json(updated);
  } catch (error) {
    if (error.message === "Contact profile not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("[api] PUT /api/contact-info/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to update contact info" });
  }
});

app.get("/api/services", async (_req, res) => {
  try {
    const data = await listServices();
    res.json(data);
  } catch (error) {
    console.error("[api] GET /api/services failed:", error?.message || error);
    res.status(500).json({ error: "Failed to load services" });
  }
});

app.post("/api/services", async (req, res) => {
  try {
    const created = await createService(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    console.error("[api] POST /api/services failed:", error?.message || error);
    res.status(500).json({ error: "Failed to create service" });
  }
});

app.put("/api/services/:id", async (req, res) => {
  try {
    const updated = await updateService(req.params.id, req.body || {});
    res.json(updated);
  } catch (error) {
    if (error.message === "Service not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("[api] PUT /api/services/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to update service" });
  }
});

app.delete("/api/services/:id", async (req, res) => {
  try {
    const removed = await deleteService(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Service not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error("[api] DELETE /api/services/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to delete service" });
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    const data = await listStats();
    res.json(data);
  } catch (error) {
    console.error("[api] GET /api/stats failed:", error?.message || error);
    res.status(500).json({ error: "Failed to load stats" });
  }
});

app.post("/api/stats", async (req, res) => {
  try {
    const created = await createStat(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    console.error("[api] POST /api/stats failed:", error?.message || error);
    res.status(500).json({ error: "Failed to create stat" });
  }
});

app.put("/api/stats/:id", async (req, res) => {
  try {
    const updated = await updateStat(req.params.id, req.body || {});
    res.json(updated);
  } catch (error) {
    if (error.message === "Stat not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("[api] PUT /api/stats/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to update stat" });
  }
});

app.delete("/api/stats/:id", async (req, res) => {
  try {
    const removed = await deleteStat(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Stat not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error("[api] DELETE /api/stats/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to delete stat" });
  }
});

app.get("/api/projects", async (_req, res) => {
  try {
    const data = await listProjects();
    res.json(data);
  } catch (error) {
    console.error("[api] GET /api/projects failed:", error?.message || error);
    res.status(500).json({ error: "Failed to load projects" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const created = await createProject(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    console.error("[api] POST /api/projects failed:", error?.message || error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.put("/api/projects/:id", async (req, res) => {
  try {
    const updated = await updateProject(req.params.id, req.body || {});
    res.json(updated);
  } catch (error) {
    if (error.message === "Project not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("[api] PUT /api/projects/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    const removed = await deleteProject(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error("[api] DELETE /api/projects/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

app.get("/api/blog-posts", async (_req, res) => {
  try {
    const data = await listBlogPosts();
    res.json(data);
  } catch (error) {
    console.error("[api] GET /api/blog-posts failed:", error?.message || error);
    res.status(500).json({ error: "Failed to load blog posts" });
  }
});

app.post("/api/blog-posts", async (req, res) => {
  try {
    const created = await createBlogPost(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    console.error("[api] POST /api/blog-posts failed:", error?.message || error);
    res.status(500).json({ error: "Failed to create blog post" });
  }
});

app.put("/api/blog-posts/:id", async (req, res) => {
  try {
    const updated = await updateBlogPost(req.params.id, req.body || {});
    res.json(updated);
  } catch (error) {
    if (error.message === "Blog post not found") {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error("[api] PUT /api/blog-posts/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to update blog post" });
  }
});

app.delete("/api/blog-posts/:id", async (req, res) => {
  try {
    const removed = await deleteBlogPost(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error("[api] DELETE /api/blog-posts/:id failed:", error?.message || error);
    res.status(500).json({ error: "Failed to delete blog post" });
  }
});

app.listen(port, () => {
  console.log(`[d16-api] listening on http://localhost:${port}`);
});
