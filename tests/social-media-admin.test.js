import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const editor = await readFile(new URL('../src/Pages/AdminSocialMedia.jsx', import.meta.url), 'utf8');

test('social editor exposes opt-in floating visibility, selected profiles, side and ordering controls', () => {
  for (const text of ['Show floating media buttons', 'Screen side', 'visible while scrolling', 'Add Link', 'Save Social Media Links']) assert.ok(editor.includes(text));
  assert.match(editor, /value="right"/);
  assert.match(editor, /value="left"/);
  assert.match(editor, /moveRow\(index, -1\)/);
  assert.match(editor, /moveRow\(index, 1\)/);
  assert.match(editor, /floating: false/);
  assert.match(editor, /Browser preview: saved changes stay in this browser only/);
});

test('social saves validate and send partial versioned payloads without overwriting other contact fields', () => {
  assert.match(editor, /validateSocialLinks\(Object\.fromEntries\(entries\)\)/);
  assert.match(editor, /validateFloatingSocial\(\{ enabled: draft\.enabled, side: draft\.side, platforms \}, social_links\)/);
  assert.match(editor, /names\.has\(platform\)/);
  assert.match(editor, /contactInfoClient\.update\(original\.id, \{ \.\.\.payload, version: original\.version \}\)/);
  assert.match(editor, /return \{ social_links, floating_social \}/);
  assert.doesNotMatch(editor, /\.\.\.contact,/);
});

test('social drafts are user-scoped, preserved on conflicts and protected from background refresh', () => {
  assert.match(editor, /\['socialMediaDraft', userId\]/);
  assert.match(editor, /if \(!savedSignature \|\| loadError \|\| dirty \|\| busy\) return/);
  assert.match(editor, /failure\.status === 409/);
  assert.match(editor, /Your draft is still here/);
  assert.match(editor, /beforeunload/);
  assert.match(editor, /Discard Draft & Reload/);
  assert.match(editor, /Keep Editing/);
});
