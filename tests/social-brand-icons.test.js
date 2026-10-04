import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveSocialBrand, supportedSocialPlatforms } from '../src/data/socialBrands.js';
import { normalizeSocialMedia } from '../server/src/socialMediaSchema.js';

const brands = ['whatsapp', 'facebook', 'instagram', 'youtube', 'linkedin', 'x', 'messenger', 'telegram'];
const source = async (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('supported social platforms provide distinct, self-contained brand paths', () => {
  for (const platform of [...brands, 'website']) assert.ok(supportedSocialPlatforms.includes(platform), `${platform} must be offered`);
  const signatures = new Set();
  for (const platform of brands) {
    const brand = resolveSocialBrand(platform);
    assert.equal(brand.key, platform);
    assert.ok(brand.label.trim());
    assert.match(brand.color, /^#[0-9a-f]{6}$/i);
    assert.ok(Array.isArray(brand.paths) && brand.paths.length > 0, `${platform} needs its brand glyph`);
    for (const path of brand.paths) {
      assert.equal(typeof path, 'string');
      assert.ok(path.trim().length > 10);
      assert.doesNotMatch(path, /<|>|https?:|javascript:/i);
    }
    signatures.add(brand.paths.join(' '));
  }
  assert.equal(signatures.size, brands.length, 'Unrelated brands must not share the same generic glyph');
  assert.equal(resolveSocialBrand('whatsapp').label, 'WhatsApp');
  assert.equal(resolveSocialBrand('x').label, 'X');
});

test('friendly platform aliases resolve to the same glyph without requiring a saved-key migration', () => {
  const aliases = {
    whatsapp: ['WhatsApp', ' whatsapp ', 'whats_app', 'Whats App', 'whats-app', 'whats.app'],
    facebook: ['Facebook', 'FB', ' facebook '],
    instagram: ['Instagram', 'IG'],
    youtube: ['YouTube', 'YT', 'you_tube'],
    linkedin: ['LinkedIn', 'linked_in'],
    x: ['X', 'twitter', 'Twitter', 'twitterx', 'Twitter / X'],
    messenger: ['Messenger', 'facebook_messenger', 'Facebook Messenger'],
    telegram: ['Telegram', ' telegram '],
  };
  for (const [platform, names] of Object.entries(aliases)) {
    const expected = resolveSocialBrand(platform);
    for (const name of names) assert.deepEqual(resolveSocialBrand(name), expected, `${name} should display the ${platform} brand`);
  }
});

test('custom and prototype-like names remain safe generic profiles', () => {
  const custom = resolveSocialBrand('design_channel');
  assert.equal(custom.key, 'custom');
  assert.match(custom.label, /design\s+channel/i);
  assert.ok(!custom.paths || custom.paths.length === 0);
  for (const name of ['unknown_network', '__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty']) {
    const brand = resolveSocialBrand(name);
    assert.equal(brand.key, 'custom', `${name} must not resolve through an inherited property`);
    assert.equal(typeof brand.label, 'string');
    assert.ok(!brand.paths || brand.paths.length === 0);
  }
});

test('brand recognition leaves saved profile keys, exact destinations and selection order intact', () => {
  const contact = {
    social_links: {
      whats_app: 'https://wa.me/8801712345678?text=Hello%20D16',
      twitter: 'https://twitter.com/example',
      design_channel: 'https://example.test/design',
    },
    floating_social: { enabled: true, side: 'left', platforms: ['twitter', 'whats_app', 'design_channel'] },
  };
  const original = structuredClone(contact);
  const normalized = normalizeSocialMedia(contact);
  const resolved = normalized.floating_social.platforms.map((key) => ({ brand: resolveSocialBrand(key).key, href: normalized.social_links[key] }));
  assert.deepEqual(resolved, [
    { brand: 'x', href: contact.social_links.twitter },
    { brand: 'whatsapp', href: contact.social_links.whats_app },
    { brand: 'custom', href: contact.social_links.design_channel },
  ]);
  assert.deepEqual(contact, original);
  assert.deepEqual(normalized, original);
});

test('public buttons and both admin previews share one local SVG component', async () => {
  const [icon, floating, editor, schema, packageText] = await Promise.all([
    source('../src/components/SocialBrandIcon.jsx'),
    source('../src/components/FloatingSocialLinks.jsx'),
    source('../src/Pages/AdminSocialMedia.jsx'),
    source('../server/src/socialMediaSchema.js'),
    source('../package.json'),
  ]);
  assert.match(icon, /resolveSocialBrand/);
  assert.match(icon, /viewBox=["']0 0 16 16["']/);
  assert.match(icon, /<path\b/);
  assert.match(icon, /currentColor/);
  assert.match(icon, /aria-hidden/);
  assert.doesNotMatch(icon, /<img\b|<iframe\b|<script\b|dangerouslySetInnerHTML/);
  assert.match(floating, /<SocialBrandIcon\b/);
  assert.match(floating, /social_links\[platform\]/);
  assert.match(floating, /href=\{url\}/);
  assert.match(floating, /platform=\{platform\}/);
  assert.doesNotMatch(floating, /Icon:\s*(?:MessageCircle|Twitter)/);
  assert.ok((editor.match(/<SocialBrandIcon\b/g) || []).length >= 2, 'The selected-buttons preview and each profile row should show the same brand component');
  assert.doesNotMatch(editor, /Preview labels only/);
  assert.doesNotMatch(schema, /resolveSocialBrand|socialBrands/);
  const { dependencies, devDependencies } = JSON.parse(packageText);
  for (const name of ['react-icons', 'simple-icons', 'bootstrap-icons']) {
    assert.ok(!dependencies?.[name] && !devDependencies?.[name], 'Local SVG brand rendering must not add an icon-package dependency');
  }
});
