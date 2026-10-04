import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NAVIGATION_PAGES, MAX_NAVIGATION_ITEMS, DEFAULT_NAVIGATION_MENU, normalizeNavigationItems, validateNavigationItems, visibleNavigationItems, validateNavigationSettings, normalizeNavigationSettings, groupNavigationItems } from '../src/data/navigation.js';

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
  for (const in_dropdown of ['true', 1, null, undefined, {}]) assert.throws(() => validateNavigationItems([{ ...original, in_dropdown }]));
  for (const id of ['', '<script>', 'x'.repeat(65), null]) assert.throws(() => validateNavigationItems([{ ...original, id }]));
  assert.throws(() => validateNavigationItems([{ ...original, url: 'https://example.org' }]));
  assert.throws(() => validateNavigationItems([original, { ...original, id: 'another-id' }]));
  assert.throws(() => validateNavigationItems([original, { ...original, page: 'About' }]));
  assert.throws(() => validateNavigationItems([...DEFAULT_NAVIGATION_MENU.items, original]));
  for (const input of [null, {}, [null], 'bad', [{ ...original, page: 'AdminUsers' }]]) assert.deepEqual(normalizeNavigationItems(input), DEFAULT_NAVIGATION_MENU.items);
});

test('dropdown settings default safely, validate strictly and trim only valid titles', () => {
  const defaults = { dropdown_enabled: false, dropdown_label: 'More' };
  assert.deepEqual(validateNavigationSettings({}), defaults);
  assert.deepEqual(normalizeNavigationSettings(undefined), defaults);
  assert.deepEqual(normalizeNavigationSettings(null), defaults);
  assert.deepEqual(validateNavigationSettings({ dropdown_enabled: true, dropdown_label: '  Explore  ' }), { dropdown_enabled: true, dropdown_label: 'Explore' });
  for (const dropdown_enabled of [null, undefined, 0, 1, 'true', {}]) {
    assert.throws(() => validateNavigationSettings({ dropdown_enabled }));
    assert.deepEqual(normalizeNavigationSettings({ dropdown_enabled }), defaults);
  }
  for (const dropdown_label of [null, undefined, '', ' ', 1, 'x'.repeat(61), 'a\nb', 'a\u007f', {}]) assert.throws(() => validateNavigationSettings({ dropdown_label }));
  const { in_dropdown: omitted, ...legacy } = DEFAULT_NAVIGATION_MENU.items[0];
  assert.equal(omitted, false);
  assert.equal(validateNavigationItems([legacy])[0].in_dropdown, false);
});

test('client placement controls grouping without automatic overflow, preserving each group order', () => {
  const items = DEFAULT_NAVIGATION_MENU.items.map((item, index) => ({ ...item, in_dropdown: index === 1 || index === 6, visible: index !== 6 }));
  const visible = visibleNavigationItems(items);
  const enabled = groupNavigationItems(visible, { dropdown_enabled: true, dropdown_label: 'Explore' });
  assert.deepEqual(enabled.directItems.map((item) => item.page), ['Home', 'Services', 'Portfolio', 'PicYourConcept', 'Gallery', 'Contact']);
  assert.deepEqual(enabled.dropdownItems.map((item) => item.page), ['About']);
  assert.deepEqual(groupNavigationItems(visible, { dropdown_enabled: false }), { directItems: visible, dropdownItems: [] });
  assert.deepEqual(groupNavigationItems(visible), { directItems: visible, dropdownItems: [] });
  assert.deepEqual(groupNavigationItems([], { dropdown_enabled: true }), { directItems: [], dropdownItems: [] });
  assert.deepEqual(groupNavigationItems(visible.map((item) => ({ ...item, in_dropdown: true })), { dropdown_enabled: true }).directItems, []);
  assert.deepEqual(groupNavigationItems(visible.map((item) => ({ ...item, in_dropdown: false })), { dropdown_enabled: true }).dropdownItems, []);
});

