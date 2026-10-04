import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SOCIAL_LINKS, validateSocialLinks, validateFloatingSocial, normalizeSocialMedia } from '../server/src/socialMediaSchema.js';

// Synthetic configuration only: no hosted database or real environment files.
Object.assign(process.env, {
  API_ENV_FILE: '/dev/null', NODE_ENV: 'qa', DB_HOST: '127.0.0.1', DB_PORT: '65531', DB_NAME: 'dinterio_d16_qa', DB_USER: 'offline_test', DB_PASSWORD: 'synthetic-test-only',
  APP_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 71).toString('base64'), APP_HMAC_KEY_BASE64: Buffer.alloc(32, 82).toString('base64'),
});
const { cleanPublicPayload, createContentRepository } = await import('../server/src/contentService.js');
const { pool } = await import('../server/src/db.js');
test.after(() => pool.end());

const links = { facebook: 'https://www.facebook.com/d16', whatsapp: 'https://wa.me/15550000000', design_channel: 'https://example.test/design' };
const defaults = { enabled: false, side: 'right', platforms: [] };
const floating = { enabled: true, side: 'left', platforms: ['whatsapp', 'facebook'] };

test('social links permit named/custom platforms and only safe HTTP(S) URLs', () => {
  assert.deepEqual(validateSocialLinks(), {});
  assert.deepEqual(validateSocialLinks({ ...links, instagram: '  https://example.test/profile  ', youtube: '' }), { ...links, instagram: 'https://example.test/profile', youtube: '' });
  for (const value of [null, [], 'invalid', 2]) assert.throws(() => validateSocialLinks(value));
  for (const platform of ['Facebook', 'my channel', 'my-channel', 'x'.repeat(33), '1channel', 'constructor', 'prototype']) assert.throws(() => validateSocialLinks({ [platform]: links.facebook }));
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', '//example.test', 'https://', 'https://user:pass@example.test', 'https://user@example.test', 'https://example.test/a b', 'https://example.test/\nline', '\thttps://example.test', 'https://example.test/\\path', 'https://example.test/%0a', 'https://example.test/' + 'a'.repeat(2048), null, 123, false]) assert.throws(() => validateSocialLinks({ facebook: url }), /http or https/);
  const many = Object.fromEntries(Array.from({ length: MAX_SOCIAL_LINKS }, (_, index) => [`channel_${index}`, `https://example.test/${index}`]));
  assert.equal(Object.keys(validateSocialLinks(many)).length, 40);
  assert.throws(() => validateSocialLinks({ ...many, extra: 'https://example.test' }), /40/);
});

test('floating settings support zero, one or several selected links in client order', () => {
  assert.deepEqual(validateFloatingSocial(undefined), defaults);
  assert.deepEqual(validateFloatingSocial(floating, links), floating);
  assert.deepEqual(validateFloatingSocial({ ...floating, platforms: ['facebook'] }, links).platforms, ['facebook']);
  assert.deepEqual(validateFloatingSocial({ ...floating, platforms: [] }, links).platforms, []);
  assert.deepEqual(validateFloatingSocial({ ...floating, enabled: false }, links).platforms, floating.platforms);
  assert.notEqual(validateFloatingSocial(floating, links).platforms, floating.platforms, 'Validation must not return a mutable input array');
  for (const enabled of [undefined, null, 0, 1, 'true']) assert.throws(() => validateFloatingSocial({ ...floating, enabled }, links));
  for (const side of [undefined, null, 'top', 'LEFT', 1]) assert.throws(() => validateFloatingSocial({ ...floating, side }, links));
  for (const platforms of [undefined, null, 'facebook', ['facebook', 'facebook'], ['missing'], ['Facebook'], [123], Array(41).fill('facebook')]) assert.throws(() => validateFloatingSocial({ ...floating, platforms }, links));
  for (const value of [null, false, [], {}, { ...floating, secret: 'bad' }]) assert.throws(() => validateFloatingSocial(value, links));
  assert.throws(() => validateFloatingSocial({ ...floating, platforms: ['empty'] }, { empty: '' }));
});

test('public normalization never automatically enables buttons or renders malformed stored links', () => {
  for (const input of [undefined, null, {}, { social_links: links }]) assert.deepEqual(normalizeSocialMedia(input).floating_social, defaults);
  const corrupted = { social_links: { ...links, bad: 'javascript:alert(1)', empty: '', credentials: 'https://user:password@example.test' }, floating_social: floating };
  assert.deepEqual(normalizeSocialMedia(corrupted), { social_links: links, floating_social: floating });
  for (const value of [null, {}, { ...floating, enabled: 'true' }, { ...floating, platforms: ['bad'] }, { ...floating, platforms: ['missing'] }]) assert.deepEqual(normalizeSocialMedia({ ...corrupted, floating_social: value }).floating_social, defaults);
  assert.deepEqual(normalizeSocialMedia({ social_links: ['https://example.test'], floating_social: floating }), { social_links: {}, floating_social: defaults });
  assert.deepEqual(normalizeSocialMedia(JSON.parse('{"social_links":{"__proto__":"https://example.test","constructor":"https://example.test","facebook":"https://example.test"}}')).social_links, { facebook: 'https://example.test' });
});

