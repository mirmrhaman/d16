export function createPageUrl(pageName = '') {
  if (!pageName) return '/';
  const normalized = pageName.trim();
  if (normalized.toLowerCase() === 'home') return '/';
  return `/${normalized}`;
}
