import { listContent, createContent, updateContent, deleteContent } from "./contentService.js";

export const listBlogPosts = () => listContent("BlogPost");
export const createBlogPost = (payload, actor) => createContent("BlogPost", payload, actor);
export const updateBlogPost = (id, payload, actor) => updateContent("BlogPost", id, payload, actor);
export const deleteBlogPost = (id, actor) => deleteContent("BlogPost", id, actor);
