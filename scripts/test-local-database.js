// Disposable integration verification. Never reads your real QA environment file.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import mysql from 'mysql2/promise';
import { ABOUT_PAGE_ID, DEFAULT_ABOUT } from '../src/data/aboutContent.js';
import { DASHBOARD_LAYOUT_ID, WEBSITE_ICONS_ID, DEFAULT_DASHBOARD_LAYOUT, DEFAULT_WEBSITE_ICONS } from '../src/data/siteAppearance.js';
import { NAVIGATION_MENU_ID, DEFAULT_NAVIGATION_MENU, validateNavigationItems, validateNavigationSettings } from '../src/data/navigation.js';
import { createCustomPage } from '../server/src/customPageSchema.js';
import { gallerySelectionMessage, selectionParams, resolveGallerySelection } from '../src/data/conceptGallerySelection.js';

const container = `d16-sync-test-${randomUUID().slice(0, 8)}`;
const password = randomBytes(32).toString('base64url');
const docker = (args, options = {}) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`Docker command failed: ${result.stderr || result.error?.message}`);
  return result.stdout.trim();
};
let database, server, applicationPool;
let created = false;
try {
  docker(['run', '--rm', '-d', '--name', container, '-p', '127.0.0.1::3306', '-e', 'MARIADB_RANDOM_ROOT_PASSWORD=1', '-e', 'MARIADB_DATABASE=dinterio_d16_qa', '-e', 'MARIADB_USER=d16_local_test', '-e', 'MARIADB_PASSWORD', 'mariadb:10.11'], { env: { ...process.env, MARIADB_PASSWORD: password } });
  created = true;
  const mapped = docker(['port', container, '3306/tcp']);
  const port = Number(mapped.split(':').at(-1));
  assert(port > 0 && mapped.startsWith('127.0.0.1:'));
  for (let attempt = 0; attempt < 60; attempt++) {
    try { database = await mysql.createConnection({ host: '127.0.0.1', port, user: 'd16_local_test', password, database: 'dinterio_d16_qa', multipleStatements: true, timezone: 'Z' }); break; }
    catch { await delay(500); }
  }
  assert(database, 'Local database did not become ready');
  await database.query(readFileSync('database/schema.mysql.sql', 'utf8'));
  await database.query(readFileSync('database/seed.qa.synthetic.mysql.sql', 'utf8'));
  const migrations = readdirSync('database/migrations').filter((name) => name.endsWith('.sql')).sort();
  for (const name of migrations) await database.query(readFileSync(`database/migrations/${name}`, 'utf8'));
  const [[seeded]] = await database.query("SELECT payload FROM app_content WHERE entity_type='Service' AND id='32000000-0000-4000-8000-000000000001'");
  const seededPayload = typeof seeded.payload === 'string' ? JSON.parse(seeded.payload) : seeded.payload;
  assert.deepEqual(seededPayload.features, ['Synthetic feature A', 'Synthetic feature B']);
  const [[seededAbout]] = await database.query("SELECT payload FROM app_content WHERE entity_type='AboutPage' AND id=?", [ABOUT_PAGE_ID]);
  assert.deepEqual(typeof seededAbout.payload === 'string' ? JSON.parse(seededAbout.payload) : seededAbout.payload, DEFAULT_ABOUT);
  const appearanceFixtures = [
    ['DashboardLayout', DASHBOARD_LAYOUT_ID, DEFAULT_DASHBOARD_LAYOUT, { ...DEFAULT_DASHBOARD_LAYOUT, card_order: ['AdminIcons', 'AdminAbout'] }],
    ['WebsiteIcons', WEBSITE_ICONS_ID, DEFAULT_WEBSITE_ICONS, { ...DEFAULT_WEBSITE_ICONS, icons: { 'values.budget': { icon_name: 'Wallet', icon_url: '' } } }],
    ['NavigationMenu', NAVIGATION_MENU_ID, DEFAULT_NAVIGATION_MENU, { ...DEFAULT_NAVIGATION_MENU, items: [] }],
  ];
  for (const [entity, id, defaults, editedPayload] of appearanceFixtures) {
    const [[seededConfig]] = await database.query('SELECT payload FROM app_content WHERE entity_type=? AND id=?', [entity, id]);
    const seededValue = typeof seededConfig.payload === 'string' ? JSON.parse(seededConfig.payload) : seededConfig.payload;
    // Migration 005 is intentionally unchanged: older saved menus gain defaults
    // in validation without overwriting any existing menu on migration reruns.
    const normalizedSeed = entity === 'NavigationMenu' ? { ...seededValue, ...validateNavigationSettings(seededValue), items: validateNavigationItems(seededValue.items) } : seededValue;
    assert.deepEqual(normalizedSeed, defaults);
    await database.query('UPDATE app_content SET payload=? WHERE entity_type=? AND id=?', [JSON.stringify(editedPayload), entity, id]);
  }
  await database.query("UPDATE app_content SET payload=JSON_SET(payload,'$.mission_text','Retain edited QA mission') WHERE entity_type='AboutPage' AND id=?", [ABOUT_PAGE_ID]);
  await database.query("DELETE rp FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id WHERE r.role_key='super' AND p.permission_key='section.about.write'");
  await database.query("UPDATE app_content SET payload=JSON_SET(payload,'$.description','Retain edited QA content') WHERE entity_type='Service' AND id='32000000-0000-4000-8000-000000000001'");
  for (const name of migrations) await database.query(readFileSync(`database/migrations/${name}`, 'utf8'));
  const [[retained]] = await database.query("SELECT JSON_UNQUOTE(JSON_EXTRACT(payload,'$.description')) AS description FROM app_content WHERE entity_type='Service' AND id='32000000-0000-4000-8000-000000000001'");
  assert.equal(retained.description, 'Retain edited QA content');
  const [[retainedAbout]] = await database.query("SELECT JSON_UNQUOTE(JSON_EXTRACT(payload,'$.mission_text')) AS mission FROM app_content WHERE entity_type='AboutPage' AND id=?", [ABOUT_PAGE_ID]);
  assert.equal(retainedAbout.mission, 'Retain edited QA mission');
  const [revokedGrants] = await database.query("SELECT rp.id FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id WHERE r.role_key='super' AND p.permission_key='section.about.write'");
  assert.equal(revokedGrants.length, 0);
  for (const [entity, id, , editedPayload] of appearanceFixtures) {
    const [[retainedConfig]] = await database.query('SELECT payload FROM app_content WHERE entity_type=? AND id=?', [entity, id]);
    assert.deepEqual(typeof retainedConfig.payload === 'string' ? JSON.parse(retainedConfig.payload) : retainedConfig.payload, editedPayload);
  }
  console.log('PASS: fresh schema and repeatable additive migrations retain edited About/appearance content, empty navigation and revoked grants');

  delete process.env.API_ENV_FILE;
  delete process.env.DB_SOCKET_PATH;
  delete process.env.DB_SSL_CA_FILE;
  Object.assign(process.env, { NODE_ENV: 'qa', DB_HOST: '127.0.0.1', DB_PORT: String(port), DB_NAME: 'dinterio_d16_qa', DB_USER: 'd16_local_test', DB_PASSWORD: password, DB_SSL: 'false', APP_ENCRYPTION_KEY_BASE64: randomBytes(32).toString('base64'), APP_HMAC_KEY_BASE64: randomBytes(32).toString('base64') });
  const { pool } = await import('../server/src/db.js'); applicationPool = pool;
  const { createAuthService } = await import('../server/src/authService.js');
  const { createApp } = await import('../server/src/app.js');
  const content = await import('../server/src/contentService.js');
  const { LIVE_SERVICES, LIVE_CONCEPTS } = await import('../src/data/liveContent.js');
  const auth = createAuthService({ pool });
  const adminPassword = randomBytes(24).toString('base64url');
  const admin = await auth.bootstrapAdmin({ email: 'admin@example.test', name: 'QA Administrator', password: adminPassword });
  await assert.rejects(auth.bootstrapAdmin({ email: 'another@example.test', password: adminPassword }));
  const [users] = await database.query('SELECT * FROM users');
  assert(!users[0].email_ciphertext.toString().includes('admin@example.test'));
  assert(users[0].password_hash.startsWith('scrypt$'));
  assert(!JSON.stringify(admin).includes(adminPassword));
  console.log('PASS: one-time admin bootstrap, encrypted email, hashed password');

  const origin = 'http://127.0.0.1:5173';
  const app = createApp({ pool, content, auth, allowedOrigins: [origin], secureCookies: false });
  server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = '';
  async function request(path, method = 'GET', payload, session = cookie, requestOrigin = origin) {
    const response = await fetch(base + path, { method, headers: { Origin: requestOrigin, 'Content-Type': 'application/json', ...(session ? { Cookie: session } : {}) }, ...(payload !== undefined ? { body: JSON.stringify(payload) } : {}) });
    const body = response.status === 204 ? null : await response.json();
    return { response, body, status: response.status };
  }
  assert.equal((await request('/health')).status, 200);
  assert.equal((await request('/services', 'POST', { title: 'Blocked' }, '')).status, 401);
  assert.equal((await request('/services', 'POST', { title: 'Blocked' }, '', 'https://untrusted.example')).status, 403);
  assert.equal((await request('/consultations', 'GET', undefined, '')).status, 401);
  const login = await request('/auth/login', 'POST', { email: 'admin@example.test', password: adminPassword });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  cookie = login.response.headers.get('set-cookie').split(';')[0];
  assert(login.response.headers.get('set-cookie').includes('HttpOnly'));
  assert(login.response.headers.get('set-cookie').includes('SameSite=Strict'));
  assert.equal((await request('/auth/me')).body.user.id, admin.id);
  console.log('PASS: real cookie login, public/private boundaries and origin checks');

  assert.equal((await request('/dashboard-layout', 'GET', undefined, '')).status, 401);
  assert.equal((await request('/website-icons', 'GET', undefined, '')).status, 200);
  assert.equal((await request('/navigation-menu', 'GET', undefined, '')).status, 200);
  assert.deepEqual((await request('/navigation-menu', 'GET', undefined, '')).body[0].items, []);
  for (const [endpoint, entity, id, field, value] of [
    ['/dashboard-layout', 'DashboardLayout', DASHBOARD_LAYOUT_ID, 'card_order', ['AdminAbout', 'AdminIcons']],
    ['/website-icons', 'WebsiteIcons', WEBSITE_ICONS_ID, 'icons', { 'values.budget': { icon_name: 'Star', icon_url: '' }, 'about.mission': { icon_name: 'Image', icon_url: '/uploads/test-icon.webp' } }],
    ['/navigation-menu', 'NavigationMenu', NAVIGATION_MENU_ID, 'items', [...DEFAULT_NAVIGATION_MENU.items].reverse().map((item, index) => index ? item : { ...item, label: 'Get in touch', visible: false })],
  ]) {
    const current = (await request(endpoint)).body[0];
    assert.equal(current.id, id);
    assert.equal((await request(`${endpoint}/${id}`, 'PUT', { [field]: value })).status, 400);
    const editedConfig = await request(`${endpoint}/${id}`, 'PUT', { ...current, [field]: value });
    assert.equal(editedConfig.status, 200, JSON.stringify(editedConfig.body));
    assert.deepEqual(editedConfig.body[field], value);
    assert.deepEqual((await request(endpoint)).body[0][field], value);
    assert.equal((await request(`${endpoint}/${id}`, 'PUT', { ...current, [field]: value })).status, 409);
    assert.equal((await request(endpoint, 'POST', { ...current, [field]: value })).status, 409);
    assert.equal((await request(`${endpoint}/${id}`, 'DELETE', {})).status, 405);
    const invalid = entity === 'DashboardLayout' ? ['AdminAbout', 'AdminAbout'] : entity === 'NavigationMenu' ? [DEFAULT_NAVIGATION_MENU.items[0], DEFAULT_NAVIGATION_MENU.items[0]] : { 'values.budget': { icon_name: 'PiggyBank', icon_url: '' } };
    assert.equal((await request(`${endpoint}/${id}`, 'PUT', { ...editedConfig.body, [field]: invalid })).status, 400);
    const concurrent = await Promise.all([
      request(`${endpoint}/${id}`, 'PUT', { ...editedConfig.body, title: 'First concurrent editor' }),
      request(`${endpoint}/${id}`, 'PUT', { ...editedConfig.body, title: 'Second concurrent editor' }),
    ]);
    assert.deepEqual(concurrent.map((entry) => entry.status).sort(), [200, 409]);
    const configAudit = (await request('/audit-logs')).body.filter((row) => row.entity_name === entity);
    assert.equal(configAudit.length, 2);
    assert(configAudit.every((row) => row.actor_user_id === admin.id && row.created_at));
    assert(configAudit.some((row) => JSON.stringify(row.new_data.changed_fields) === JSON.stringify([field])));
    assert(configAudit.some((row) => JSON.stringify(row.new_data.changed_fields) === JSON.stringify(['title'])));
    const beforeFailure = (await request(endpoint)).body[0];
    const failingAppearance = content.createContentRepository({ database: pool, audit: async () => { throw new Error('synthetic appearance audit failure'); } });
    await assert.rejects(failingAppearance.updateContent(entity, id, { ...beforeFailure, title: 'Must roll back appearance' }, { userId: admin.id }), /audit failure/);
    assert.deepEqual((await request(endpoint)).body[0], beforeFailure);
    if (entity === 'NavigationMenu') {
      const emptied = await request(`${endpoint}/${id}`, 'PUT', { ...beforeFailure, items: [] });
      assert.equal(emptied.status, 200);
      assert.deepEqual((await request(endpoint, 'GET', undefined, '')).body[0].items, []);
      await database.query(readFileSync('database/migrations/005_navigation.sql', 'utf8'));
      assert.deepEqual((await request(endpoint, 'GET', undefined, '')).body[0].items, []);
      const grouped = await request(`${endpoint}/${id}`, 'PUT', { version: emptied.body.version, items: DEFAULT_NAVIGATION_MENU.items.map((item, index) => ({ ...item, in_dropdown: index % 2 === 0 })), dropdown_enabled: true, dropdown_label: 'Explore' });
      assert.equal(grouped.status, 200, JSON.stringify(grouped.body));
      assert.equal(grouped.body.items.filter((item) => item.in_dropdown).length, 4);
      assert.equal(grouped.body.dropdown_label, 'Explore');
      const renamed = await request(`${endpoint}/${id}`, 'PUT', { version: grouped.body.version, dropdown_label: 'Discover' });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.body.dropdown_enabled, true);
      assert.deepEqual(renamed.body.items, grouped.body.items);
      assert.equal((await request(`${endpoint}/${id}`, 'PUT', { version: grouped.body.version, dropdown_label: 'Stale' })).status, 409);
      assert.equal((await request(`${endpoint}/${id}`, 'PUT', { version: renamed.body.version, dropdown_enabled: 'false' })).status, 400);
      const disabled = await request(`${endpoint}/${id}`, 'PUT', { version: renamed.body.version, dropdown_enabled: false });
      assert.equal(disabled.status, 200);
      assert.deepEqual(disabled.body.items, grouped.body.items);
      assert.deepEqual((await request(endpoint, 'GET', undefined, '')).body[0], disabled.body);
      const settingsAudits = (await request('/audit-logs')).body.filter((row) => row.entity_name === entity && row.new_data.changed_fields.includes('dropdown_label'));
      assert(settingsAudits.some((row) => row.actor_user_id === admin.id && row.created_at && row.new_data.changed_fields.length === 1));
      await assert.rejects(failingAppearance.updateContent(entity, id, { version: disabled.body.version, dropdown_label: 'Must roll back' }, { userId: admin.id }), /audit failure/);
      assert.deepEqual((await request(endpoint)).body[0], disabled.body);
    }
  }
  console.log('PASS: shared dashboard/icon/navigation persistence, client-selected dropdown/title, admin/private boundaries, mandatory versions, concurrent edits, validation and atomic audit history');

  assert.equal((await request('/custom-pages?admin=1', 'GET', undefined, '')).status, 401);
  assert.equal((await request('/custom-pages', 'POST', { ...createCustomPage(), title: 'Anonymous draft' }, '')).status, 401);
  const customDraft = await request('/custom-pages', 'POST', { ...createCustomPage('faq'), title: 'Synthetic FAQ draft', items: [{ id: 'one', title: 'Question?', text: 'Plain-text answer', image: '', meta: '' }], actor_user_id: 'forged' });
  assert.equal(customDraft.status, 201, JSON.stringify(customDraft.body));
  assert.equal(customDraft.body.version, 1);
  assert(!(await request('/custom-pages', 'GET', undefined, '')).body.some((row) => row.id === customDraft.body.id));
  assert((await request('/custom-pages?admin=1')).body.some((row) => row.id === customDraft.body.id));
  assert.equal((await request(`/custom-pages/${customDraft.body.id}`, 'PUT', { published: true })).status, 400);
  assert.equal((await request(`/custom-pages/${customDraft.body.id}`, 'PUT', { version: 1, hero_image: 'javascript:alert(1)' })).status, 400);
  const publishedCustom = await request(`/custom-pages/${customDraft.body.id}`, 'PUT', { version: 1, published: true });
  assert.equal(publishedCustom.status, 200, JSON.stringify(publishedCustom.body));
  assert((await request('/custom-pages', 'GET', undefined, '')).body.some((row) => row.id === customDraft.body.id));
  const simultaneousCustomEdits = await Promise.all([
    request(`/custom-pages/${customDraft.body.id}`, 'PUT', { version: publishedCustom.body.version, title: 'Synthetic FAQ first edit' }),
    request(`/custom-pages/${customDraft.body.id}`, 'PUT', { version: publishedCustom.body.version, title: 'Synthetic FAQ second edit' }),
  ]);
  assert.deepEqual(simultaneousCustomEdits.map((entry) => entry.status).sort(), [200, 409]);
  const currentCustomPage = (await request('/custom-pages?admin=1')).body.find((row) => row.id === customDraft.body.id);
  const failingCustomAudit = content.createContentRepository({ database: pool, audit: async () => { throw new Error('synthetic custom-page audit failure'); } });
  await assert.rejects(failingCustomAudit.updateContent('CustomPage', currentCustomPage.id, { ...currentCustomPage, published: false }, { userId: admin.id }), /audit failure/);
  assert.deepEqual((await request('/custom-pages?admin=1')).body.find((row) => row.id === customDraft.body.id), currentCustomPage);
  const customAudit = (await request('/audit-logs')).body.filter((row) => row.entity_name === 'CustomPage');
  assert.equal(customAudit.length, 3);
  assert(customAudit.every((row) => row.actor_user_id === admin.id && row.created_at && row.entity_id === customDraft.body.id));
  assert(customAudit.some((row) => JSON.stringify(row.new_data.changed_fields) === JSON.stringify(['published'])));
  assert(!JSON.stringify(customAudit).includes('Synthetic FAQ'));
  const currentMenu = (await request('/navigation-menu')).body[0];
  const customLink = { id: 'nav-custom-faq', page: `custom:${customDraft.body.id}`, label: 'FAQ', visible: true, in_dropdown: false };
  const linkedCustom = await request(`/navigation-menu/${NAVIGATION_MENU_ID}`, 'PUT', { ...currentMenu, items: [customLink] });
  assert.equal(linkedCustom.status, 200, JSON.stringify(linkedCustom.body));
  assert.equal((await request(`/navigation-menu/${NAVIGATION_MENU_ID}`, 'PUT', { ...linkedCustom.body, items: [{ ...customLink, page: `custom:${randomUUID()}` }] })).status, 400);
  const unpublishedCustom = await request(`/custom-pages/${currentCustomPage.id}`, 'PUT', { version: currentCustomPage.version, published: false });
  assert.equal(unpublishedCustom.status, 200);
  assert(!(await request('/custom-pages', 'GET', undefined, '')).body.some((row) => row.id === currentCustomPage.id));
  assert.equal((await request(`/custom-pages/${currentCustomPage.id}`, 'DELETE', {})).status, 405);
  for (const name of migrations) await database.query(readFileSync(`database/migrations/${name}`, 'utf8'));
  assert.deepEqual((await request('/custom-pages?admin=1')).body.find((row) => row.id === currentCustomPage.id), unpublishedCustom.body);
  assert.deepEqual((await request('/navigation-menu')).body[0].items, [customLink]);
  console.log('PASS: custom-page draft privacy, publication/unpublication, custom navigation references, mandatory/concurrent versions, retained migrations and attributed atomic history');

  const about = (await request('/about-page', 'GET', undefined, '')).body[0];
  assert.equal(about.id, ABOUT_PAGE_ID);
  const aboutEdit = await request(`/about-page/${about.id}`, 'PUT', { version: about.version, mission_text: 'Approved synthetic mission', vision_text: 'Approved synthetic vision', team_members: [...about.team_members].reverse() });
  assert.equal(aboutEdit.status, 200, JSON.stringify(aboutEdit.body));
  assert.equal(aboutEdit.body.version, about.version + 1);
  assert.equal(aboutEdit.body.mission_text, 'Approved synthetic mission');
  assert.equal(aboutEdit.body.vision_text, 'Approved synthetic vision');
  assert.deepEqual((await request('/about-page', 'GET', undefined, '')).body[0].team_members, [...about.team_members].reverse());
  assert.equal((await request(`/about-page/${about.id}`, 'PUT', { version: about.version, title: 'Stale About overwrite' })).status, 409);
  assert.equal((await request('/about-page', 'POST', DEFAULT_ABOUT)).status, 409);
  assert.equal((await request(`/about-page/${about.id}`, 'DELETE', {})).status, 405);
  assert.equal((await request(`/about-page/${about.id}`, 'PUT', { team_members: [{ id: 'bad', name: 'Test', role: 'Test', image: 'javascript:alert(1)' }] })).status, 400);
  const removedTeam = await request(`/about-page/${about.id}`, 'PUT', { version: aboutEdit.body.version, team_members: [], approach_steps: [] });
  assert.equal(removedTeam.status, 200);
  const emptyAbout = (await request('/about-page', 'GET', undefined, '')).body[0];
  assert.deepEqual(emptyAbout.team_members, []); assert.deepEqual(emptyAbout.approach_steps, []);
  const superPassword = randomBytes(24).toString('base64url');
  const superUser = await request('/users', 'POST', { email: 'about-editor@example.test', name: 'Synthetic About editor', password: superPassword, role: 'super', verified: true });
  assert.equal(superUser.status, 201, JSON.stringify(superUser.body));
  const superLogin = await request('/auth/login', 'POST', { email: 'about-editor@example.test', password: superPassword }, '');
  assert.equal(superLogin.status, 200);
  const superCookie = superLogin.response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/dashboard-layout', 'GET', undefined, superCookie)).status, 403);
  assert.equal((await request('/custom-pages?admin=1', 'GET', undefined, superCookie)).status, 403);
  assert.equal((await request('/custom-pages', 'POST', { ...createCustomPage(), title: 'Denied super draft' }, superCookie)).status, 403);
  assert.equal((await request(`/custom-pages/${customDraft.body.id}`, 'PUT', { version: unpublishedCustom.body.version, published: true }, superCookie)).status, 403);
  for (const [endpoint, id] of [['/dashboard-layout', DASHBOARD_LAYOUT_ID], ['/website-icons', WEBSITE_ICONS_ID], ['/navigation-menu', NAVIGATION_MENU_ID]]) {
    assert.equal((await request(endpoint, 'POST', { title: 'Denied Super configuration' }, superCookie)).status, 403);
    assert.equal((await request(`${endpoint}/${id}`, 'PUT', { title: 'Denied Super configuration' }, superCookie)).status, 403);
  }
  assert.equal((await request(`/about-page/${about.id}`, 'PUT', { mission_text: 'Denied update' }, superCookie)).status, 403);
  const granted = await request('/access-control/super', 'PUT', { allowed_sections: ['About'] });
  assert.equal(granted.status, 200, JSON.stringify(granted.body));
  assert.deepEqual(granted.body.allowed_sections, ['About']);
  assert.equal((await request(`/about-page/${about.id}`, 'PUT', { version: emptyAbout.version, team_title: 'Approved team heading' }, superCookie)).status, 200);
  const aboutAudit = (await request('/audit-logs')).body.filter((row) => row.entity_name === 'AboutPage');
  assert(aboutAudit.some((row) => row.entity_id === ABOUT_PAGE_ID && row.actor_user_id === admin.id && row.created_at));
  assert(aboutAudit.some((row) => row.actor_user_id === superUser.body.id));
  assert(!JSON.stringify(aboutAudit).includes('Approved synthetic mission'));
  console.log('PASS: editable About mission/vision/team, ordered removals, singleton/conflict validation, section grants and attributed audit history');

  const service = await request('/services', 'POST', LIVE_SERVICES[0]);
  assert.equal(service.status, 201, JSON.stringify(service.body));
  assert.deepEqual(service.body.sub_services, LIVE_SERVICES[0].sub_services);
  const edited = await request(`/services/${service.body.id}`, 'PUT', { ...service.body, description: 'Updated by QA' });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.equal(edited.body.description, 'Updated by QA');
  assert.equal((await request(`/services/${service.body.id}`, 'PUT', { ...service.body, description: 'Stale update' })).status, 409);
  const concept = await request('/pic-your-concept', 'POST', LIVE_CONCEPTS[0]);
  assert.equal(concept.status, 201, JSON.stringify(concept.body));
  assert.deepEqual(concept.body.sub_services, LIVE_CONCEPTS[0].sub_services);
  const gallerySections = concept.body.sub_services.map((section, index) => index ? section : { ...section, id: 'master-bed', gallery_button_label: 'Design Ideas', gallery_title: 'Master bedroom inspiration', gallery_description: 'Choose your favourites', gallery_continue_label: 'Discuss these designs', gallery_images: [{ id: 'warm-wood', url: 'https://example.test/master-1.jpg', title: 'Warm wood', description: 'Natural finish' }, { id: 'soft-light', url: '/uploads/master-2.webp', title: '', description: '' }] });
  const gallerySaved = await request(`/pic-your-concept/${concept.body.id}`, 'PUT', { version: concept.body.version, sub_services: gallerySections });
  assert.equal(gallerySaved.status, 200, JSON.stringify(gallerySaved.body));
  assert.deepEqual(gallerySaved.body.sub_services, gallerySections);
  assert.equal(gallerySaved.body.description, concept.body.description);
  const galleryRead = (await request('/pic-your-concept', 'GET', undefined, '')).body.find((item) => item.id === concept.body.id);
  assert.deepEqual(galleryRead.sub_services, gallerySections);
  const selectedGallery = resolveGallerySelection([galleryRead], selectionParams(galleryRead, galleryRead.sub_services[0], ['warm-wood', 'soft-light'])).selection;
  const selectedGalleryMessage = gallerySelectionMessage(selectedGallery);
  assert(selectedGalleryMessage.includes('Warm wood')); assert(selectedGalleryMessage.includes('soft-light'));
  assert.equal((await request(`/pic-your-concept/${concept.body.id}`, 'PUT', { version: concept.body.version, sub_services: [] })).status, 409);
  assert.equal((await request(`/pic-your-concept/${concept.body.id}`, 'PUT', { version: gallerySaved.body.version, sub_services: [{ ...gallerySections[0], gallery_images: ['javascript:alert(1)'] }] })).status, 400);
  assert.equal((await request(`/pic-your-concept/${concept.body.id}`, 'PUT', { version: gallerySaved.body.version, sub_services: [] }, '')).status, 401);
  assert.equal((await request(`/pic-your-concept/${concept.body.id}`, 'PUT', { version: gallerySaved.body.version, sub_services: [{ ...gallerySections[0], gallery_continue_label: 'x'.repeat(61) }] })).status, 400);
  const galleryReordered = await request(`/pic-your-concept/${concept.body.id}`, 'PUT', { version: gallerySaved.body.version, sub_services: gallerySections.map((section, index) => index ? section : { ...section, gallery_images: [...section.gallery_images].reverse() }) });
  assert.equal(galleryReordered.status, 200, JSON.stringify(galleryReordered.body));
  assert.equal(galleryReordered.body.sub_services[0].gallery_images[1].id, 'warm-wood');
  assert.equal(galleryReordered.body.sub_services[0].gallery_images[1].title, 'Warm wood');
  const galleryRemoved = await request(`/pic-your-concept/${concept.body.id}`, 'PUT', { version: galleryReordered.body.version, sub_services: gallerySections.map((section, index) => index ? section : { ...section, gallery_images: [], gallery_button_label: 'Images' }) });
  assert.equal(galleryRemoved.status, 200, JSON.stringify(galleryRemoved.body));
  assert.deepEqual(galleryRemoved.body.sub_services[0].gallery_images, []);
  assert.deepEqual(galleryRemoved.body.sub_services.slice(1), concept.body.sub_services.slice(1));
  const galleryAudit = (await request('/audit-logs')).body.filter((row) => row.entity_name === 'PicYourConcept' && row.entity_id === concept.body.id);
  assert(galleryAudit.some((row) => row.actor_user_id === admin.id && row.created_at));
  assert(!JSON.stringify(galleryAudit).includes('https://example.test/master-1.jpg'));
  console.log('PASS: concept galleries persist images/labels, preserve siblings, reject unsafe/stale/anonymous writes, remove optionally and record dated actor history');
  const socialLinks = { instagram: 'https://instagram.com/example', whatsapp: 'https://wa.me/8801000000000' };
  const initialFloating = { enabled: true, side: 'left', platforms: ['instagram'] };
  const contact = await request('/contact-info', 'POST', { organization_name: 'D16 Local QA', email: 'studio@example.test', phone: '+8801000000000', theme_color: '#112037', locations: ['Test studio'], social_links: socialLinks, floating_social: initialFloating, actor_user_id: 'forged' });
  assert.equal(contact.status, 201, JSON.stringify(contact.body));
  assert.equal(contact.body.version, 1);
  assert.deepEqual(contact.body.floating_social, initialFloating);
  assert.equal((await request('/contact-info')).body.find((row) => row.id === contact.body.id).email, 'studio@example.test');
  const [profiles] = await database.query('SELECT * FROM organization_profile WHERE id=?', [contact.body.id]);
  assert(!profiles[0].contact_email_ciphertext.toString().includes('studio@example.test'));
  const readContact = async () => (await request('/contact-info', 'GET', undefined, '')).body.find((row) => row.id === contact.body.id);
  assert.deepEqual((await readContact()).social_links, socialLinks);
  assert.deepEqual((await readContact()).floating_social, initialFloating);
  console.log('PASS: richer services/concepts, edit conflict detection, encrypted contact/social round trips');

  const contactEndpoint = `/contact-info/${contact.body.id}`;
  assert.equal((await request(contactEndpoint, 'PUT', { version: contact.body.version, floating_social: initialFloating }, '')).status, 401);
  const viewerPassword = randomBytes(24).toString('base64url');
  const mediaViewer = await request('/users', 'POST', { email: 'media-viewer@example.test', name: 'Synthetic media viewer', password: viewerPassword, role: 'viewer', verified: true });
  assert.equal(mediaViewer.status, 201, JSON.stringify(mediaViewer.body));
  const viewerLogin = await request('/auth/login', 'POST', { email: 'media-viewer@example.test', password: viewerPassword }, '');
  assert.equal(viewerLogin.status, 200);
  const viewerCookie = viewerLogin.response.headers.get('set-cookie').split(';')[0];
  assert.equal((await request(contactEndpoint, 'PUT', { version: contact.body.version, floating_social: initialFloating }, viewerCookie)).status, 403);
  for (const payload of [{ floating_social: initialFloating }, { social_links: socialLinks }, { version: '1', floating_social: initialFloating }, { version: 0, social_links: socialLinks }]) {
    assert.equal((await request(contactEndpoint, 'PUT', payload)).status, 400);
  }
  const multipleFloating = { enabled: true, side: 'right', platforms: ['whatsapp', 'instagram'] };
  const floatingUpdate = await request(contactEndpoint, 'PUT', { version: contact.body.version, floating_social: multipleFloating });
  assert.equal(floatingUpdate.status, 200, JSON.stringify(floatingUpdate.body));
  assert.equal(floatingUpdate.body.version, contact.body.version + 1);
  assert.deepEqual((await readContact()).floating_social, multipleFloating);
  assert.deepEqual(floatingUpdate.body.social_links, socialLinks);
  assert.equal((await request(contactEndpoint, 'PUT', { version: contact.body.version, floating_social: initialFloating })).status, 409);
  const invalidSocialPayloads = [
    { floating_social: { ...multipleFloating, platforms: ['facebook'] } },
    { floating_social: { ...multipleFloating, platforms: ['instagram', 'instagram'] } },
    { floating_social: { ...multipleFloating, enabled: 'true' } },
    { floating_social: { ...multipleFloating, side: 'center' } },
    { floating_social: { ...multipleFloating, unexpected: true } },
    { floating_social: null },
    { social_links: { ...socialLinks, instagram: 'javascript:alert(1)' } },
    { social_links: { ...socialLinks, instagram: 'https://user:password@example.test/' } },
    { social_links: { ...socialLinks, instagram: '' } },
    { social_links: { instagram: socialLinks.instagram } },
  ];
  const contactAuditsBeforeInvalid = (await request('/audit-logs')).body.filter((row) => row.entity_id === contact.body.id);
  for (const invalid of invalidSocialPayloads) {
    assert.equal((await request(contactEndpoint, 'PUT', { version: floatingUpdate.body.version, ...invalid })).status, 400, JSON.stringify(invalid));
  }
  assert.deepEqual(await readContact(), floatingUpdate.body);
  assert.deepEqual((await request('/audit-logs')).body.filter((row) => row.entity_id === contact.body.id), contactAuditsBeforeInvalid);
  const unrelatedContactUpdate = await request(contactEndpoint, 'PUT', { version: floatingUpdate.body.version, address: 'Synthetic updated studio' });
  assert.equal(unrelatedContactUpdate.status, 200, JSON.stringify(unrelatedContactUpdate.body));
  assert.deepEqual(unrelatedContactUpdate.body.social_links, socialLinks);
  assert.deepEqual(unrelatedContactUpdate.body.floating_social, multipleFloating);
  const concurrentSocial = await Promise.all([
    request(contactEndpoint, 'PUT', { version: unrelatedContactUpdate.body.version, floating_social: { ...multipleFloating, side: 'left' } }),
    request(contactEndpoint, 'PUT', { version: unrelatedContactUpdate.body.version, floating_social: { ...multipleFloating, enabled: false } }),
  ]);
  assert.deepEqual(concurrentSocial.map((entry) => entry.status).sort(), [200, 409]);
  const beforeSocialAuditFailure = await readContact();
  const failingSocialAudit = content.createContentRepository({ database: pool, audit: async () => { throw new Error('synthetic social audit failure'); } });
  await assert.rejects(failingSocialAudit.updateContent('ContactInfo', contact.body.id, { version: beforeSocialAuditFailure.version, address: 'Must roll back studio', floating_social: { enabled: false, side: 'right', platforms: [] } }, { userId: admin.id }), /social audit failure/);
  assert.deepEqual(await readContact(), beforeSocialAuditFailure);
  const disabledFloating = { enabled: false, side: 'right', platforms: [] };
  const removedSocial = await request(contactEndpoint, 'PUT', { version: beforeSocialAuditFailure.version, social_links: {}, floating_social: disabledFloating });
  assert.equal(removedSocial.status, 200, JSON.stringify(removedSocial.body));
  assert.deepEqual((await readContact()).social_links, {});
  assert.deepEqual((await readContact()).floating_social, disabledFloating);
  const [[savedSocialMetadata]] = await database.query("SELECT payload, version FROM app_content WHERE entity_type='ContactInfo' AND id=?", [contact.body.id]);
  const savedSocial = typeof savedSocialMetadata.payload === 'string' ? JSON.parse(savedSocialMetadata.payload) : savedSocialMetadata.payload;
  assert.deepEqual(savedSocial.social_links, {});
  assert.deepEqual(savedSocial.floating_social, disabledFloating);
  assert.equal(savedSocialMetadata.version, removedSocial.body.version);
  const contactAudits = (await request('/audit-logs')).body.filter((row) => row.entity_name === 'ContactInfo' && row.entity_id === contact.body.id);
  assert.equal(contactAudits.length, 5);
  assert(contactAudits.every((row) => row.actor_user_id === admin.id && row.created_at));
  assert(contactAudits.some((row) => row.action === 'create'));
  assert(contactAudits.some((row) => JSON.stringify(row.new_data.changed_fields) === JSON.stringify(['floating_social'])));
  assert(contactAudits.some((row) => JSON.stringify(row.new_data.changed_fields) === JSON.stringify(['address'])));
  assert(contactAudits.some((row) => JSON.stringify(row.new_data.changed_fields) === JSON.stringify(['floating_social', 'social_links'])));
  assert(!JSON.stringify(contactAudits).includes(socialLinks.whatsapp));
  assert(!JSON.stringify(contactAudits).includes('studio@example.test'));
  console.log('PASS: floating media create/read/update/removal, chosen order/side, saved-version and concurrent conflicts, safe links/references, partial-update preservation, permissions and attributed atomic audit history');

  const visitor = { full_name: 'Synthetic Test Visitor', email: 'visitor@example.test', phone: '+8801999999999', project_type: 'residential', location: 'Private testing address', budget: 'Synthetic budget', message: 'Confidential QA message\n\n' + selectedGalleryMessage, preferred_date: '2026-12-01', status: 'completed', actor_user_id: admin.id };
  const submitted = await request('/consultations', 'POST', visitor, '');
  assert.equal(submitted.status, 201, JSON.stringify(submitted.body));
  assert.equal(submitted.body.status, 'pending');
  assert(!JSON.stringify(submitted.body).includes(visitor.email));
  const enquiries = await request('/consultations');
  assert.equal(enquiries.body[0].message, visitor.message);
  assert.equal(enquiries.body[0].preferred_date, visitor.preferred_date);
  assert.equal(enquiries.body[0].project_type, visitor.project_type);
  const [enquiryRows] = await database.query('SELECT * FROM consultation_requests');
  assert(!enquiryRows[0].email_ciphertext.toString().includes(visitor.email));
  assert.equal(enquiryRows[0].message, null);
  assert.equal(enquiryRows[0].location, null);
  assert.equal(enquiryRows[0].project_type, null);
  const [privateRows] = await database.query('SELECT * FROM app_private_details');
  assert(!privateRows[0].payload_ciphertext.toString().includes(visitor.message));
  assert.equal((await request(`/consultations/${submitted.body.id}`, 'PUT', { status: 'contacted' })).status, 200);
  const audit = (await request('/audit-logs')).body;
  assert(audit.some((row) => row.entity_id === service.body.id && row.actor_user_id === admin.id && row.created_at));
  assert(audit.some((row) => row.entity_id === submitted.body.id && row.actor_user_id === null && row.action === 'create'));
  assert(!JSON.stringify(audit).includes(visitor.message));
  console.log('PASS: confidential consultation encryption/decryption, unforgeable actor and dated audit history');

  const failingRepository = content.createContentRepository({ database: pool, audit: async () => { throw new Error('test audit failure'); } });
  await assert.rejects(failingRepository.createContent('Service', { title: 'Must roll back' }, { userId: admin.id }));
  assert(!(await content.listContent('Service')).some((row) => row.title === 'Must roll back'));
  const draft = await request('/blog-posts', 'POST', { title: 'Private draft' });
  assert.equal(draft.status, 201);
  assert(!(await request('/blog-posts', 'GET', undefined, '')).body.some((row) => row.id === draft.body.id));
  assert((await request('/blog-posts?admin=1')).body.some((row) => row.id === draft.body.id));
  assert.equal((await request('/auth/logout', 'POST', {})).status, 204);
  assert.equal((await request('/auth/me')).status, 401);
  console.log('PASS: audit failure rolls back writes, drafts stay private, logout revokes session');
  console.log('ALL LOCAL DATABASE INTEGRATION CHECKS PASSED. Hosting QA/production were not contacted.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (applicationPool) await applicationPool.end();
  if (database) await database.end();
  if (created) docker(['stop', container]);
}
