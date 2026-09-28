// Shared browser/server schema. Custom pages contain plain text, never HTML.
export const PAGE_TYPES = [
  { value: 'landing', label: 'Landing / Home', description: 'Introduce a campaign or welcome visitors with featured content.' },
  { value: 'standard', label: 'Standard / About', description: 'A flexible information page with a title, text and images.' },
  { value: 'services', label: 'Services', description: 'Present services or other offerings as cards.' },
  { value: 'portfolio', label: 'Portfolio', description: 'Showcase projects with photos and project details.' },
  { value: 'concepts', label: 'Design Concepts', description: 'Present design ideas and inspiration.' },
  { value: 'gallery', label: 'Gallery', description: 'Display a collection of photos with captions.' },
  { value: 'blog', label: 'Blog / News', description: 'Share a collection of articles or updates.' },
  { value: 'contact', label: 'Contact Information', description: 'Share public contact details and locations, without an enquiry form.' },
  { value: 'faq', label: 'FAQ', description: 'Organize frequently asked questions and answers.' },
  { value: 'team', label: 'Team', description: 'Introduce people with photos, roles and biographies.' },
];

const pageTypes = new Set(PAGE_TYPES.map(({ value }) => value));
const fields = new Set(['title', 'page_type', 'intro', 'body', 'hero_image', 'items', 'published']);
const metadata = new Set(['id', 'version', 'created_date', 'updated_date', 'updated_at']);
const itemFields = new Set(['id', 'title', 'text', 'image', 'meta']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const plainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function createCustomPage(pageType = 'standard') {
  if (!pageTypes.has(pageType)) throw new Error('Choose a supported page type.');
  return { title: '', page_type: pageType, intro: '', body: '', hero_image: '', items: [], published: false };
}

function text(value, label, maximum, required = false) {
  if (typeof value !== 'string' || value.length > maximum || [...value].some((character) => (character.charCodeAt(0) < 32 && !['\n', '\r', '\t'].includes(character)) || character.charCodeAt(0) === 127)) throw new Error(`${label} must be text with at most ${maximum} characters.`);
  if (required && !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function image(value, label, allowDataImages) {
  if (value === '') return '';
  if (typeof value !== 'string' || /[\s\\]/.test(value) || [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error(`${label} must use a safe image URL.`);
  if (allowDataImages && value.length <= 7 * 1024 * 1024 && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i.test(value)) return value;
  if (value.length > 2048) throw new Error(`${label} URL is too long.`);
  if (/^\/uploads\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(value)) return value;
  try {
    const url = new URL(value);
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return value;
  } catch { /* Produce the same friendly error for all invalid image sources. */ }
  throw new Error(`${label} must use an http/https URL or a local uploaded PNG, JPEG or WebP image.`);
}

export function validateCustomPage(payload, { allowDataImages = false } = {}) {
  if (!plainObject(payload) || Object.keys(payload).some((key) => !fields.has(key) && !metadata.has(key))) throw new Error('Custom pages accept only page content fields.');
  const page = { ...createCustomPage(), ...payload };
  if (!pageTypes.has(page.page_type)) throw new Error('Choose a supported page type.');
  if (typeof page.published !== 'boolean') throw new Error('Page publication must be a boolean.');
  if (!Array.isArray(page.items) || page.items.length > 40) throw new Error('A page can contain at most 40 items.');
  const ids = new Set();
  const items = page.items.map((item) => {
    if (!plainObject(item) || Object.keys(item).some((key) => !itemFields.has(key))) throw new Error('Page items accept only id, title, text, image and meta.');
    if (typeof item.id !== 'string' || !/^[a-z0-9_-]{1,64}$/i.test(item.id) || ids.has(item.id)) throw new Error('Page items need unique valid IDs.');
    ids.add(item.id);
    return { id: item.id, title: text(item.title ?? '', 'Item title', 120), text: text(item.text ?? '', 'Item text', 10000), image: image(item.image ?? '', 'Item image', allowDataImages), meta: text(item.meta ?? '', 'Item details', 300) };
  });
  return {
    title: text(page.title, 'Page title', 120, true), page_type: page.page_type,
    intro: text(page.intro, 'Introduction', 2000), body: text(page.body, 'Page text', 20000),
    hero_image: image(page.hero_image, 'Page image', allowDataImages), items, published: page.published,
  };
}

export function getCustomPagePath(page) {
  if (!page || typeof page.id !== 'string' || !uuid.test(page.id)) throw new Error('A saved page ID is required.');
  const slug = String(page.title || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '') || 'page';
  return `/Pages/${page.id}/${slug}`;
}

export const isPublishedCustomPage = (page) => page?.published === true;
