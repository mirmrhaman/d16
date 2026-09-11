import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createApp } from '../server/src/app.js';

process.env.APP_ENCRYPTION_KEY_BASE64 = randomBytes(32).toString('base64');
process.env.APP_HMAC_KEY_BASE64 = randomBytes(32).toString('base64');

async function fixture(t, options = {}) {
  const calls = [];
  const user = { id: 'verified-user-id', role: 'admin', permissions: ['content.read', 'content.write', 'users.manage', 'branding.write'] };
  const auth = {
    getSession: async (token) => token === 'valid-cookie' ? (options.user || user) : null,
    login: async () => ({ user, token: 'valid-cookie', expiresAt: new Date(Date.now() + 3600000) }),
    logout: async () => {}, listUsers: async () => [], listAuditLogs: async () => [], listAccessControl: async () => [],
  };
  const content = {
    listContent: async () => options.rows || [],
    createContent: async (entity, payload, actor) => { calls.push({ entity, payload, actor }); if (options.dbFailure) throw Object.assign(new Error('unavailable'), { code: 'ECONNREFUSED' }); return { id: 'created', ...payload }; },
    updateContent: async (_entity, _id, payload, actor) => { calls.push({ actor, payload }); return payload; },
    deleteContent: async () => true,
  };
  const app = createApp({ pool: { execute: async () => { if (options.dbFailure) throw new Error('offline'); return [[{ one: 1 }]]; } }, auth, content, allowedOrigins: ['http://qa.test', 'https://qa.test'], secureCookies: options.secure || false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, init = {}) => fetch(`${base}${url}`, init);
  const write = (url, body = {}, cookie = 'valid-cookie', headers = {}) => request(url, { method: 'POST', headers: { origin: options.secure ? 'https://qa.test' : 'http://qa.test', 'content-type': 'application/json', ...(cookie ? { cookie: `d16_session=${cookie}` } : {}), ...headers }, body: JSON.stringify(body) });
  return { request, write, calls };
}

test('every persistent content mutation requires a real server session', async (t) => {
  const { write, calls } = await fixture(t);
  for (const endpoint of ['services', 'projects', 'stats', 'hero-slides', 'blog-posts', 'contact-info', 'gallery-videos', 'gallery-concepts', 'pic-your-concept', 'about-page', 'dashboard-layout', 'website-icons']) {
    assert.equal((await write(`/api/${endpoint}`, {}, null)).status, 401);
    assert.equal((await write(`/api/${endpoint}`, { role: 'admin', actor_user_id: 'forged' }, 'forged')).status, 401);
  }
  assert.equal(calls.length, 0);
});

test('layout is admin-readable only while icons remain public, and appearance writes require admin plus branding permission', async (t) => {
  const rows = [{ title: 'Public icons', icons: {} }];
  const admin = await fixture(t, { rows });
  assert.deepEqual(await (await admin.request('/api/website-icons')).json(), rows);
  assert.equal((await admin.request('/api/dashboard-layout')).status, 401);
  assert.equal((await admin.request('/api/dashboard-layout?admin=1')).status, 401);
  assert.equal((await admin.request('/api/dashboard-layout', { headers: { cookie: 'd16_session=valid-cookie' } })).status, 200);
  for (const endpoint of ['dashboard-layout', 'website-icons']) assert.equal((await admin.write(`/api/${endpoint}`, { title: 'Allowed' })).status, 201);
  for (const user of [
    { id: 'super', role: 'super', permissions: ['content.read', 'branding.write'] },
    { id: 'viewer', role: 'viewer', permissions: ['content.read', 'branding.write'] },
    { id: 'unpermitted-admin', role: 'admin', permissions: ['content.read'] },
  ]) {
    const denied = await fixture(t, { user, rows });
    if (user.role !== 'admin') assert.equal((await denied.request('/api/dashboard-layout', { headers: { cookie: 'd16_session=valid-cookie' } })).status, 403);
    for (const endpoint of ['dashboard-layout', 'website-icons']) {
      assert.equal((await denied.write(`/api/${endpoint}`, { role: 'admin', title: 'Forged' })).status, 403);
      for (const method of ['PUT', 'DELETE']) assert.equal((await denied.request(`/api/${endpoint}/record`, { method, headers: { origin: 'http://qa.test', 'content-type': 'application/json', cookie: 'd16_session=valid-cookie' }, body: '{}' })).status, 403);
    }
    assert.equal(denied.calls.length, 0);
  }
});

test('role and section permissions are enforced on the server', async (t) => {
  const { write, calls } = await fixture(t, { user: { id: 'super-user', role: 'super', permissions: ['content.write', 'section.services.write'] } });
  assert.equal((await write('/api/services', { title: 'allowed' })).status, 201);
  assert.equal((await write('/api/projects', { title: 'denied' })).status, 403);
  assert.equal((await write('/api/about-page', { title: 'denied' })).status, 403);
  assert.equal((await write('/api/contact-info', {})).status, 403);
  assert.equal(calls.length, 1);
});

test('About page is public to read and requires its own section permission for Super edits', async (t) => {
  const rows = [{ id: 'about', title: 'About Us', team_members: [] }];
  const { request, write, calls } = await fixture(t, { rows, user: { id: 'about-editor', role: 'super', permissions: ['content.read', 'content.write', 'section.about.write'] } });
  assert.deepEqual(await (await request('/api/about-page')).json(), rows);
  assert.equal((await request('/api/about-page?admin=1')).status, 401);
  assert.equal((await request('/api/about-page?admin=1', { headers: { cookie: 'd16_session=valid-cookie' } })).status, 200);
  assert.equal((await write('/api/about-page', { title: 'About', mission_text: 'Public mission', actor_user_id: 'forged' })).status, 201);
  assert.equal(calls[0].entity, 'AboutPage'); assert.equal(calls[0].actor.userId, 'about-editor');
  for (const method of ['PUT', 'DELETE']) {
    const response = await request('/api/about-page/record', { method, headers: { origin: 'http://qa.test', 'content-type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 401);
  }
});

test('server actor identity cannot be overridden by request payload', async (t) => {
  const { write, calls } = await fixture(t);
  assert.equal((await write('/api/services', { title: 'service', actor_user_id: 'forged' })).status, 201);
  assert.equal(calls[0].actor.userId, 'verified-user-id');
});

test('untrusted origins and non-JSON mutations are blocked', async (t) => {
  const { write, request, calls } = await fixture(t);
  assert.equal((await write('/api/services', {}, 'valid-cookie', { origin: 'https://untrusted.invalid' })).status, 403);
  assert.equal((await write('/api/services', {}, 'valid-cookie', { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await request('/api/services', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 403);
  assert.equal(calls.length, 0);
});

test('secure login uses HttpOnly SameSite cookies without token in JSON', async (t) => {
  const { write } = await fixture(t, { secure: true });
  const response = await write('/api/auth/login', { email: 'synthetic@example.invalid', password: 'fixture' }, null);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=Strict/);
  assert.match(response.headers.get('set-cookie'), /Secure/);
  assert.match(response.headers.get('set-cookie'), /Path=\/api/);
  assert.equal('token' in await response.json(), false);
});

test('public consultation strips staff fields and returns no confidential values', async (t) => {
  const { write, request, calls } = await fixture(t);
  const response = await write('/api/consultations', { full_name: 'Synthetic', email: 'qa@example.invalid', status: 'completed', assigned_to_user_id: 'forged', created_by_user_id: 'forged' }, null);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { id: 'created', status: 'pending', submitted: true });
  assert.equal(calls[0].payload.status, 'pending');
  assert.equal('assigned_to_user_id' in calls[0].payload, false);
  assert.equal(calls[0].actor.userId, null);
  assert.equal((await request('/api/consultations')).status, 401);
});

test('public blog hides drafts and future posts; admin read authenticates', async (t) => {
  const rows = [{ id: 'draft', published_date: null }, { id: 'future', published_date: '2999-01-01' },
    { id: 'unpublished', published: false, published_date: '2020-01-01' }, { id: 'published', published_date: '2020-01-01' }];
  const { request } = await fixture(t, { rows });
  assert.deepEqual(await (await request('/api/blog-posts')).json(), [rows[3]]);
  assert.equal((await request('/api/blog-posts?admin=1')).status, 401);
  assert.equal((await (await request('/api/blog-posts?admin=1', { headers: { cookie: 'd16_session=valid-cookie' } })).json()).length, 4);
});

test('database errors return 503 for writes and unhealthy status', async (t) => {
  const { write, request } = await fixture(t, { dbFailure: true });
  assert.equal((await write('/api/services', {})).status, 503);
  const health = await request('/api/health');
  assert.equal(health.status, 503);
  assert.equal((await health.json()).ok, false);
});
