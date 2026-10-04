import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const component = await readFile(new URL('../src/components/FloatingSocialLinks.jsx', import.meta.url), 'utf8');
const layout = await readFile(new URL('../src/Layout.jsx', import.meta.url), 'utf8');

test('floating links use shared URL validation, explicit visibility and ordered client selection', () => {
  assert.match(component, /normalizeSocialMedia\(contact\)/);
  assert.match(component, /!floating_social\.enabled/);
  assert.match(component, /floating_social\.platforms\.length === 0/);
  assert.match(component, /floating_social\.platforms\.map/);
  assert.match(component, /floating_social\.side === 'left'/);
  assert.match(component, /Admin\|login/);
  assert.doesNotMatch(component, /dangerouslySetInnerHTML|<script|<iframe/);
});

test('floating links stay fixed, have accessible labels and safe external destinations', () => {
  assert.match(component, /aria-label="Floating media links"/);
  assert.match(component, /fixed z-40/);
  assert.match(component, /overflow-y-auto/);
  assert.match(component, /safe-area-inset-bottom/);
  assert.match(component, /target="_blank" rel="noopener noreferrer"/);
  assert.match(component, /aria-label=\{`Open \$\{label\} \(new tab\)`\}/);
  assert.match(component, /focus-visible:outline/);
});

test('public layout mounts floating links, keeps footer links and refreshes cross-tab demo changes', () => {
  assert.match(layout, /<FloatingSocialLinks contact=\{contact\} \/>/);
  assert.match(layout, /normalizeSocialMedia\(contact\)\.social_links/);
  assert.match(layout, /Object\.entries\(socialLinks\)\.map/);
  assert.match(layout, /IS_DEMO && event\.key === 'd16_contact_info_demo_v2'/);
});
