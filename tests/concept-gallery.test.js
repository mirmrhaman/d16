import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_GALLERY_LABEL, MAX_CONCEPT_GALLERY_IMAGES, DEMO_GALLERY_FILE_BYTES, validateConceptGallery, readConceptGallery, isSafeGalleryImage } from '../server/src/conceptGallerySchema.js';

Object.assign(process.env, {
  API_ENV_FILE: '/dev/null', NODE_ENV: 'qa', DB_HOST: '127.0.0.1', DB_PORT: '65531', DB_NAME: 'dinterio_d16_qa', DB_USER: 'offline_test', DB_PASSWORD: 'synthetic-test-only',
  APP_ENCRYPTION_KEY_BASE64: Buffer.alloc(32, 71).toString('base64'), APP_HMAC_KEY_BASE64: Buffer.alloc(32, 82).toString('base64'),
});
const { cleanPublicPayload } = await import('../server/src/contentService.js');
const { pool } = await import('../server/src/db.js');
test.after(() => pool.end());
const images = ['https://example.test/master-1.jpg', '/uploads/master-2.webp'];
const section = { title: 'Master Bed', description: 'Public example', image: images[0], gallery_images: images, gallery_button_label: 'Design Ideas' };

test('optional galleries preserve legacy records and default empty labels', () => {
  assert.deepEqual(validateConceptGallery({ title: 'Child Bed' }), {});
  assert.deepEqual(readConceptGallery({}), { label: DEFAULT_GALLERY_LABEL, images: [] });
  assert.deepEqual(validateConceptGallery({ gallery_images: [], gallery_button_label: '  ' }), { gallery_images: [], gallery_button_label: DEFAULT_GALLERY_LABEL });
  assert.deepEqual(validateConceptGallery({ ...section, gallery_button_label: '  Images  ' }), { gallery_images: images, gallery_button_label: 'Images' });
  assert.notEqual(validateConceptGallery(section).gallery_images, images);
});

test('gallery validation accepts multiple safe images, preserves order and bounds count', () => {
  assert.deepEqual(validateConceptGallery({ ...section, gallery_images: [...images].reverse() }).gallery_images, [...images].reverse());
  const many = Array.from({ length: MAX_CONCEPT_GALLERY_IMAGES }, (_, i) => `https://example.test/${i}.png`);
  assert.equal(validateConceptGallery({ gallery_images: many }).gallery_images.length, 40);
  assert.throws(() => validateConceptGallery({ gallery_images: [...many, 'https://example.test/extra.png'] }), /up to 40/);
  assert.throws(() => validateConceptGallery({ gallery_images: [images[0], images[0]] }), /duplicate/);
  for (const value of [null, {}, 'bad', [null], [123]]) assert.throws(() => validateConceptGallery({ gallery_images: value }));
  for (const label of [null, 1, {}, 'x'.repeat(61), 'Images\nnow']) assert.throws(() => validateConceptGallery({ gallery_button_label: label }));
});

test('unsafe URLs, credentials, non-image data and server data URLs are rejected', () => {
  for (const url of ['javascript:alert(1)', '//example.test/photo.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,AA==', 'https://user:password@example.test/x.jpg', 'https://example.test/a b.jpg', 'https:' + String.fromCharCode(92) + '//example.test/x.jpg', '/uploads/../private.png', '/uploads/photo.svg', 'https://example.test/%0a.png', '', 'https://']) {
    assert.equal(isSafeGalleryImage(url, { allowDataImages: true }), false, url);
    assert.throws(() => validateConceptGallery({ gallery_images: [url] }));
  }
  assert.equal(isSafeGalleryImage('data:image/png;base64,AA=='), false);
  assert.equal(isSafeGalleryImage('data:image/png;base64,AA==', { allowDataImages: true }), true);
  assert.equal(isSafeGalleryImage('data:image/png;base64,AAA', { allowDataImages: true }), false);
  const oversized = 'data:image/png;base64,' + Buffer.alloc(DEMO_GALLERY_FILE_BYTES + 1).toString('base64');
  assert.equal(isSafeGalleryImage(oversized, { allowDataImages: true }), false);
});

test('public gallery reads filter malformed legacy values without exposing unsafe images', () => {
  assert.deepEqual(readConceptGallery({ gallery_button_label: {}, gallery_images: [images[0], images[0], 'javascript:bad', null, images[1]] }), { label: DEFAULT_GALLERY_LABEL, images });
  assert.deepEqual(readConceptGallery(null), { label: DEFAULT_GALLERY_LABEL, images: [] });
});