test('menus accept more than ten or forty tabs without placing any into a dropdown', () => {
  const items = Array.from({ length: MAX_NAVIGATION_ITEMS }, (_, index) => ({ id: `nav-page-${index}`, page: `custom:10000000-0000-4000-8000-${String(index).padStart(12, '0')}`, label: `Page ${index + 1}`, visible: true }));
  const normalized = validateNavigationItems(items);
  assert.equal(normalized.length, 250);
  assert.equal(groupNavigationItems(normalized).directItems.length, 250);
  assert.equal(groupNavigationItems(normalized, { dropdown_enabled: true }).dropdownItems.length, 0);
  assert.throws(() => validateNavigationItems([...items, { ...items[0], id: 'one-too-many' }]), /250/);
});

test('every configured destination has a real public route; all menu surfaces use shared data', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  for (const { path } of NAVIGATION_PAGES) assert.ok(app.includes(`path="${path}"`), `Missing route ${path}`);
  const layout = await readFile(new URL('../src/Layout.jsx', import.meta.url), 'utf8');
  assert.match(layout, /groupNavigationItems\(/);
  assert.equal((layout.match(/directItems\.map/g) || []).length, 2);
  assert.equal((layout.match(/dropdownItems\.map/g) || []).length, 2);
  assert.equal((layout.match(/navigationItems\.map/g) || []).length, 1);
  assert.doesNotMatch(layout, /navigationItems\.slice\(0,\s*5\)/);
  assert.match(layout, /base44\.entities\.NavigationMenu\.list/);
  assert.match(layout, /visibleNavigationItems\(navigationRecord\?\.items, customPages\)/);
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
    assert.equal(saved.dropdown_enabled, false);
    assert.equal(saved.dropdown_label, 'More');
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

test('demo menu settings and placements round trip, retain partial updates and reject stale settings edits', async () => {
  const storage = new Map(); const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    const { base44 } = await import('../src/api/base44Client.js?navigation-settings-first');
    const initial = (await base44.entities.NavigationMenu.list())[0];
    const items = initial.items.map((item, index) => ({ ...item, in_dropdown: index === 2 || index === 5 }));
    const chosen = await base44.entities.NavigationMenu.update(initial.id, { version: initial.version, items, dropdown_enabled: true, dropdown_label: 'Explore' });
    const { base44: reloaded } = await import('../src/api/base44Client.js?navigation-settings-reload');
    assert.deepEqual((await reloaded.entities.NavigationMenu.list())[0], chosen);
    const renamed = await reloaded.entities.NavigationMenu.update(initial.id, { version: chosen.version, dropdown_label: 'Discover' });
    assert.equal(renamed.dropdown_enabled, true); assert.deepEqual(renamed.items, items);
    await assert.rejects(reloaded.entities.NavigationMenu.update(initial.id, { version: chosen.version, dropdown_enabled: false }), (error) => error.status === 409);
    for (const payload of [{ dropdown_enabled: 'false' }, { dropdown_label: '' }, { items: [{ ...items[0], in_dropdown: 'true' }] }]) await assert.rejects(reloaded.entities.NavigationMenu.update(initial.id, { version: renamed.version, ...payload }));
    const disabled = await reloaded.entities.NavigationMenu.update(initial.id, { version: renamed.version, dropdown_enabled: false });
    assert.equal(disabled.dropdown_label, 'Discover'); assert.deepEqual(disabled.items, items);
    assert.equal(groupNavigationItems(disabled.items, disabled).directItems.length, items.length);
  } finally {
    if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original;
  }
});

test('damaged saved demo menu is rejected instead of silently replaced with defaults', async () => {
  const original = globalThis.localStorage;
  const corrupted = [{ ...DEFAULT_NAVIGATION_MENU, id: 'a7bf2755-1d82-4c2e-9ad3-729f04c565d1', version: 4, dropdown_enabled: 'false' }];
  const storage = new Map([['d16_navigation_menu_demo_v2', JSON.stringify(corrupted)]]);
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    const { base44 } = await import('../src/api/base44Client.js?navigation-damaged');
    await assert.rejects(base44.entities.NavigationMenu.list(), /Dropdown visibility/);
    await assert.rejects(base44.entities.NavigationMenu.update(corrupted[0].id, { version: 4, items: [] }), /Dropdown visibility/);
    assert.deepEqual(JSON.parse(storage.get('d16_navigation_menu_demo_v2')), corrupted);
  } finally {
    if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original;
  }
});
