import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PAGE_TYPES, createCustomPage, validateCustomPage, getCustomPagePath } from '../server/src/customPageSchema.js';
import { DEFAULT_NAVIGATION_MENU, MAX_NAVIGATION_ITEMS, navigationPageChoices, validateNavigationItems, visibleNavigationItems } from '../src/data/navigation.js';

const id = '73000000-0000-4000-8000-000000000001';
const page = { ...createCustomPage('faq'), id, title: 'Design questions', published: true };
const tab = { id: 'new-tab', page: `custom:${id}`, label: 'Questions', visible: true };

test('custom-page types cover the current site layouts plus FAQ and Team', () => {
  assert.deepEqual(new Set(PAGE_TYPES.map(({ value }) => value)), new Set(['landing', 'standard', 'services', 'portfolio', 'concepts', 'gallery', 'blog', 'contact', 'faq', 'team']));
  for (const { value } of PAGE_TYPES) {
    const payload = { ...createCustomPage(value), title: 'Our page' };
    assert.equal(validateCustomPage(payload).page_type, value);
    assert.equal(validateCustomPage(payload).published, false);
  }
});

test('custom pages become real basename-safe destinations without replacing existing pages', () => {
  const menu = [...DEFAULT_NAVIGATION_MENU.items, tab];
  assert.equal(validateNavigationItems(menu).length, 9);
  assert.equal(MAX_NAVIGATION_ITEMS, 250);
  assert.equal(visibleNavigationItems(menu, [page]).at(-1).path, getCustomPagePath(page));
  assert.match(getCustomPagePath(page), new RegExp(`^/Pages/${id}/`));
  assert.equal(visibleNavigationItems(menu, [page]).at(-1).label, 'Questions');
  assert.equal(visibleNavigationItems(menu, [{ ...page, published: false }]).length, 8);
  assert.equal(visibleNavigationItems(menu, []).length, 8);
  assert.equal(navigationPageChoices([{ ...page, published: false }]).length, 8);
  assert.equal(navigationPageChoices([{ ...page, published: false }], { includeDrafts: true }).length, 9);
  for (const destination of ['custom:bad', 'custom:../login', 'custom:https://example.test', 'custom:<script>']) {
    assert.throws(() => validateNavigationItems([{ ...tab, page: destination }]));
  }
  assert.throws(() => validateNavigationItems([tab, { ...tab, id: 'different' }]));
  const mixedCase = { ...tab, page: 'custom:abcdefab-0000-4000-8000-000000000001' };
  assert.throws(() => validateNavigationItems([mixedCase, { ...mixedCase, id: 'different', page: 'custom:ABCDEFAB-0000-4000-8000-000000000001' }]));
  assert.equal(validateNavigationItems([{ ...mixedCase, page: 'custom:ABCDEFAB-0000-4000-8000-000000000001' }])[0].page, mixedCase.page);
  assert.throws(() => validateNavigationItems(Array.from({ length: 41 }, (_, index) => ({ ...tab, id: `id-${index}` }))));
});

test('demo create, edit, publish, link, unpublish and reload preserve independent content with version guards', async () => {
  const storage = new Map();
  const original = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  try {
    const { base44 } = await import('../src/api/base44Client.js?custom-pages-lifecycle');
    const api = base44.entities.CustomPage;
    const created = await api.create({ ...createCustomPage('faq'), title: 'Client questions', items: [{ id: 'question-one', title: 'Can I choose a style?', text: 'Yes, we design around your brief.', image: '', meta: '' }] });
    assert.equal(created.version, 1);
    assert.deepEqual(await api.list(), []);
    assert.equal((await api.list({ admin: true }))[0].title, created.title);
    const published = await api.update(created.id, { ...created, published: true });
    assert.equal(published.version, 2);
    assert.equal((await api.list())[0].items[0].text, created.items[0].text);
    await assert.rejects(api.update(created.id, { ...created, title: 'Stale overwrite' }), (error) => error.status === 409);
    await assert.rejects(api.update(created.id, { title: 'No version' }), (error) => error.status === 400);
    const menu = (await base44.entities.NavigationMenu.list())[0];
    const items = [...menu.items, { ...tab, page: `custom:${created.id}` }];
    await base44.entities.NavigationMenu.update(menu.id, { ...menu, items });
    const { base44: reloaded } = await import('../src/api/base44Client.js?custom-pages-reloaded');
    assert.equal((await reloaded.entities.CustomPage.list())[0].title, 'Client questions');
    assert.equal(visibleNavigationItems((await reloaded.entities.NavigationMenu.list())[0].items, await reloaded.entities.CustomPage.list()).length, 9);
    const unpublished = await api.update(created.id, { ...published, published: false });
    assert.deepEqual(await api.list(), []);
    assert.equal((await api.list({ admin: true }))[0].items[0].text, created.items[0].text);
    assert.equal(visibleNavigationItems(items, await api.list()).length, 8);
    await assert.rejects(api.delete(unpublished.id), (error) => error.status === 405);
    const currentMenu = (await base44.entities.NavigationMenu.list())[0];
    await assert.rejects(base44.entities.NavigationMenu.update(menu.id, { ...currentMenu, items: [...menu.items, tab] }), (error) => error.status === 400);
    assert.equal((await base44.entities.AboutPage.list())[0].title, 'About Us');
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test('custom routes and separate public/admin caches are wired without raw HTML', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /path="\/Pages\/:pageId\/:pageSlug\?"/);
  const layout = await readFile(new URL('../src/Layout.jsx', import.meta.url), 'utf8');
  assert.match(layout, /queryKey: \['customPages', 'public'\]/);
  const editor = await readFile(new URL('../src/Pages/AdminNavigation.jsx', import.meta.url), 'utf8');
  assert.match(editor, /queryKey: \['customPages', 'admin'\]/);
  assert.match(editor, /<CustomPageManager/);
});
