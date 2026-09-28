import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_NAVIGATION_MENU, NAVIGATION_MENU_ID as CLIENT_NAVIGATION_ID, NAVIGATION_PAGES, validateNavigationItems } from '../src/data/navigation.js';

// Synthetic configuration only; never load a real environment file or database.
Object.assign(process.env, {
  API_ENV_FILE: '/dev/null', NODE_ENV: 'qa', DB_HOST: '127.0.0.1', DB_PORT: '65531', DB_NAME: 'dinterio_d16_qa', DB_USER: 'offline_test', DB_PASSWORD: 'synthetic-test-only',
  APP_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 71).toString('base64'), APP_HMAC_KEY_BASE64: Buffer.alloc(32, 82).toString('base64'),
});
const { cleanPublicPayload, createContentRepository, NAVIGATION_MENU_ID } = await import('../server/src/contentService.js');
const { createApp } = await import('../server/src/app.js');
const { pool } = await import('../server/src/db.js');
test.after(() => pool.end());
const actor = { userId: '90000000-0000-4000-8000-000000000001', ipAddress: '127.0.0.1', userAgent: 'synthetic-navigation-test' };

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
        state.row = { entity_type: values[0], id: values[1], payload: values[2], version: 1, created_at: '2026-09-27 12:00:00', updated_at: '2026-09-27 12:00:00' };
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

test('navigation defaults match frontend, preserve order and intentional empty menus', () => {
  assert.equal(NAVIGATION_MENU_ID, CLIENT_NAVIGATION_ID);
  assert.deepEqual(cleanPublicPayload('NavigationMenu', DEFAULT_NAVIGATION_MENU), DEFAULT_NAVIGATION_MENU);
  assert.equal(DEFAULT_NAVIGATION_MENU.items.length, NAVIGATION_PAGES.length);
  const items = [...DEFAULT_NAVIGATION_MENU.items].reverse().map((item, index) => ({ ...item, label: `  ${item.label}  `, visible: index !== 1 }));
  assert.deepEqual(cleanPublicPayload('NavigationMenu', { ...DEFAULT_NAVIGATION_MENU, items }).items, validateNavigationItems(items));
  assert.equal(items[0].label, '  Contact  ', 'Validation must not mutate its input');
  assert.deepEqual(cleanPublicPayload('NavigationMenu', { ...DEFAULT_NAVIGATION_MENU, items: [] }).items, []);
  assert.deepEqual(cleanPublicPayload('DashboardLayout', { title: 'Dashboard', card_order: ['AdminNavigation', 'AdminAbout'] }).card_order, ['AdminNavigation', 'AdminAbout']);
});

test('navigation rejects unsafe fields, duplicate pages or IDs, malformed labels and non-booleans', () => {
  const item = DEFAULT_NAVIGATION_MENU.items[0];
  const validate = (items) => cleanPublicPayload('NavigationMenu', { title: 'Website navigation', items });
  for (const items of [null, {}, 'Home', Array(9).fill(item)]) assert.throws(() => validate(items), /at most eight/);
  for (const id of ['', 'contains space', '../Home', 'a'.repeat(65), 123, null]) assert.throws(() => validate([{ ...item, id }]), /valid IDs/);
  assert.throws(() => validate([item, { ...item, page: 'About' }]), /valid IDs/);
  assert.throws(() => validate([item, { ...item, id: 'different-id' }]), /supported pages/);
  for (const page of ['AdminDashboard', 'https://example.test', 'javascript:alert(1)', '/About', 'home', null]) assert.throws(() => validate([{ ...item, page }]), /supported pages/);
  for (const label of ['', '   ', 'a'.repeat(61), '\nHome', 'Home\u007f', 123]) assert.throws(() => validate([{ ...item, label }]), /labels/);
  for (const visible of [undefined, null, 'true', 'false', 0, 1, {}]) assert.throws(() => validate([{ ...item, visible }]), /boolean/);
  assert.throws(() => validate([{ ...item, url: 'https://example.test' }]), /accept only/);
  assert.throws(() => validate([{ ...item, password: 'never store' }]), /Private fields/);
  assert.throws(() => validate([JSON.parse('{"id":"nav-home","page":"Home","label":"Home","visible":true,"__proto__":{}}')]), /Private fields/);
});

