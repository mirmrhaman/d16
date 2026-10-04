import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const editor = await readFile(new URL('../src/components/CustomPageManager.jsx', import.meta.url), 'utf8');

test('Add Tab can request a new page in the signed-in editor without removing its own create control', () => {
  assert.match(editor, /function CustomPageManager\(\{[^}]*newPageRequest = null/);
  assert.match(editor, /<PageManager[^>]*newPageRequest=\{newPageRequest\}/);
  assert.match(editor, /function PageManager\(\{[^}]*newPageRequest/);
  assert.match(editor, /requestAction\(\{ kind: 'new', pageType: newType \}\)/);
});

test('new-page requests are deduplicated and queued until saves, loading and confirmation finish', () => {
  assert.match(editor, /seenNewPageRequests = useRef\(new Set\(\)\)/);
  assert.match(editor, /!seenNewPageRequests\.current\.has\(newPageRequest\.id\)/);
  assert.match(editor, /seenNewPageRequests\.current\.add\(newPageRequest\.id\)/);
  assert.match(editor, /pendingNewPageRequests\.current\.push\(\{ kind: 'new', pageType: newPageRequest\.pageType \}\)/);
  const wait = editor.indexOf('if (busy || query.isPending || loadError || confirmation || pendingNewPageRequests.current.length === 0) return;');
  const dequeue = editor.indexOf('const action = pendingNewPageRequests.current.shift();');
  assert.ok(wait >= 0 && dequeue > wait, 'a request must not be removed while the editor cannot handle it');
  assert.match(editor.slice(dequeue), /setNewType\(action\.pageType\);\s*requestAction\(action\);/);
});

test('external Add Tab requests retain dirty-draft protection and editor focus', () => {
  assert.match(editor, /if \(dirty\) setConfirmation\(action\);\s*else performAction\(action\);/);
  assert.match(editor, /editorRef\.current\?\.scrollIntoView\(\{ block: 'start', behavior: 'smooth' \}\)/);
  assert.match(editor, /editorRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(editor, /Keep Editing Page/);
});
