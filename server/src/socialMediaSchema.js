// Shared by the API, demo store and public website. This module has no Node dependencies.
export const MAX_SOCIAL_LINKS = 40;
const defaultFloating = () => ({ enabled: false, side: 'right', platforms: [] });
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const validPlatform = (key) => /^[a-z][a-z0-9_]{0,31}$/.test(key) && !['constructor', 'prototype', '__proto__'].includes(key);
const invalid = (message) => { throw Object.assign(new Error(message), { status: 400, statusCode: 400 }); };

function validateUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) invalid('Social links must use http or https URLs of at most 2048 characters, without credentials or control characters.');
  const url = value.trim();
  if (url === '') return '';
  if (/[\s\\]/.test(url) || /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(url)) invalid('Social links must use http or https URLs without control characters or spaces.');
  try {
    const parsed = new URL(url);
    if (/^https?:\/\//i.test(url) && ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) return url;
  } catch { /* Reject malformed URLs below. */ }
  invalid('Social links must use http or https URLs without embedded credentials.');
}

export function validateSocialLinks(links = {}) {
  if (!isObject(links)) invalid('Social links must be an object of platform names and URLs.');
  const entries = Object.entries(links);
  if (entries.length > MAX_SOCIAL_LINKS) invalid(`Configure at most ${MAX_SOCIAL_LINKS} social links.`);
  return Object.fromEntries(entries.map(([platform, url]) => {
    if (!validPlatform(platform)) invalid('Social platform names must start with a lowercase letter and contain only lowercase letters, numbers or underscores (up to 32 characters).');
    return [platform, validateUrl(url)];
  }));
}

export function validateFloatingSocial(value, links = {}) {
  if (value === undefined) return defaultFloating();
  if (!isObject(value) || Object.keys(value).some((key) => !['enabled', 'side', 'platforms'].includes(key))) invalid('Floating media accepts only enabled, side and platforms.');
  if (typeof value.enabled !== 'boolean') invalid('Floating media visibility must be a boolean.');
  if (!['left', 'right'].includes(value.side)) invalid('Floating media side must be left or right.');
  if (!Array.isArray(value.platforms) || value.platforms.length > MAX_SOCIAL_LINKS) invalid(`Choose at most ${MAX_SOCIAL_LINKS} floating media links.`);
  const validatedLinks = validateSocialLinks(links);
  const seen = new Set();
  for (const platform of value.platforms) {
    if (typeof platform !== 'string' || !validPlatform(platform) || seen.has(platform) || !Object.hasOwn(validatedLinks, platform) || !validatedLinks[platform]) invalid('Floating media must select unique platforms with saved, valid social links.');
    seen.add(platform);
  }
  return { enabled: value.enabled, side: value.side, platforms: [...value.platforms] };
}

// Public reads fail closed: unsafe legacy links are omitted, and any malformed
// floating configuration disables the buttons rather than enabling a fallback.
export function normalizeSocialMedia(contact) {
  const safeEntries = [];
  if (isObject(contact?.social_links)) {
    for (const [platform, url] of Object.entries(contact.social_links)) {
      if (safeEntries.length >= MAX_SOCIAL_LINKS) break;
      if (!validPlatform(platform)) continue;
      try {
        const normalized = validateUrl(url);
        if (normalized) safeEntries.push([platform, normalized]);
      } catch { /* Never render an unsafe stored link. */ }
    }
  }
  const social_links = Object.fromEntries(safeEntries);
  try { return { social_links, floating_social: validateFloatingSocial(contact?.floating_social, social_links) }; }
  catch { return { social_links, floating_social: defaultFloating() }; }
}
