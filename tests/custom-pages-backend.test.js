import test from 'node:test';
import assert from 'node:assert/strict';
import { PAGE_TYPES, createCustomPage, validateCustomPage, getCustomPagePath, isPublishedCustomPage } from '../server/src/customPageSchema.js';

// Isolated synthetic configuration: never open a hosting database or load secrets.
Object.assign(process.env, {
  API_ENV_FILE: '/dev/null', NODE_ENV: 'qa', DB_HOST: '127.0.0.1', DB_PORT: '65531', DB_NAME: 'dinterio_d16_qa', DB_USER: 'offline_test', DB_PASSWORD: 'synthetic-test-only',
  APP_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 73).toString('base64'), APP_HMAC_KEY_BASE64: Buffer.alloc(32, 84).toString('base64'),
});
const { cleanPublicPayload, createContentRepository, NAVIGATION_MENU_ID } = await import('../server/src/contentService.js');
const { createApp } = await import('../server/src/app.js');
const { pool } = await import('../server/src/db.js');
test.after(() => pool.end());
const actor = { userId: '90000000-0000-4000-8000-000000000001', ipAddress: '127.0.0.1', userAgent: 'synthetic-custom-page-test' };
const page = (overrides = {}) => ({ ...createCustomPage(), title: 'Our story', ...overrides });
const exampleId = '91000000-0000-4000-8000-000000000001';

function memoryDatabase() {
  const state = { rows: [], audits: [], failAudit: false };
  let tail = Promise.resolve();
  const execute = async (sql, values = []) => {
    if (sql.startsWith('SELECT * FROM app_content')) return [state.rows.filter((row) => row.entity_type === values[0] && (!values[1] || row.id === values[1]))];
    if (sql.startsWith('INSERT INTO app_content')) {
      if (state.rows.some((row) => row.entity_type === values[0] && row.id === values[1])) throw Object.assign(new Error('Duplicate row'), { code: 'ER_DUP_ENTRY' });
      state.rows.push({ entity_type: values[0], id: values[1], payload: values[2], version: 1, created_at: '2026-09-28 12:00:00', updated_at: '2026-09-28 12:00:00' });
    } else if (sql.startsWith('UPDATE app_content SET payload')) {
      const row = state.rows.find((row) => row.entity_type === values[1] && row.id === values[2]);
      row.payload = values[0]; row.version++;
    } else if (sql.startsWith('INSERT INTO audit_logs')) {
      if (state.failAudit) throw new Error('Synthetic audit unavailable');
      state.audits.push({ sql, values });
    } else throw new Error('Unexpected synthetic database query');
    return [{ affectedRows: 1 }];
  };
  return { state, execute, async getConnection() {
    let previous; let unlock;
    const ready = tail;
    tail = new Promise((resolve) => { unlock = resolve; });
    return {
      async beginTransaction() { await ready; previous = structuredClone({ rows: state.rows, audits: state.audits }); },
      async commit() {},
      async rollback() { state.rows = previous.rows; state.audits = previous.audits; },
      release() { unlock(); }, execute,
    };
  } };
}

test('custom-page templates are independent, normalized and map to stable safe URLs', () => {
  assert.deepEqual(PAGE_TYPES.map(({ value }) => value), ['landing', 'standard', 'services', 'portfolio', 'concepts', 'gallery', 'blog', 'contact', 'faq', 'team']);
  for (const { value, label, description } of PAGE_TYPES) {
    assert(label && description);
    const draft = createCustomPage(value);
    assert.equal(draft.page_type, value); assert.equal(draft.published, false); assert.deepEqual(draft.items, []);
    assert.equal(validateCustomPage({ ...draft, title: '  New page  ' }).title, 'New page');
  }
  const first = createCustomPage(); first.items.push({ id: 'local' });
  assert.deepEqual(createCustomPage().items, []);
  const input = page({ id: exampleId, version: 2, created_date: '2026-01-01', updated_date: '', updated_at: '', title: '  Café & our story!  ', items: [{ id: 'one', title: '  Welcome  ' }] });
  const normalized = validateCustomPage(input);
  assert.deepEqual(normalized.items, [{ id: 'one', title: 'Welcome', text: '', image: '', meta: '' }]);
  assert.equal(input.items[0].title, '  Welcome  ', 'Validation does not change the caller draft');
  assert(!Object.hasOwn(normalized, 'id')); assert(!Object.hasOwn(normalized, 'version'));
  assert.equal(getCustomPagePath(input), `/Pages/${exampleId}/cafe-our-story`);
  assert.equal(getCustomPagePath({ id: exampleId, title: 'বাংলা' }), `/Pages/${exampleId}/page`);
  assert.throws(() => getCustomPagePath({ id: '../../admin', title: 'Test' }));
  for (const value of [false, undefined, null, 1, 'true']) assert.equal(isPublishedCustomPage({ published: value }), false);
  assert.equal(isPublishedCustomPage({ published: true }), true);
});

