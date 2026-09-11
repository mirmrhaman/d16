import { blogPostsClient } from "@/api/blogPostsClient";
import { IS_DEMO, requestJson } from "@/api/transport";

export async function readPublishedPosts() {
  // The server filters publication dates before responding to /blog-posts.
  // Never request admin=1 here; it is reserved for authenticated editorial reads.
  const posts = IS_DEMO ? await blogPostsClient.list() : await requestJson("/blog-posts");
  if (!Array.isArray(posts)) throw new Error("Articles are temporarily unavailable.");
  // Demo data uses the same publication rules as the server endpoint.
  return posts.filter((post) => {
    const published = post.published_date || post.published_at;
    return post.published !== false && post.published !== 0 && published && Number.isFinite(Date.parse(published)) && Date.parse(published) <= Date.now();
  }).sort((a, b) => Date.parse(b.published_date || b.published_at) - Date.parse(a.published_date || a.published_at));
}
