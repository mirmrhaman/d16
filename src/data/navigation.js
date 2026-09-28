import { getCustomPagePath, isPublishedCustomPage } from '../../server/src/customPageSchema.js';

// Destinations are built-in routes or saved custom-page IDs, never arbitrary URLs.
export const NAVIGATION_MENU_ID = 'a7bf2755-1d82-4c2e-9ad3-729f04c565d1';
export const MAX_NAVIGATION_ITEMS = 40;
export const isCustomPageDestination = (page) => typeof page === 'string' && page.startsWith('custom:') && /^custom:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(page);
export const NAVIGATION_PAGES = [
  { page: 'Home', label: 'Home', path: '/', icon: 'Home' },
  { page: 'About', label: 'About', path: '/About', icon: 'Users' },
  { page: 'Services', label: 'Services', path: '/Services', icon: 'Briefcase' },
  { page: 'Portfolio', label: 'Portfolio', path: '/Portfolio', icon: 'FolderOpen' },
  { page: 'PicYourConcept', label: 'Pic Your Concept', path: '/PicYourConcept', icon: 'Images' },
  { page: 'Gallery', label: 'Gallery', path: '/Gallery', icon: 'Images' },
  { page: 'Blog', label: 'Blog', path: '/Blog', icon: 'BookOpen' },
  { page: 'Contact', label: 'Contact', path: '/Contact', icon: 'Mail' },
];
export const DEFAULT_NAVIGATION_MENU = {
  title: 'Website navigation',
  items: NAVIGATION_PAGES.map(({ page, label }) => ({ id: `nav-${page.toLowerCase()}`, page, label, visible: true })),
};

export function validateNavigationItems(items) {
  if (!Array.isArray(items) || items.length > MAX_NAVIGATION_ITEMS) throw new Error('Choose up to 40 website tabs.');
  const ids = new Set();
  const pages = new Set();
  return items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some((key) => !['id', 'page', 'label', 'visible'].includes(key))) throw new Error('Tabs can contain only an ID, page, label and visibility.');
    if (typeof item.id !== 'string' || !/^[a-z0-9_-]{1,64}$/i.test(item.id) || ids.has(item.id)) throw new Error('Each tab needs a unique valid ID.');
    if ((!NAVIGATION_PAGES.some(({ page }) => page === item.page) && !isCustomPageDestination(item.page)) || pages.has(item.page.toLowerCase())) throw new Error('Choose each available website page only once.');
    if (typeof item.label !== 'string' || !item.label.trim() || item.label.trim().length > 60 || [...item.label].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new Error('Every tab needs a label of 1–60 characters without control characters.');
    if (typeof item.visible !== 'boolean') throw new Error('Tab visibility must be on or off.');
    ids.add(item.id); pages.add(item.page.toLowerCase());
    return { id: item.id, page: isCustomPageDestination(item.page) ? item.page.toLowerCase() : item.page, label: item.label.trim(), visible: item.visible };
  });
}

// Public rendering recovers from missing/invalid configuration, but an explicitly
// empty menu stays empty. The admin editor uses strict validation before saving.
export function normalizeNavigationItems(items) {
  try { return validateNavigationItems(items); }
  catch { return DEFAULT_NAVIGATION_MENU.items.map((item) => ({ ...item })); }
}

export function navigationPageChoices(customPages = [], { includeDrafts = false } = {}) {
  const custom = Array.isArray(customPages) ? customPages.filter((page) =>
    isCustomPageDestination(`custom:${page?.id}`) && typeof page.title === 'string' && page.title.trim()
    && (includeDrafts || isPublishedCustomPage(page))) : [];
  return [...NAVIGATION_PAGES, ...custom.map((page) => ({
    page: `custom:${page.id}`, label: page.title, path: getCustomPagePath(page),
    icon: { services: 'Briefcase', portfolio: 'FolderOpen', gallery: 'Images', concepts: 'Images', blog: 'BookOpen', team: 'Users', contact: 'Mail' }[page.page_type] || 'BookOpen',
    custom: true, published: isPublishedCustomPage(page),
  }))];
}

export function visibleNavigationItems(items, customPages = []) {
  const choices = navigationPageChoices(customPages);
  return normalizeNavigationItems(items).filter((item) => item.visible).flatMap((item) => {
    const destination = choices.find(({ page }) => page === item.page);
    // Draft, missing or unavailable custom pages must never get a public link.
    return destination ? [{ ...item, ...destination, label: item.label }] : [];
  });
}
