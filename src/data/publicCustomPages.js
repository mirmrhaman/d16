import { isPublishedCustomPage, validateCustomPage } from '../../server/src/customPageSchema.js';

const CONTENT_FIELDS = ['title', 'page_type', 'intro', 'body', 'hero_image', 'items', 'published'];

// Validate cached data too: an admin query or old preview data must never make a
// draft visible just because its ID matches a public route.
export function resolvePublicCustomPage(records, pageId, options = {}) {
  if (!Array.isArray(records)) return { status: 'unavailable', page: null };
  const record = records.find((candidate) => candidate && !Array.isArray(candidate) && candidate.id === pageId);
  if (!record || !isPublishedCustomPage(record)) return { status: 'not-found', page: null };
  try {
    const payload = Object.fromEntries(CONTENT_FIELDS.filter((field) => Object.hasOwn(record, field)).map((field) => [field, record[field]]));
    const content = validateCustomPage(payload, options);
    return { status: 'available', page: { ...content, id: record.id } };
  } catch {
    return { status: 'unavailable', page: null };
  }
}
