import { listContent, createContent, updateContent } from "./contentService.js";

export const listContactInfo = () => listContent("ContactInfo");
export const createContactInfo = (payload, actor) => createContent("ContactInfo", payload, actor);
export const updateContactInfo = (id, payload, actor) => updateContent("ContactInfo", id, payload, actor);
