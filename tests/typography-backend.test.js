import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TYPOGRAPHY, FONT_OPTIONS, TYPOGRAPHY_ID, TYPOGRAPHY_TARGETS, MAX_TYPOGRAPHY_RULES, validateTypography } from '../server/src/typographySchema.js';

Object.assign(process.env, {
  API_ENV_FILE: '/dev/null', NODE_ENV: 'qa', DB_HOST: '127.0.0.1', DB_PORT: '65531', DB_NAME: 'dinterio_d16_qa', DB_USER: 'offline_test', DB_PASSWORD: 'synthetic-test-only',
  APP_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 71).toString('base64'), APP_HMAC_KEY_BASE64: Buffer.alloc(32, 82).toString('base64'),
});
const { cleanPublicPayload, createContentRepository } = await import('../server/src/contentService.js');
const { createApp } = await import('../server/src/app.js');
const { pool } = await import('../server/src/db.js');
test.after(() => pool.end());
const actor = { userId: '90000000-0000-4000-8000-000000000001', ipAddress: '127.0.0.1', userAgent: 'synthetic-typography-test' };
const rule = { id: 'heading-one', page: '/About', target: 'heading', text: '', style: { fontFamily: 'open-sans', fontSize: '1.5rem', color: '#123456', fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline', textTransform: 'uppercase', lineHeight: '1.5', letterSpacing: '0.02em' } };
const configured = { ...DEFAULT_TYPOGRAPHY, rules: [rule] };

function memoryDatabase() {
  const state = { row: null, audits: [], failAudit: false, rollbacks: 0 };
  let previous;
  const connection = {
    async beginTransaction() { previous = { row: structuredClone(state.row), auditLength: state.audits.length }; },
    async commit() {},
    async rollback() { state.row = previous.row; state.audits.length = previous.auditLength; state.rollbacks++; },
    release() {},
    async execute(sql, values = []) {
      if (sql.startsWith('SELECT * FROM app_content')) return [[state.row].filter((row) => row && row.entity_type === values[0] && (!values[1] || row.id === values[1]))];
      if (sql.startsWith('INSERT INTO app_content')) {
        if (state.row) throw Object.assign(new Error('Duplicate row'), { code: 'ER_DUP_ENTRY' });
        state.row = { entity_type: values[0], id: values[1], payload: values[2], version: 1, created_at: '2026-10-05 12:00:00', updated_at: '2026-10-05 12:00:00' };
      } else if (sql.startsWith('UPDATE app_content SET payload')) state.row = { ...state.row, payload: values[0], version: state.row.version + 1 };
      else if (sql.startsWith('INSERT INTO audit_logs')) {
        if (state.failAudit) throw new Error('Synthetic audit unavailable');
        state.audits.push({ sql, values });
      } else throw new Error('Unexpected synthetic database query');
      return [{ affectedRows: 1 }];
    },
  };
  return { state, execute: connection.execute, async getConnection() { return connection; } };
}

test('typography schema normalizes supported structured settings without changing inputs', () => {
  assert.deepEqual(validateTypography(DEFAULT_TYPOGRAPHY), DEFAULT_TYPOGRAPHY);
  assert.deepEqual(cleanPublicPayload('WebsiteTypography', configured), configured);
  assert.deepEqual(FONT_OPTIONS.map(({ value }) => value), ['system', 'open-sans', 'lato', 'roboto', 'montserrat', 'poppins', 'arial', 'georgia']);
  assert.deepEqual(TYPOGRAPHY_TARGETS.map(({ value }) => value), ['all', 'navigation', 'button', 'title', 'heading', 'card-title', 'description', 'body', 'small', 'link', 'form', 'footer']);
  const original = { ...rule, text: '  Our\n mission   ', style: { color: '#ABCDEF', fontSize: '.5rem', fontFamily: '', lineHeight: '1.50', letterSpacing: '-.125em' } };
  const result = validateTypography({ title: '  Fonts  ', rules: [original] });
  assert.deepEqual(result, { title: 'Fonts', rules: [{ ...original, text: 'Our mission', style: { color: '#abcdef', fontSize: '0.5rem', lineHeight: '1.5', letterSpacing: '-0.125em' } }] });
  assert.equal(original.text, '  Our\n mission   ');
  assert.equal(original.style.fontSize, '.5rem');
  for (const page of ['*', '/', '/Home', '/About', '/PicYourConcept/bed-room/gallery/legacy-section-1', '/Pages/10000000-0000-4000-8000-000000000001/designs']) {
    assert.equal(validateTypography({ rules: [{ ...rule, page }] }).rules[0].page, page);
  }
  for (const { value: fontFamily } of FONT_OPTIONS) assert.equal(validateTypography({ rules: [{ ...rule, style: { fontFamily } }] }).rules[0].style.fontFamily, fontFamily);
  assert.deepEqual(cleanPublicPayload('DashboardLayout', { title: 'Dashboard', card_order: ['AdminTypography'] }).card_order, ['AdminTypography']);
});

test('typography rejects CSS injection, unbounded values, unsafe routes and selectors', () => {
  const invalidRules = [
    { id: '../x' }, { id: 'a'.repeat(65) }, { id: 2 }, { target: 'script' }, { target: 'body *' }, { css: 'body{display:none}' },
    { style: { backgroundImage: 'url(https://example.test)' } }, { style: { position: 'fixed' } }, { style: { fontFamily: 'url(https://example.test)' } },
    { style: { fontSize: '1rem;display:none' } }, { style: { color: 'red;background:url(x)' } }, { style: { color: '#fff' } },
    { style: { fontSize: '7px' } }, { style: { fontSize: '161px' } }, { style: { fontSize: '0.4rem' } }, { style: { fontSize: '11rem' } },
    { style: { fontSize: '12em' } }, { style: { fontSize: '100vw' } }, { style: { fontSize: 'calc(1px)' } }, { style: { fontSize: 16 } },
    { style: { lineHeight: '0.7' } }, { style: { lineHeight: '3.1' } }, { style: { lineHeight: '1e0' } }, { style: { lineHeight: 'Infinity' } },
    { style: { letterSpacing: '-3px' } }, { style: { letterSpacing: '21px' } }, { style: { letterSpacing: '1.26em' } }, { style: { letterSpacing: '-.126rem' } },
    { style: { fontWeight: 'bold' } }, { style: { fontWeight: '950' } }, { style: { fontStyle: 'oblique' } }, { style: { textDecoration: 'blink' } },
    { style: { textTransform: 'initial' } }, { style: null }, { style: [] }, { style: { color: null } }, { text: 'x'.repeat(301) }, { text: 'x\u0000y' },
  ];
  for (const override of invalidRules) assert.throws(() => cleanPublicPayload('WebsiteTypography', { rules: [{ ...rule, ...override }] }), (error) => error.status === 400, JSON.stringify(override));
  for (const page of ['https://example.test', '//example.test', 'About', '/About?x=1', '/About#heading', '/About/*', '/About/../Home', '/About/%2e%2e/Home', '/AdminDashboard', '/login', '/d16/About', '/About\\Home', '/About/', '']) {
    assert.throws(() => validateTypography({ rules: [{ ...rule, page }] }), (error) => error.status === 400, page);
  }
  for (const rules of [null, undefined, {}, [rule, rule], Array.from({ length: MAX_TYPOGRAPHY_RULES + 1 }, (_, i) => ({ ...rule, id: `r-${i}` }))]) assert.throws(() => validateTypography({ rules }));
  assert.throws(() => validateTypography({ rules: [{ ...rule, style: JSON.parse('{"__proto__":{"color":"#ffffff"}}') }] }));
  for (const [key, values] of Object.entries({ fontSize: ['8px', '160px', '.5rem', '10rem'], lineHeight: ['.8', '3'], letterSpacing: ['-2px', '20px', '-.125rem', '1.25em'] })) {
    for (const value of values) assert.doesNotThrow(() => validateTypography({ rules: [{ ...rule, style: { [key]: value } }] }));
  }
});

test('typography singleton creates on first save, requires versions, resets and records atomic attributed history', async () => {
  const database = memoryDatabase(); const repository = createContentRepository({ database });
  assert.deepEqual(await repository.listContent('WebsiteTypography'), []);
  await assert.rejects(repository.createContent('WebsiteTypography', configured, {}), (error) => error.status === 401);
  const created = await repository.createContent('WebsiteTypography', { ...configured, id: 'forged', actor_user_id: 'forged' }, actor);
  assert.equal(created.id, TYPOGRAPHY_ID); assert.equal(created.version, 1);
  await assert.rejects(repository.createContent('WebsiteTypography', configured, actor), (error) => error.status === 409);
  await assert.rejects(repository.deleteContent('WebsiteTypography', created.id, actor), (error) => error.status === 405);
  for (const version of [undefined, null, '1', 0, 1.5]) await assert.rejects(repository.updateContent('WebsiteTypography', created.id, { rules: [], version }, actor), (error) => error.status === 400);
  const updated = await repository.updateContent('WebsiteTypography', created.id, { version: 1, rules: [{ ...rule, style: { fontFamily: 'lato', fontSize: '24px' } }] }, actor);
  assert.equal(updated.version, 2); assert.equal(updated.title, configured.title);
  assert.deepEqual((await repository.listContent('WebsiteTypography'))[0], updated);
  assert.deepEqual(JSON.parse(database.state.audits.at(-1).values[5]).changed_fields, ['rules']);
  assert.equal(database.state.audits.at(-1).values[1], actor.userId);
  assert.match(database.state.audits.at(-1).sql, /UTC_TIMESTAMP/);
  await assert.rejects(repository.updateContent('WebsiteTypography', created.id, { version: 1, rules: [] }, actor), (error) => error.status === 409);
  const unchanged = await repository.updateContent('WebsiteTypography', created.id, { ...updated }, actor);
  assert.deepEqual(JSON.parse(database.state.audits.at(-1).values[5]).changed_fields, []);
  database.state.failAudit = true;
  await assert.rejects(repository.updateContent('WebsiteTypography', created.id, { version: unchanged.version, rules: [] }, actor), /audit unavailable/);
  assert.deepEqual((await repository.listContent('WebsiteTypography'))[0], unchanged);
  database.state.failAudit = false;
  const reset = await repository.updateContent('WebsiteTypography', created.id, { version: unchanged.version, rules: [] }, actor);
  assert.deepEqual(reset.rules, []);
});

test('typography HTTP reads are public and writes need both administrator identity and branding permission', async (t) => {
  const database = memoryDatabase(); const content = createContentRepository({ database });
  const sessions = {
    admin: { id: actor.userId, role: 'admin', permissions: ['content.read', 'branding.write'] },
    super: { id: 'super', role: 'super', permissions: ['content.read', 'branding.write'] },
    viewer: { id: 'viewer', role: 'viewer', permissions: ['content.read', 'branding.write'] },
    limited: { id: 'limited', role: 'admin', permissions: ['content.read'] },
  };
  const app = createApp({ pool: database, content, auth: { getSession: async (token) => sessions[token] || null }, allowedOrigins: ['http://typography.test'], secureCookies: false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/website-typography`;
  const request = (suffix = '', method = 'GET', body, session) => fetch(base + suffix, { method, headers: { origin: 'http://typography.test', 'content-type': 'application/json', ...(session ? { cookie: `d16_session=${session}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.deepEqual(await (await request()).json(), []);
  assert.equal((await request('?admin=1')).status, 401);
  for (const session of [undefined, 'forged', 'super', 'viewer', 'limited']) {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await request(method === 'POST' ? '' : `/${TYPOGRAPHY_ID}`, method, { ...configured, role: 'admin', version: 1 }, session);
      assert.equal(response.status, !session || session === 'forged' ? 401 : 403);
    }
  }
  assert.equal((await request('', 'POST', { ...configured, actor_user_id: 'forged' }, 'admin')).status, 201);
  assert.equal(database.state.audits.at(-1).values[1], actor.userId);
  assert.deepEqual((await (await request()).json())[0].rules, configured.rules);
  assert.equal((await request(`/${TYPOGRAPHY_ID}`, 'PUT', { rules: [] }, 'admin')).status, 400);
  assert.equal((await request(`/${TYPOGRAPHY_ID}`, 'PUT', { version: 1, rules: [] }, 'admin')).status, 200);
  assert.equal((await request(`/${TYPOGRAPHY_ID}`, 'PUT', { version: 1, rules: [] }, 'admin')).status, 409);
  assert.equal((await request(`/${TYPOGRAPHY_ID}`, 'DELETE', {}, 'admin')).status, 405);
});

test('preview typography persists independently, rejects stale saves and corrupt data, and keeps reset explicit', async () => {
  const original = globalThis.localStorage; const storage = new Map();
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    const { base44 } = await import('../src/api/base44Client.js?typography-lifecycle');
    const api = base44.entities.WebsiteTypography;
    assert.deepEqual(await api.list(), []);
    const created = await api.create(configured);
    assert.equal(created.id, TYPOGRAPHY_ID); assert.equal(created.version, 1);
    assert(storage.has('d16_website_typography_demo_v2'));
    await assert.rejects(api.create(configured), (error) => error.status === 409);
    await assert.rejects(api.update(created.id, { rules: [] }), (error) => error.status === 400);
    const attempts = await Promise.allSettled([api.update(created.id, { version: 1, rules: [] }), api.update(created.id, { version: 1, rules: [] })]);
    assert.equal(attempts.filter(({ status }) => status === 'fulfilled').length, 1);
    assert.equal(attempts.find(({ status }) => status === 'rejected').reason.status, 409);
    const { base44: reloaded } = await import('../src/api/base44Client.js?typography-reload');
    const saved = (await reloaded.entities.WebsiteTypography.list())[0];
    assert.deepEqual(saved.rules, []); assert.equal(saved.version, 2);
    await assert.rejects(api.update(saved.id, { ...saved, rules: [{ ...rule, style: { color: 'javascript:alert(1)' } }] }), (error) => error.status === 400);
    await assert.rejects(api.delete(saved.id), (error) => error.status === 405);
    assert.deepEqual((await api.list())[0], saved);
    storage.set('d16_website_typography_demo_v2', '{broken');
    await assert.rejects(api.list(), (error) => error.status === 400);
    await assert.rejects(api.update(saved.id, { ...saved, rules: [] }), (error) => error.status === 400);
    assert.equal(storage.get('d16_website_typography_demo_v2'), '{broken');
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
