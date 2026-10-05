import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conceptGalleryPath, togglePhotoSelection, selectionParams, resolveGallerySelection, gallerySelectionMessage } from '../src/data/conceptGallerySelection.js';
import { getConceptSectionId, getGalleryImageId } from '../server/src/conceptGallerySchema.js';

const photos = [{ id: 'warm-wood', url: 'https://example.test/master-1.jpg', title: 'Warm wood', description: '' }, { id: 'soft-light', url: 'https://example.test/master-2.jpg', title: '', description: 'Soft light' }];
const section = { id: 'master-bed', title: 'Master Bed', gallery_images: photos };
const concept = { id: 1, title: 'Bed Room', slug: 'bed-room', sub_services: [section, { id: 'child-bed', title: 'Child Bed', gallery_images: ['https://example.test/child.jpg'] }] };

test('first click selects, second click deselects, and more than one photo may be selected', () => {
  const first = togglePhotoSelection([], photos[0].id);
  const both = togglePhotoSelection(first, photos[1].id);
  assert.deepEqual(first, ['warm-wood']); assert.deepEqual(both, ['warm-wood', 'soft-light']);
  assert.deepEqual(togglePhotoSelection(both, 'warm-wood'), ['soft-light']);
  assert.deepEqual(togglePhotoSelection(first, 'warm-wood'), []);
});

test('page and selection links are refresh-safe and use scoped IDs, never photo URLs', () => {
  assert.equal(conceptGalleryPath(concept, section), '/PicYourConcept/bed-room/gallery/master-bed');
  const params = selectionParams(concept, section, ['warm-wood', 'soft-light', 'warm-wood']);
  assert.deepEqual(params.getAll('photo'), ['warm-wood', 'soft-light']);
  assert(!params.toString().includes('https')); assert(!params.toString().includes('data'));
  const result = resolveGallerySelection([concept], new URLSearchParams(params.toString()));
  assert.deepEqual(result.selection.photos, photos); assert.equal(result.warning, '');
  const reordered = { ...concept, sub_services: [...concept.sub_services].reverse().map((item) => item.id === section.id ? { ...item, title: 'Updated Master Bed', gallery_images: [...photos].reverse() } : item) };
  assert.deepEqual(resolveGallerySelection([reordered], params).selection.photos.map((item) => item.id), ['soft-light', 'warm-wood']);
});

test('legacy string galleries have stable links before and after caption editing', () => {
  const url = 'data:image/png;base64,AA==';
  const oldSection = { title: 'Old Master', image: 'https://example.test/cover.jpg', gallery_images: [url] };
  const oldConcept = { ...concept, sub_services: [oldSection] };
  const params = selectionParams(oldConcept, oldSection, [getGalleryImageId(url)]);
  const updated = { ...oldConcept, sub_services: [{ ...oldSection, id: getConceptSectionId(oldSection), title: 'Renamed Master', gallery_images: [{ id: getGalleryImageId(url), url, title: 'New caption', description: '' }] }] };
  const result = resolveGallerySelection([updated], params, { allowDataImages: true });
  assert.equal(result.selection.photos[0].title, 'New caption');
  assert(!params.toString().includes('base64'));
});

test('removed or mismatched photo references never resolve to a different item', () => {
  const params = selectionParams(concept, section, ['warm-wood', 'removed']);
  const partial = resolveGallerySelection([concept], params);
  assert.deepEqual(partial.selection.photos, [photos[0]]); assert.match(partial.warning, /Some/);
  params.set('conceptSection', 'child-bed');
  assert.equal(resolveGallerySelection([concept], params).selection, null);
  params.set('conceptSection', 'missing'); assert.equal(resolveGallerySelection([concept], params).selection, null);
  params.set('concept', 'unknown'); assert.equal(resolveGallerySelection([concept], params).selection, null);
  const ambiguous = { ...concept, sub_services: [section, { ...section }] };
  assert.equal(resolveGallerySelection([ambiguous], selectionParams(concept, section, ['warm-wood'])).selection, null);
});

test('consultation references fit encrypted-message limits and contain no image data or arbitrary query text', () => {
  const many = Array.from({ length: 40 }, (_, index) => ({ id: `photo-${index}`, title: 'x'.repeat(180), url: 'data:image/png;base64,AA==', description: '' }));
  const message = gallerySelectionMessage({ concept, section, photos: many });
  assert(message.length < 12000); assert(message.includes('photo-39')); assert(message.includes('Master Bed'));
  assert(!message.includes('data:image')); assert(!message.includes('https:'));
  const contact = readFileSync('src/Pages/Contact.jsx', 'utf8');
  assert.match(contact, /resolveGallerySelection/); assert.match(contact, /selectionMessage.*formData.message|formData.message.*selectionMessage/);
  assert.match(contact, /maxLength=\{Math.max\(0, 20000 - selectionMessage.length - 2\)\}/);
  assert.match(contact, /Change selection/);
});
