// Shared by the API, browser preview and public gallery. No server-only imports.
export const MAX_CONCEPT_GALLERY_IMAGES = 40;
export const DEFAULT_GALLERY_LABEL = 'View Gallery';
export const DEMO_GALLERY_FILE_BYTES = 500 * 1024;
const invalid = (message) => Object.assign(new Error(message), { status: 400 });

export function isSafeGalleryImage(value, { allowDataImages = false } = {}) {
  if (typeof value !== 'string' || !value || value.includes('\\') || [...value].some((char) => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127)) return false;
  if (allowDataImages && value.startsWith('data:')) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match || match[2].length % 4 !== 0) return false;
    const bytes = match[2].length * 3 / 4 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
    return bytes > 0 && bytes <= DEMO_GALLERY_FILE_BYTES;
  }
  if (value.length > 2048 || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)) return false;
  if (/^\/uploads\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(value)) return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export function validateConceptGallery(section, options = {}) {
  const result = {};
  // Leave old records unchanged until an administrator explicitly adds a gallery.
  if (Object.hasOwn(section, 'gallery_button_label')) {
    const value = section.gallery_button_label;
    if (typeof value !== 'string' || value.trim().length > 60 || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw invalid('Gallery button name must be at most 60 characters without control characters.');
    result.gallery_button_label = value.trim() || DEFAULT_GALLERY_LABEL;
  }
  if (Object.hasOwn(section, 'gallery_images')) {
    if (!Array.isArray(section.gallery_images) || section.gallery_images.length > MAX_CONCEPT_GALLERY_IMAGES) throw invalid(`A section gallery can contain up to ${MAX_CONCEPT_GALLERY_IMAGES} images.`);
    result.gallery_images = section.gallery_images.map((value) => {
      const url = typeof value === 'string' ? value.trim() : value;
      if (!isSafeGalleryImage(url, options)) throw invalid('Gallery images must use valid http/https image URLs or uploaded PNG, JPEG or WEBP files.');
      return url;
    });
    if (new Set(result.gallery_images).size !== result.gallery_images.length) throw invalid('This gallery contains a duplicate image. Keep each image only once.');
  }
  return result;
}

export function readConceptGallery(section, options = {}) {
  // Ignore unsafe legacy data on public pages rather than rendering it.
  let label = DEFAULT_GALLERY_LABEL;
  try { label = validateConceptGallery({ gallery_button_label: section?.gallery_button_label ?? '' }).gallery_button_label; } catch { /* safe default */ }
  const images = Array.isArray(section?.gallery_images)
    ? [...new Set(section.gallery_images.filter((value) => isSafeGalleryImage(value, options)))].slice(0, MAX_CONCEPT_GALLERY_IMAGES)
    : [];
  return { label, images };
}
