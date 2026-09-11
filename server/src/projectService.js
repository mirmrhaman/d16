import { listContent, createContent, updateContent, deleteContent } from "./contentService.js";

export const listProjects = () => listContent("Project");
export const createProject = (payload, actor) => createContent("Project", payload, actor);
export const updateProject = (id, payload, actor) => updateContent("Project", id, payload, actor);
export const deleteProject = (id, actor) => deleteContent("Project", id, actor);