test('navigation singleton requires versions and logs genuine changes atomically', async () => {
  const database = memoryDatabase(); const repository = createContentRepository({ database });
  const created = await repository.createContent('NavigationMenu', { ...DEFAULT_NAVIGATION_MENU, id: 'forged-id' }, actor);
  assert.equal(created.id, NAVIGATION_MENU_ID);
  await assert.rejects(repository.createContent('NavigationMenu', DEFAULT_NAVIGATION_MENU, actor), (error) => error.status === 409);
  await assert.rejects(repository.deleteContent('NavigationMenu', created.id, actor), (error) => error.status === 405);
  for (const version of [undefined, null, '1', 0, 1.5]) await assert.rejects(repository.updateContent('NavigationMenu', created.id, { items: [], version }, actor), (error) => error.status === 400);
  const changedItems = [...created.items].reverse().map((item, index) => index ? item : { ...item, visible: false, label: 'Get in touch' });
  const updated = await repository.updateContent('NavigationMenu', created.id, { ...created, items: changedItems }, actor);
  assert.equal(updated.version, 2); assert.deepEqual(updated.items, changedItems);
  await assert.rejects(repository.updateContent('NavigationMenu', created.id, { ...created, items: [] }, actor), (error) => error.status === 409);
  const unchanged = await repository.updateContent('NavigationMenu', created.id, { ...updated }, actor);
  const empty = await repository.updateContent('NavigationMenu', created.id, { ...unchanged, items: [] }, actor);
  assert.deepEqual((await repository.listContent('NavigationMenu'))[0].items, []);
  const events = database.state.audits;
  assert.equal(events[1].values[1], actor.userId); assert.match(events[1].sql, /UTC_TIMESTAMP/);
  assert.deepEqual(JSON.parse(events[1].values[5]).changed_fields, ['items']);
  assert.deepEqual(JSON.parse(events[2].values[5]).changed_fields, []);
  assert.deepEqual(JSON.parse(events[3].values[5]).changed_fields, ['items']);
  assert(!JSON.stringify(events).includes('Get in touch'));
  database.state.failAudit = true;
  await assert.rejects(repository.updateContent('NavigationMenu', created.id, { ...empty, items: DEFAULT_NAVIGATION_MENU.items }, actor), /audit unavailable/);
  assert.deepEqual((await repository.listContent('NavigationMenu'))[0], empty);
});

test('navigation is public to read but only admins with branding permission can mutate', async (t) => {
  const database = memoryDatabase(); const content = createContentRepository({ database });
  await content.createContent('NavigationMenu', DEFAULT_NAVIGATION_MENU, actor);
  const sessions = {
    admin: { id: actor.userId, role: 'admin', permissions: ['content.read', 'branding.write'] },
    super: { id: 'super', role: 'super', permissions: ['content.read', 'branding.write'] },
    viewer: { id: 'viewer', role: 'viewer', permissions: ['content.read', 'branding.write'] },
    limited: { id: 'limited', role: 'admin', permissions: ['content.read'] },
  };
  const app = createApp({ pool: database, content, auth: { getSession: async (token) => sessions[token] || null }, allowedOrigins: ['http://navigation.test'], secureCookies: false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/navigation-menu`;
  const request = (suffix = '', method = 'GET', body, session) => fetch(base + suffix, { method, headers: { origin: 'http://navigation.test', 'content-type': 'application/json', ...(session ? { cookie: `d16_session=${session}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.deepEqual((await (await request()).json())[0].items, DEFAULT_NAVIGATION_MENU.items);
  assert.equal((await request('?admin=1')).status, 401);
  for (const session of [undefined, 'forged', 'super', 'viewer', 'limited']) {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await request(method === 'POST' ? '' : `/${NAVIGATION_MENU_ID}`, method, { role: 'admin', actor_user_id: actor.userId, version: 1, items: [] }, session);
      assert.equal(response.status, !session || session === 'forged' ? 401 : 403);
    }
  }
  const response = await request(`/${NAVIGATION_MENU_ID}`, 'PUT', { version: 1, items: [], actor_user_id: 'forged' }, 'admin');
  assert.equal(response.status, 200); assert.deepEqual((await response.json()).items, []);
  assert.equal(database.state.audits.at(-1).values[1], actor.userId);
  assert.equal((await request(`/${NAVIGATION_MENU_ID}`, 'PUT', { items: [] }, 'admin')).status, 400);
  assert.equal((await request(`/${NAVIGATION_MENU_ID}`, 'PUT', { version: 1, items: [] }, 'admin')).status, 409);
  assert.equal((await request(`/${NAVIGATION_MENU_ID}`, 'DELETE', {}, 'admin')).status, 405);
  assert.deepEqual((await (await request()).json())[0].items, []);
});
