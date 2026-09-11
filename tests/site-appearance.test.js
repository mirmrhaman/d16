import test from 'node:test';
import assert from 'node:assert/strict';
import { ICON_NAMES, STATIC_ICON_SLOTS, DEFAULT_DASHBOARD_LAYOUT, DEFAULT_WEBSITE_ICONS } from '../src/data/siteAppearance.js';

test('website icon registry has unique locations and approved non-animal defaults', () => {
  assert.equal(new Set(ICON_NAMES).size, ICON_NAMES.length);
  assert.equal(new Set(STATIC_ICON_SLOTS.map((slot) => slot.key)).size, STATIC_ICON_SLOTS.length);
  for (const slot of STATIC_ICON_SLOTS) assert(ICON_NAMES.includes(slot.icon), slot.key);
  assert.equal(STATIC_ICON_SLOTS.find((slot) => slot.key === 'values.budget').icon, 'Wallet');
  assert(!ICON_NAMES.some((name) => /pig/i.test(name)));
  assert.equal(STATIC_ICON_SLOTS.filter((slot) => slot.group === 'Admin Dashboard').length, 18);
  assert.deepEqual(DEFAULT_DASHBOARD_LAYOUT.card_order, []);
  assert.deepEqual(DEFAULT_WEBSITE_ICONS.icons, {});
});

test('preview dashboard order and custom icon persist independently across reloads', async () => {
  const records = new Map();
  const previousStorage = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) };
  try {
    const { base44 } = await import('../src/api/base44Client.js?appearance-first');
    const layout = (await base44.entities.DashboardLayout.list())[0];
    const icons = (await base44.entities.WebsiteIcons.list())[0];
    await base44.entities.DashboardLayout.update(layout.id, { card_order: ['AdminIcons', 'AdminAbout'] });
    await base44.entities.WebsiteIcons.update(icons.id, { icons: { 'values.budget': { icon_name: 'Wallet', icon_url: 'data:image/png;base64,aGVsbG8=' } } });
    const { base44: restored } = await import('../src/api/base44Client.js?appearance-reload');
    assert.deepEqual((await restored.entities.DashboardLayout.list())[0].card_order, ['AdminIcons', 'AdminAbout']);
    assert.equal((await restored.entities.WebsiteIcons.list())[0].icons['values.budget'].icon_url, 'data:image/png;base64,aGVsbG8=');
    await restored.entities.WebsiteIcons.update(icons.id, { icons: {} });
    assert.deepEqual((await restored.entities.DashboardLayout.list())[0].card_order, ['AdminIcons', 'AdminAbout']);
    assert.deepEqual((await restored.entities.WebsiteIcons.list())[0].icons, {});
    assert(records.has('d16_website_icons_demo_v2'));
    assert(records.has('d16_dashboard_layout_demo_v2'));
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});
