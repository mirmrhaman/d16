import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NAVIGATION_PAGES, DEFAULT_NAVIGATION_MENU, normalizeNavigationItems, validateNavigationItems, visibleNavigationItems } from '../src/data/navigation.js';

test('default navigation preserves all current public pages and basename-safe routes', () => {
  const result = visibleNavigationItems(undefined);
  assert.equal(result.length, 8);
  assert.deepEqual(result.map((item) => item.page), ['Home', 'About', 'Services', 'Portfolio', 'PicYourConcept', 'Gallery', 'Blog', 'Contact']);
  assert.deepEqual(result.map((item) => item.path), ['/', '/About', '/Services', '/Portfolio', '/PicYourConcept', '/Gallery', '/Blog', '/Contact']);
  assert.deepEqual(validateNavigationItems(DEFAULT_NAVIGATION_MENU.items), DEFAULT_NAVIGATION_MENU.items);
});

test('adding, renaming, hiding and removing links preserves chosen order and intentional empty menus', () => {
  const before = structuredClone(DEFAULT_NAVIGATION_MENU.items);
  const items = [
    { ...before[6], label: '  Journal  ' },
    { ...before[1], label: 'Our Studio', visible: false },
    before[0],
  ];
  const shown = visibleNavigationItems(items);
  assert.deepEqual(shown.map(({ label, path }) => ({ label, path })), [{ label: 'Journal', path: '/Blog' }, { label: 'Home', path: '/' }]);
  assert.deepEqual(normalizeNavigationItems([]), []);
  assert.deepEqual(visibleNavigationItems([]), []);
  assert.deepEqual(visibleNavigationItems(before.map((item) => ({ ...item, visible: false }))), []);
  assert.deepEqual(DEFAULT_NAVIGATION_MENU.items, before);
  const restored = validateNavigationItems([...items, before[3]]);
  assert.equal(restored.at(-1).page, 'Portfolio');
});

test('navigation only allows known public pages and strictly validates nested fields', () => {
  const original = DEFAULT_NAVIGATION_MENU.items[0];
  for (const page of ['AdminDashboard', 'login', '//evil.example', 'javascript:alert(1)', '/About', 'https://evil.example']) assert.throws(() => validateNavigationItems([{ ...original, page }]));
  for (const label of ['', ' ', 'x'.repeat(61), 'a\nb', 'x\u0000']) assert.throws(() => validateNavigationItems([{ ...original, label }]));
  for (const visible of ['true', 1, null, undefined]) assert.throws(() => validateNavigationItems([{ ...original, visible }]));
  for (const id of ['', '<script>', 'x'.repeat(65), null]) assert.throws(() => validateNavigationItems([{ ...original, id }]));
  assert.throws(() => validateNavigationItems([{ ...original, url: 'https://example.org' }]));
  assert.throws(() => validateNavigationItems([original, { ...original, id: 'another-id' }]));
  assert.throws(() => validateNavigationItems([original, { ...original, page: 'About' }]));
  assert.throws(() => validateNavigationItems([...DEFAULT_NAVIGATION_MENU.items, original]));
  for (const input of [null, {}, [null], 'bad', [{ ...original, page: 'AdminUsers' }]]) assert.deepEqual(normalizeNavigationItems(input), DEFAULT_NAVIGATION_MENU.items);
});

test('every configured destination has a real public route; all menu surfaces use shared data', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  for (const { path } of NAVIGATION_PAGES) assert.ok(app.includes(`path="${path}"`), `Missing route ${path}`);
  const layout = await readFile(new URL('../src/Layout.jsx', import.meta.url), 'utf8');
  assert.equal((layout.match(/navigationItems\.map/g) || []).length, 3);
  assert.match(layout, /base44\.entities\.NavigationMenu\.list/);
  assert.match(layout, /visibleNavigationItems\(navigationRecord\?\.items\)/);
  assert.match(layout, /to="\/login"/);
  assert.match(layout, /to=\{adminLanding\(user, IS_DEMO\)\}/);
});

test('demo menu saves persist independently and an empty menu never reappears on reload', async () => {
  const storage = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    const { base44 } = await import('../src/api/base44Client.js?navigation-first');
    const menu = (await base44.entities.NavigationMenu.list())[0];
    const items = [{ ...menu.items.find((item) => item.page === 'About'), label: 'Our Studio' }];
    const saved = await base44.entities.NavigationMenu.update(menu.id, { title: 'Website navigation', items, version: menu.version });
    const { base44: restored } = await import('../src/api/base44Client.js?navigation-reload');
    assert.deepEqual((await restored.entities.NavigationMenu.list())[0].items, items);
    await assert.rejects(restored.entities.NavigationMenu.update(menu.id, { items: [{ ...items[0], page: 'AdminUsers' }], version: saved.version }));
    await assert.rejects(restored.entities.NavigationMenu.update(menu.id, { items: DEFAULT_NAVIGATION_MENU.items, version: menu.version }), (error) => error.status === 409);
    assert.deepEqual((await restored.entities.NavigationMenu.list())[0].items, items);
    await restored.entities.NavigationMenu.update(menu.id, { items: [], version: saved.version });
    const { base44: empty } = await import('../src/api/base44Client.js?navigation-empty');
    assert.deepEqual((await empty.entities.NavigationMenu.list())[0].items, []);
    assert.equal((await empty.entities.AboutPage.list())[0].title, 'About Us');
    assert.deepEqual([...storage.keys()], ['d16_navigation_menu_demo_v2']);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