test('custom-page schema rejects invalid types, unsafe images, oversized or malformed content', () => {
  for (const page_type of ['unknown', null, 1]) assert.throws(() => validateCustomPage(page({ page_type })), /supported page type/);
  for (const published of [undefined, null, 1, 0, 'false']) assert.throws(() => validateCustomPage(page({ published })), /boolean/);
  for (const title of ['', '   ', 'a'.repeat(121), 1, 'bad\u0000title']) assert.throws(() => validateCustomPage(page({ title })));
  for (const [field, maximum] of [['intro', 2000], ['body', 20000]]) assert.throws(() => validateCustomPage(page({ [field]: 'a'.repeat(maximum + 1) })));
  for (const items of [null, {}, Array(41).fill({ id: 'one' }), [{ id: 'dup' }, { id: 'dup' }], [{ id: '../bad' }], [{ id: 'one', password: 'private' }], [{ id: 'one', text: 'a'.repeat(10001) }]]) assert.throws(() => validateCustomPage(page({ items })));
  for (const hero_image of ['javascript:alert(1)', '//example.test/image.png', 'https://user:secret@example.test/a.png', '/uploads/../secret.png', '/uploads/test.svg', 'file:///test.png', 'https://example.test\\test', 'https://example.test/a\nb.png']) assert.throws(() => validateCustomPage(page({ hero_image })));
  for (const hero_image of ['https://example.test/image.png', 'http://example.test/image.jpg', '/uploads/test.webp']) assert.equal(validateCustomPage(page({ hero_image })).hero_image, hero_image);
  const data = 'data:image/png;base64,aGVsbG8=';
  assert.throws(() => validateCustomPage(page({ hero_image: data })));
  assert.equal(validateCustomPage(page({ hero_image: data }), { allowDataImages: true }).hero_image, data);
  assert.throws(() => validateCustomPage(page({ hero_image: 'data:image/svg+xml;base64,PHN2Zz4=' }), { allowDataImages: true }));
  assert.throws(() => validateCustomPage(page({ secret: 'private' })), /only page content/);
  assert.throws(() => cleanPublicPayload('CustomPage', page({ published: 1 })), (error) => error.status === 400);
  assert.deepEqual(cleanPublicPayload('CustomPage', page({ actor_user_id: 'forged' })), page());
  assert.equal(validateCustomPage(page({ body: '<script>plain text only</script>' })).body, '<script>plain text only</script>');
});