test('ContactInfo validates merged social settings and preserves unrelated partial updates', () => {
  const profile = cleanPublicPayload('ContactInfo', { organization_name: 'D16', logo_url: '/uploads/logo.png', theme_color: '#123456', social_links: links, floating_social: floating });
  const themeEdit = cleanPublicPayload('ContactInfo', { theme_color: '#654321' }, profile);
  assert.deepEqual(themeEdit.social_links, links); assert.deepEqual(themeEdit.floating_social, floating);
  assert.equal(themeEdit.logo_url, profile.logo_url); assert.equal(themeEdit.organization_name, 'D16');
  const disabled = cleanPublicPayload('ContactInfo', { floating_social: { ...floating, enabled: false } }, profile);
  assert.deepEqual(disabled.social_links, links); assert.equal(disabled.floating_social.enabled, false);
  const removed = cleanPublicPayload('ContactInfo', { social_links: { facebook: links.facebook }, floating_social: { ...floating, platforms: ['facebook'] } }, profile);
  assert.deepEqual(removed.social_links, { facebook: links.facebook });
  assert.throws(() => cleanPublicPayload('ContactInfo', { social_links: { facebook: links.facebook } }, profile), /saved, valid social links/);
  assert.throws(() => cleanPublicPayload('ContactInfo', { floating_social: { ...floating, side: 'top' } }, profile));
  assert.throws(() => cleanPublicPayload('ContactInfo', { social_links: null }, profile));
  assert.deepEqual(cleanPublicPayload('ContactInfo', { organization_name: 'Legacy' }), { organization_name: 'Legacy', social_links: {}, floating_social: defaults });
});

test('demo settings persist, require current versions and preserve other profile fields and records', async () => {
  const storage = new Map(); const original = globalThis.localStorage;
  const initial = [
    { id: 1, email: 'synthetic@example.invalid', theme_color: '#123456', logo_url: '/uploads/logo.png', locations: ['Dhaka'] },
    { id: 2, organization_name: 'Second profile', social_links: { youtube: 'https://youtube.com/example' } },
  ];
  storage.set('d16_contact_info_demo_v2', JSON.stringify(initial));
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    const { base44 } = await import('../src/api/base44Client.js?social-media-first');
    const api = base44.entities.ContactInfo;
    const before = await api.list();
    assert.equal(before[0].version, 1); assert.deepEqual(before[0].floating_social, defaults);
    assert.deepEqual(JSON.parse(storage.get('d16_contact_info_demo_v2')), initial, 'Reading legacy records must not overwrite storage');
    for (const version of [undefined, null, 0, '1', 1.5]) await assert.rejects(api.update(1, { social_links: links, version }), (error) => error.status === 400);
    const saved = await api.update(1, { social_links: links, floating_social: floating, version: 1 });
    assert.equal(saved.version, 2); assert.equal(saved.email, initial[0].email); assert.equal(saved.logo_url, initial[0].logo_url);
    assert.deepEqual(saved.locations, initial[0].locations);
    await assert.rejects(api.update(1, { social_links: {}, floating_social: defaults, version: 1 }), (error) => error.status === 409);
    await assert.rejects(api.update(1, { social_links: { facebook: links.facebook }, version: 2 }), /saved, valid social links/);
    const themed = await api.update(1, { theme_color: '#654321' });
    assert.equal(themed.version, 3); assert.deepEqual(themed.social_links, links); assert.deepEqual(themed.floating_social, floating);
    const { base44: reloaded } = await import('../src/api/base44Client.js?social-media-reloaded');
    const records = await reloaded.entities.ContactInfo.list();
    assert.deepEqual(records[0], themed); assert.deepEqual(records[1], before[1]);
    const disabled = await reloaded.entities.ContactInfo.update(1, { floating_social: { ...floating, enabled: false }, version: 3 });
    assert.deepEqual(disabled.social_links, links); assert.equal(disabled.floating_social.enabled, false);
    assert.equal(JSON.parse(storage.get('d16_contact_info_demo_v2'))[1].version, undefined, 'Unrelated profile must remain untouched');
    await assert.rejects(api.delete(1), (error) => error.status === 405);
  } finally {
    if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original;
  }
});

test('server social writes require positive versions before changing legacy contacts', async () => {
  const id = '90000000-0000-4000-8000-000000000002';
  const state = { row: null, profile: { id, organization_name: 'D16' }, rollbacks: 0, writes: 0 };
  const connection = {
    async beginTransaction() {}, async commit() {}, async rollback() { state.rollbacks++; }, release() {},
    async execute(sql, values = []) {
      if (sql.startsWith('SELECT * FROM organization_profile')) return [[state.profile]];
      if (sql.startsWith('SELECT * FROM app_content')) return [[state.row].filter(Boolean)];
      if (sql.startsWith('SELECT location_name')) return [[]];
      if (sql.startsWith('UPDATE organization_profile')) { state.writes++; return [{ affectedRows: 1 }]; }
      if (sql.startsWith('INSERT INTO app_content')) state.row = { payload: values[2], version: 1 };
      else if (sql.startsWith('UPDATE app_content SET payload')) state.row = { ...state.row, payload: values[0], version: state.row.version + 1 };
      else if (!sql.startsWith('DELETE FROM organization_locations')) throw new Error(`Unexpected SQL: ${sql}`);
      return [{ affectedRows: 1 }];
    },
  };
  const database = { async getConnection() { return connection; } };
  const repository = createContentRepository({ database, decrypt: () => '', encrypt: () => null, hash: () => null, audit: async () => {} });
  const actor = { userId: id };
  for (const version of [undefined, null, 0, '1', 1.5]) await assert.rejects(repository.updateContent('ContactInfo', id, { social_links: links, version }, actor), (error) => error.status === 400);
  assert.equal(state.writes, 0);
  const saved = await repository.updateContent('ContactInfo', id, { social_links: links, floating_social: floating, version: 1 }, actor);
  assert.equal(saved.version, 2, 'First legacy metadata creation must advance beyond exposed version 1');
  assert.deepEqual(saved.floating_social, floating);
  await assert.rejects(repository.updateContent('ContactInfo', id, { floating_social: defaults, version: 1 }, actor), (error) => error.status === 409);
  assert.equal(state.writes, 1);
});
