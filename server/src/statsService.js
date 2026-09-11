import { listContent, createContent, updateContent, deleteContent } from "./contentService.js";

export const listStats = () => listContent("Stat");
export const createStat = (payload, actor) => createContent("Stat", payload, actor);
export const updateStat = (id, payload, actor) => updateContent("Stat", id, payload, actor);
export const deleteStat = (id, actor) => deleteContent("Stat", id, actor);
