import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const layout = await readFile(new URL('../src/Layout.jsx', import.meta.url), 'utf8');
const desktop = layout.slice(layout.indexOf('{/* Header */}'), layout.indexOf('{/* Mobile Menu */}'));

test('desktop logo, direct tabs, chosen dropdown and account actions share one non-wrapping header row', () => {
  assert.match(desktop, /flex h-20 flex-nowrap items-center justify-between/);
  assert.ok(desktop.indexOf('{/* Logo */}') < desktop.indexOf('aria-label="Main navigation"'));
  assert.ok(desktop.indexOf('aria-label="Main navigation"') < desktop.indexOf('aria-label="Account actions"'));
  assert.doesNotMatch(desktop, /flex-wrap|border-t|items-start/);
  assert.match(desktop, /shrink-0 whitespace-nowrap rounded px-1\.5 py-3/);
  assert.match(desktop, /aria-label="Account actions" className="hidden shrink-0 items-center gap-2 lg:flex"/);
});

test('overflow navigation is reachable with scroll controls, focus and keyboard without automatic grouping', () => {
  assert.match(layout, /aria-label="Previous navigation tabs"/);
  assert.match(layout, /aria-label="Next navigation tabs"/);
  assert.match(layout, /disabled=\{!navigationScroll\.previous\}/);
  assert.match(layout, /disabled=\{!navigationScroll\.next\}/);
  assert.match(layout, /overflow-x-auto/);
  assert.match(layout, /onFocusCapture=\{\(event\) => revealNavigationLink/);
  assert.match(layout, /\['ArrowLeft', 'ArrowRight', 'Home', 'End'\]/);
  assert.match(layout, /prefers-reduced-motion: reduce/);
  assert.match(layout, /observer\?\.observe\(track\)/);
  assert.match(layout, /groupNavigationItems\(navigationItems, navigationSettings\)/);
  assert.doesNotMatch(layout, /directItems\.slice|navigationItems\.slice/);
});

test('dropdown stays outside horizontal clipping and mobile menu keeps matched breakpoints and escape handling', () => {
  const scroller = desktop.indexOf('id="desktop-direct-navigation"');
  const nextControl = desktop.indexOf('aria-label="Next navigation tabs"');
  const dropdown = desktop.indexOf('<details');
  assert.ok(scroller >= 0 && nextControl > scroller && dropdown > nextControl);
  assert.match(desktop, /navigationSettings\.dropdown_label/);
  assert.match(layout, /className="lg:hidden shrink-0 p-2/);
  assert.match(layout, /id="mobile-navigation"[^\n]+className="lg:hidden overflow-y-auto/);
  assert.match(layout, /mobileToggleRef\.current\?\.focus\(\)/);
  assert.match(layout, /onKeyDown=\{closeDropdownOnEscape\}/);
});
