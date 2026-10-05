// Shared by the API, browser preview and public gallery. No server-only imports.
export const MAX_CONCEPT_GALLERY_IMAGES = 40;
export const DEFAULT_GALLERY_LABEL = 'View Gallery';
export const DEFAULT_GALLERY_CONTINUE_LABEL = 'Continue with this concept';
export const CONCEPT_GALLERY_FIELDS = ['gallery_images', 'gallery_button_label', 'gallery_title', 'gallery_description', 'gallery_continue_label'];
export const DEMO_GALLERY_FILE_BYTES = 500 * 1024;
const invalid = (message) => Object.assign(new Error(message), { status: 400 });
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
// Stable public references only, not cryptographic/security identifiers. Legacy
// URLs (including browser-only data images) never have to enter the address bar.
function referenceHash(value) {
  let a = 2166136261; let b = 5381;
  for (let index = 0; index < value.length; index++) {
    a = Math.imul(a ^ value.charCodeAt(index), 16777619);
    b = Math.imul(b ^ value.charCodeAt(index), 65599);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
export function getGalleryImageId(image) {
  return validId(image?.id) ? image.id : `legacy-image-${referenceHash(typeof image === 'string' ? image : String(image?.url || ''))}`;
}
export function getConceptSectionId(section) {
  const id = String(section?.id ?? '');
  return validId(id) ? id : `legacy-section-${referenceHash(`${section?.title || ''}|${section?.image || ''}`)}`;
}
function publicText(value, label, limit, multiline = false) {
  if (typeof value !== 'string' || value.trim().length > limit || [...value].some((char) => (char.charCodeAt(0) < 32 && !(multiline && ['\n', '\r', '\t'].includes(char))) || char.charCodeAt(0) === 127)) throw invalid(`${label} must be text up to ${limit} characters.`);
  return value.trim();
}
function validateImage(value, options) {
  const legacy = typeof value === 'string';
  if (!legacy && (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !['id', 'url', 'title', 'description'].includes(key)) || !validId(value.id))) throw invalid('Gallery photos require a unique valid id, image URL and optional title/description.');
  const url = legacy ? value.trim() : typeof value.url === 'string' ? value.url.trim() : value.url;
  if (!isSafeGalleryImage(url, options)) throw invalid('Gallery images must use valid http/https image URLs or uploaded PNG, JPEG or WEBP files.');
  return legacy ? url : { id: value.id, url, title: publicText(value.title ?? '', 'Photo title', 180), description: publicText(value.description ?? '', 'Photo description', 2000, true) };
}

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
  for (const [key, label, limit, fallback, multiline] of [
    ['gallery_button_label', 'Gallery button name', 60, DEFAULT_GALLERY_LABEL, false],
    ['gallery_continue_label', 'Continue button name', 60, DEFAULT_GALLERY_CONTINUE_LABEL, false],
    ['gallery_title', 'Gallery page title', 180, '', false],
    ['gallery_description', 'Gallery page description', 3000, '', true],
  ]) {
    if (Object.hasOwn(section, key)) result[key] = publicText(section[key], label, limit, multiline) || fallback;
  }
  if (Object.hasOwn(section, 'gallery_images')) {
    if (!Array.isArray(section.gallery_images) || section.gallery_images.length > MAX_CONCEPT_GALLERY_IMAGES) throw invalid(`A section gallery can contain up to ${MAX_CONCEPT_GALLERY_IMAGES} images.`);
    result.gallery_images = section.gallery_images.map((value) => validateImage(value, options));
    if (new Set(result.gallery_images.map((image) => typeof image === 'string' ? image : image.url)).size !== result.gallery_images.length) throw invalid('This gallery contains a duplicate image. Keep each image only once.');
    if (new Set(result.gallery_images.map(getGalleryImageId)).size !== result.gallery_images.length) throw invalid('Each gallery photo must have a unique id.');
  }
  return result;
}

export function readConceptGallery(section, options = {}) {
  // Ignore unsafe legacy data on public pages rather than rendering it.
  const text = (key, fallback = '') => {
    try { return validateConceptGallery({ [key]: section?.[key] ?? '' })[key]; } catch { return fallback; }
  };
  const items = []; const ids = new Set(); const urls = new Set();
  for (const value of Array.isArray(section?.gallery_images) ? section.gallery_images.slice(0, MAX_CONCEPT_GALLERY_IMAGES) : []) {
    try {
      const image = validateImage(value, options);
      const item = typeof image === 'string' ? { id: getGalleryImageId(image), url: image, title: '', description: '' } : image;
      if (ids.has(item.id) || urls.has(item.url)) continue;
      ids.add(item.id); urls.add(item.url); items.push(item);
    } catch { /* skip malformed or unsafe stored photos */ }
  }
  return { label: text('gallery_button_label', DEFAULT_GALLERY_LABEL), images: items.map((item) => item.url), items, title: text('gallery_title'), description: text('gallery_description'), continueLabel: text('gallery_continue_label', DEFAULT_GALLERY_CONTINUE_LABEL) };
}
