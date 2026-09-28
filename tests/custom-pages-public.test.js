import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicCustomPage } from '../src/data/publicCustomPages.js';
import { PAGE_TYPES, createCustomPage } from '../server/src/customPageSchema.js';

const id = 'bcce3abf-e426-4ae0-9b6d-c17954bdddb1';
const record = (fields = {}) => ({ ...createCustomPage(), id, title: 'Our new page', published: true, ...fields });

test('public custom pages support every template without replacing intentional empty content', () => {
  for (const { value } of PAGE_TYPES) {
    const { status, page } = resolvePublicCustomPage([record({ page_type: value })], id);
    assert.equal(status, 'available', value);
    assert.equal(page.page_type, value);
    assert.deepEqual(page.items, []);
    assert.equal(page.intro, '');
    assert.equal(page.body, '');
  }
});

test('draft or missing custom pages never render, including unexpected cached publication flags', () => {
  for (const published of [false, undefined, null, 'true', 'false', 1, 0]) {
    assert.deepEqual(resolvePublicCustomPage([record({ published })], id), { status: 'not-found', page: null });
  }
  assert.equal(resolvePublicCustomPage([], id).status, 'not-found');
  assert.equal(resolvePublicCustomPage([record()], 'missing').status, 'not-found');
  assert.equal(resolvePublicCustomPage([null, false, [], record()], id).status, 'available');
});

test('malformed published pages fail closed instead of crashing or displaying default page data', () => {
  for (const input of [null, {}, 'bad']) assert.deepEqual(resolvePublicCustomPage(input, id), { status: 'unavailable', page: null });
  for (const fields of [
    { title: {} }, { title: '' }, { page_type: 'unknown' }, { items: null },
    { items: [{ id: 'sample', title: 'Sample', text: { invalid: true } }] },
    { items: [{ id: 'sample', title: 'A' }, { id: 'sample', title: 'B' }] },
  ]) assert.deepEqual(resolvePublicCustomPage([record(fields)], id), { status: 'unavailable', page: null });
});

test('public image validation rejects active sources, allowing raster data images only in demo mode', () => {
  for (const hero_image of ['javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', '//example.org/picture.jpg', 'https://user:secret@example.org/picture.jpg']) {
    assert.equal(resolvePublicCustomPage([record({ hero_image })], id, { allowDataImages: true }).status, 'unavailable');
  }
  const raster = 'data:image/png;base64,iVBORw0KGgo=';
  assert.equal(resolvePublicCustomPage([record({ hero_image: raster })], id).status, 'unavailable');
  assert.equal(resolvePublicCustomPage([record({ hero_image: raster })], id, { allowDataImages: true }).status, 'available');
  assert.equal(resolvePublicCustomPage([record({ hero_image: '/uploads/custom-page.png' })], id).status, 'available');
  assert.equal(resolvePublicCustomPage([record({ items: [{ id: 'item-1', image: 'javascript:alert(1)' }] })], id).status, 'unavailable');
});

test('public pages preserve user text and order while omitting record metadata and unrelated fields', () => {
  const input = record({
    title: '  New studio  ', intro: 'First line\nSecond line', body: '<b>Plain text</b>',
    version: 4, updated_by_user_id: 'private-identity',
    items: [{ id: 'second', title: 'Second', text: 'Details', image: '', meta: 'Role' }, { id: 'first', title: 'First' }],
  });
  const result = resolvePublicCustomPage([input], id);
  assert.equal(result.status, 'available');
  assert.equal(result.page.title, 'New studio');
  assert.equal(result.page.intro, 'First line\nSecond line');
  assert.equal(result.page.body, '<b>Plain text</b>');
  assert.deepEqual(result.page.items.map((item) => item.id), ['second', 'first']);
  assert.equal(result.page.version, undefined);
  assert.equal(result.page.updated_by_user_id, undefined);
  assert.equal(input.title, '  New studio  ');
});