test('server accepts concept galleries only, preserves siblings/metadata and partial updates', () => {
  const payload = { title: 'Bed Room', slug: 'bed-room', features: ['Lighting'], sub_services: [section, { title: 'Child Bed', description: 'Unchanged' }] };
  const saved = cleanPublicPayload('PicYourConcept', payload);
  assert.deepEqual(saved, payload);
  assert.deepEqual(cleanPublicPayload('PicYourConcept', { description: 'Updated introduction' }, saved).sub_services, payload.sub_services);
  for (const entity of ['Service', 'GalleryConcept']) assert.throws(() => cleanPublicPayload(entity, payload), /public presentation fields/);
  assert.throws(() => cleanPublicPayload('PicYourConcept', { ...payload, sub_services: [{ ...section, gallery_images: ['data:image/png;base64,AA=='] }] }));
  assert.throws(() => cleanPublicPayload('PicYourConcept', { ...payload, sub_services: [{ ...section, password: 'no' }] }), /Private fields/);
});

test('demo gallery create/edit/reload/removal survives persistence and quota failure retains saved content', async () => {
  const storage = new Map(); const original = globalThis.localStorage;
  let failSave = false;
  globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => { if (failSave) throw Object.assign(new Error('Full'), { name: 'QuotaExceededError' }); storage.set(key, value); } };
  try {
    const { base44 } = await import('../src/api/base44Client.js?concept-gallery-first');
    const api = base44.entities.PicYourConcept;
    const created = await api.create({ title: 'Synthetic gallery test', sub_services: [section, { title: 'Child Bed' }] });
    const edited = await api.update(created.id, { sub_services: [{ ...section, gallery_images: [...images].reverse(), gallery_button_label: 'Images' }, { title: 'Child Bed' }] });
    const { base44: fresh } = await import('../src/api/base44Client.js?concept-gallery-reload');
    assert.deepEqual((await fresh.entities.PicYourConcept.list()).find((item) => item.id === created.id), edited);
    const before = storage.get('d16_pic_your_concept_demo_v2');
    await assert.rejects(api.update(created.id, { sub_services: [{ ...section, gallery_images: ['javascript:bad'] }] }));
    assert.equal(storage.get('d16_pic_your_concept_demo_v2'), before);
    failSave = true;
    await assert.rejects(api.update(created.id, { sub_services: [] }), { name: 'QuotaExceededError' });
    assert.deepEqual((await api.list()).find((item) => item.id === created.id), edited);
    failSave = false;
    const empty = await api.update(created.id, { sub_services: [{ ...section, gallery_images: [] }, { title: 'Child Bed' }] });
    assert.deepEqual(empty.sub_services[0].gallery_images, []);
    assert.deepEqual(empty.sub_services[1], { title: 'Child Bed' });
    assert.equal(empty.title, created.title);
    const uploaded = await api.update(created.id, { sub_services: [{ ...section, gallery_images: ['data:image/png;base64,AA=='] }] });
    assert.equal(uploaded.sub_services[0].gallery_images.length, 1);
  } finally { if (original === undefined) delete globalThis.localStorage; else globalThis.localStorage = original; }
});

test('UI wiring retains quote links, optional gallery scope, multiple upload and keyboard dialog controls', () => {
  const detail = readFileSync('src/Pages/catalogue/CatalogueDetail.jsx', 'utf8');
  const editor = readFileSync('src/Pages/catalogue/ConceptGalleryEditor.jsx', 'utf8');
  const gallery = readFileSync('src/Pages/catalogue/ConceptGallery.jsx', 'utf8');
  assert.match(detail, /catalogue === "PicYourConcept" && <ConceptGallery/);
  assert.match(detail, /<Link to=\{contactUrl\} className=\{linkClass\}>Get a Quote/);
  assert.match(editor, /type="file" multiple/);
  assert.match(editor, /gallery_button_label/);
  assert.match(editor, /Move gallery photo/); assert.match(editor, /Remove gallery photo/);
  assert.match(gallery, /if \(!images.length\) return null/);
  assert.match(gallery, /dialog.showModal\(\)/); assert.match(gallery, /onCancel=/);
  assert.match(gallery, /ArrowLeft.*ArrowRight/); assert.match(gallery, /previousFocus.focus\(\)/);
});
