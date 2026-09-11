import { listContent, createContent, updateContent, deleteContent } from "./contentService.js";

export const listServices = () => listContent("Service");
export const createService = (payload, actor) => createContent("Service", payload, actor);
export const updateService = (id, payload, actor) => updateContent("Service", id, payload, actor);
export const deleteService = (id, actor) => deleteContent("Service", id, actor);
