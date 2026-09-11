import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiEntity, requestJson } from '../src/api/transport.js';

test('expired API sessions notify the UI but initial anonymous session checks do not', async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const events = [];
  globalThis.window = { dispatchEvent(event) { events.push(event.type); } };
  globalThis.fetch = async () => Response.json({ error: 'Please sign in.' }, { status: 401 });
  try {
    await assert.rejects(requestJson('/auth/me'));
    assert.deepEqual(events, []);
    await assert.rejects(requestJson('/consultations'));
    assert.deepEqual(events, ['d16-session-expired']);
  } finally { globalThis.fetch = originalFetch; if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow; }
});

test('API client rejects HTML hosting fallbacks instead of fake empty success', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } });
  try { await assert.rejects(requestJson('/services'), /web page instead/); }
  finally { globalThis.fetch = original; }
});
test('failed database mutations remain errors and include cookie credentials', async () => {
  const original = globalThis.fetch;
  let options;
  globalThis.fetch = async (_url, args) => { options = args; return Response.json({ error: 'Please sign in.' }, { status: 401 }); };
  try {
    await assert.rejects(createApiEntity('services').create({ title: 'Not saved' }), (error) => error.status === 401);
    assert.equal(options.credentials, 'include');
    assert.equal(options.method, 'POST');
  } finally { globalThis.fetch = original; }
});
test('network failure never returns a successful local save', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Offline'); };
  try { await assert.rejects(createApiEntity('services').update('id', { title: 'Not saved' }), /could not confirm/); }
  finally { globalThis.fetch = original; }
});
test('invalid JSON and invalid list shape are rejected', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('{bad', { headers: { 'content-type': 'application/json' } });
    await assert.rejects(requestJson('/services'), /invalid data/);
    globalThis.fetch = async () => Response.json({ unexpected: true });
    await assert.rejects(createApiEntity('services').list(), /invalid list/);
  } finally { globalThis.fetch = original; }
});
