import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/src/app.js';

test('QA hosting serves the SPA, static assets and API 404s without mixing paths', async (t) => {
  const webRoot = await mkdtemp(path.join(os.tmpdir(), 'd16-qa-web-'));
  await mkdir(path.join(webRoot, 'assets'));
  await writeFile(path.join(webRoot, 'index.html'), '<!doctype html><title>D16 QA shell</title>');
  await writeFile(path.join(webRoot, 'assets', 'app.js'), 'window.qaReady = true;');
  const app = createApp({
    pool: { execute: async () => [[{ one: 1 }]] },
    content: { listContent: async () => [] },
    auth: { getSession: async () => null },
    webRoot,
    allowedOrigins: ['https://qa.example.invalid'],
    secureCookies: true,
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });
    await rm(webRoot, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /D16 QA shell/);
  assert.match(home.headers.get('cache-control'), /max-age=0/);

  const nestedPage = await fetch(`${base}/AdminDashboard`);
  assert.equal(nestedPage.status, 200);
  assert.match(await nestedPage.text(), /D16 QA shell/);

  const asset = await fetch(`${base}/assets/app.js`);
  assert.equal(await asset.text(), 'window.qaReady = true;');

  const apiMissing = await fetch(`${base}/api/not-a-route`, { headers: { accept: 'text/html' } });
  assert.equal(apiMissing.status, 404);
  assert.deepEqual(await apiMissing.json(), { error: 'API endpoint not found.' });

  const uploadMissing = await fetch(`${base}/uploads/missing.png`);
  assert.equal(uploadMissing.status, 404);
  assert.doesNotMatch(await uploadMissing.text(), /D16 QA shell/);
});