test('custom pages preserve versions, audit actor/time/changes and roll back on audit failure', async () => {
  const database = memoryDatabase(); const content = createContentRepository({ database });
  await assert.rejects(content.createContent('CustomPage', page(), {}), (error) => error.status === 401);
  const created = await content.createContent('CustomPage', page({ id: 'forged-id' }), actor);
  assert.match(created.id, /^[0-9a-f-]{36}$/); assert.equal(created.version, 1);
  for (const version of [undefined, null, '1', 0, 1.5]) await assert.rejects(content.updateContent('CustomPage', created.id, { title: 'Change', version }, actor), (error) => error.status === 400);
  const concurrent = await Promise.allSettled([
    content.updateContent('CustomPage', created.id, { version: 1, title: 'First editor' }, actor),
    content.updateContent('CustomPage', created.id, { version: 1, title: 'Second editor' }, actor),
  ]);
  assert.equal(concurrent.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(concurrent.find((result) => result.status === 'rejected').reason.status, 409);
  const current = (await content.listContent('CustomPage'))[0];
  const unchanged = await content.updateContent('CustomPage', created.id, current, actor);
  assert.deepEqual(JSON.parse(database.state.audits.at(-1).values[5]).changed_fields, []);
  const event = database.state.audits[1];
  assert.equal(event.values[1], actor.userId); assert.equal(event.values[3], 'CustomPage'); assert.equal(event.values[4], created.id);
  assert.match(event.sql, /UTC_TIMESTAMP/); assert.deepEqual(JSON.parse(event.values[5]).changed_fields, ['title']);
  assert(!JSON.stringify(database.state.audits).includes('First editor'));
  database.state.failAudit = true;
  await assert.rejects(content.updateContent('CustomPage', created.id, { version: unchanged.version, published: true }, actor), /audit unavailable/);
  assert.deepEqual((await content.listContent('CustomPage'))[0], unchanged);
  await assert.rejects(content.createContent('CustomPage', page({ title: 'Must roll back' }), actor), /audit unavailable/);
  assert.equal((await content.listContent('CustomPage')).length, 1);
  await assert.rejects(content.deleteContent('CustomPage', created.id, actor), (error) => error.status === 405 && /unpublish/.test(error.message));
});

test('navigation can reference saved draft pages but rejects missing or duplicate custom targets', async () => {
  const database = memoryDatabase(); const content = createContentRepository({ database });
  const created = await content.createContent('CustomPage', page(), actor);
  const item = { id: 'custom-link', page: `custom:${created.id}`, label: 'Our story', visible: true };
  const navigation = await content.createContent('NavigationMenu', { title: 'Navigation', items: [item] }, actor);
  assert.equal(navigation.id, NAVIGATION_MENU_ID); assert.deepEqual(navigation.items, [item]);
  await assert.rejects(content.updateContent('NavigationMenu', navigation.id, { version: 1, items: [{ ...item, page: `custom:${exampleId}` }] }, actor), (error) => error.status === 400);
  assert.throws(() => cleanPublicPayload('NavigationMenu', { title: 'Navigation', items: [item, { ...item, id: 'different', page: item.page.toUpperCase().replace('CUSTOM:', 'custom:') }] }), /supported pages/);
  assert.throws(() => cleanPublicPayload('NavigationMenu', { title: 'Navigation', items: [{ ...item, page: 'custom:../../Admin' }] }), /supported pages/);
  assert.deepEqual((await content.listContent('NavigationMenu'))[0].items, [item]);
});

test('custom-page API exposes only published records and requires admin plus branding permission', async (t) => {
  const database = memoryDatabase(); const content = createContentRepository({ database });
  const draft = await content.createContent('CustomPage', page({ title: 'Private draft' }), actor);
  const published = await content.createContent('CustomPage', page({ title: 'Published page', published: true }), actor);
  database.state.rows.push({ entity_type: 'CustomPage', id: exampleId, payload: JSON.stringify({ title: 'Malformed publication', published: 1 }), version: 1 });
  const sessions = {
    admin: { id: actor.userId, role: 'admin', permissions: ['branding.write'] },
    super: { id: 'super', role: 'super', permissions: ['content.read', 'branding.write'] },
    viewer: { id: 'viewer', role: 'viewer', permissions: ['content.read', 'branding.write'] },
    limited: { id: 'limited', role: 'admin', permissions: ['content.read'] },
  };
  const app = createApp({ pool: database, content, auth: { getSession: async (token) => sessions[token] || null }, allowedOrigins: ['http://custom-pages.test'], secureCookies: false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}/api/custom-pages`;
  const request = (suffix = '', method = 'GET', body, session) => fetch(base + suffix, { method, headers: { origin: 'http://custom-pages.test', 'content-type': 'application/json', ...(session ? { cookie: `d16_session=${session}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.deepEqual((await (await request()).json()).map(({ id }) => id), [published.id]);
  for (const session of [undefined, 'forged', 'super', 'viewer', 'limited']) {
    const status = !session || session === 'forged' ? 401 : 403;
    assert.equal((await request('?admin=1', 'GET', undefined, session)).status, status);
    for (const method of ['POST', 'PUT', 'DELETE']) assert.equal((await request(method === 'POST' ? '' : `/${draft.id}`, method, { ...draft, actor_user_id: 'forged', role: 'admin' }, session)).status, status);
  }
  assert.equal((await (await request('?admin=1', 'GET', undefined, 'admin')).json()).length, 3);
  const update = await request(`/${draft.id}`, 'PUT', { version: 1, published: true, actor_user_id: 'forged' }, 'admin');
  assert.equal(update.status, 200); const edited = await update.json();
  assert.equal(database.state.audits.at(-1).values[1], actor.userId);
  assert.equal((await (await request()).json()).length, 2);
  assert.equal((await request(`/${draft.id}`, 'PUT', { version: edited.version, published: false }, 'admin')).status, 200);
  assert.deepEqual((await (await request()).json()).map(({ id }) => id), [published.id]);
  assert.equal((await request(`/${draft.id}`, 'PUT', { title: 'Missing version' }, 'admin')).status, 400);
  assert.equal((await request(`/${draft.id}`, 'DELETE', {}, 'admin')).status, 405);
});
