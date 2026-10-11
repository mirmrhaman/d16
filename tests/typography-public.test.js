import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { typographyCss, typographyRulesForPage, TEXT_SELECTORS, applyTypographyTextMatches, normalizeDisplayedText } from '../src/data/typography.js';

const rule = (id, extra = {}) => ({ id, page: '*', target: 'all', text: '', style: { fontFamily: 'lato' }, ...extra });
const config = (rules) => ({ title: 'Website typography', rules });

test('defaults and corrupt typography produce no overrides; admin and login are isolated', () => {
  for (const path of ['/', '/About', '/AdminTypography', '/AdminDashboard', '/login']) assert.equal(typographyCss(undefined, path), '');
  for (const path of ['/AdminTypography', '/AdminDashboard', '/login', '/adminanything']) assert.equal(typographyCss(config([rule('r')]), path), '');
  assert.equal(typographyCss(config([rule('r', { style: { fontSize: '1px;display:none' } })]), '/'), '');
  assert.equal(typographyCss(config([rule('r', { style: {} })]), '/'), '');
});

test('page matching is exact and cascade is deterministic, without mutating saved rules', () => {
  const rules = [rule('exact-page', { page: '/About', target: 'title', text: 'About Us' }), rule('page-all', { page: '/About' }), rule('site-title', { target: 'title' }), rule('site-all'), rule('page-title', { page: '/About', target: 'title' }), rule('site-exact', { text: 'About Us' }), rule('site-title-later', { target: 'title' })];
  const original = structuredClone(rules);
  assert.deepEqual(typographyRulesForPage(config(rules), '/About').map((r) => r.id), ['site-all', 'site-title', 'site-title-later', 'page-all', 'page-title', 'site-exact', 'exact-page']);
  assert.deepEqual(typographyRulesForPage(config(rules), '/About/detail').map((r) => r.id), ['site-all', 'site-title', 'site-title-later', 'site-exact']);
  assert.deepEqual(rules, original);
});

test('CSS contains safe local font stacks and scoped property-only overrides', () => {
  const css = typographyCss(config([rule('button', { target: 'button', style: { fontFamily: 'open-sans', fontSize: '1.5rem', color: '#aabbcc', fontStyle: 'italic' } })]), '/');
  assert.match(css, /\[data-d16-public\] :where/);
  assert.match(css, /font-family: "D16 Open Sans", sans-serif !important/);
  assert.match(css, /font-size: 1.5rem !important/);
  assert.match(css, /-webkit-text-fill-color: #aabbcc/);
  assert.doesNotMatch(css, /font-weight:|https:|@import|background:|<script/);
  assert.match(css, /line-height: normal !important/);
  assert.match(TEXT_SELECTORS.button, /button:not\(\[data-d16-text\]\)/);
  const exact = typographyCss(config([rule('safe-id', { text: '</style><script>alert(1)</script>' })]), '/');
  assert.doesNotMatch(exact, /<script|<\/style|alert/);
  assert.match(exact, /data-d16-ty-match~="safe-id"/);
});

test('exact text matching normalizes whitespace, handles repeated labels and removes obsolete matches', () => {
  const element = (textContent, children = []) => ({ tagName: 'BUTTON', textContent, children, attrs: {}, getAttribute(key) { return this.attrs[key]; }, setAttribute(key, value) { this.attrs[key] = value; }, removeAttribute(key) { delete this.attrs[key]; } });
  const first = element('Get\n a  Quote'); const second = element('GET A QUOTE'); const other = element('Get another quote');
  const root = { querySelectorAll(selector) { return selector === '[data-d16-ty-match]' ? [first, second, other].filter((node) => node.attrs['data-d16-ty-match']) : [first, second, other]; } };
  const rules = [rule('quote', { target: 'button', text: 'Get a Quote' })];
  applyTypographyTextMatches(root, rules);
  assert.equal(first.attrs['data-d16-ty-match'], 'quote'); assert.equal(second.attrs['data-d16-ty-match'], 'quote'); assert.equal(other.attrs['data-d16-ty-match'], undefined);
  first.textContent = 'New button name'; applyTypographyTextMatches(root, rules);
  assert.equal(first.attrs['data-d16-ty-match'], undefined); assert.equal(second.attrs['data-d16-ty-match'], 'quote');
  applyTypographyTextMatches(root, []); assert.equal(second.attrs['data-d16-ty-match'], undefined);
  assert.equal(normalizeDisplayedText('  Our\n mission '), 'Our mission');
});

test('bundled font files are real WOFF2 assets with local faces and licenses', () => {
  const css = readFileSync('src/assets/typography-fonts.css', 'utf8');
  const files = readdirSync('src/assets/fonts');
  assert.equal(files.length, 34);
  for (const file of files) { assert.equal(readFileSync(`src/assets/fonts/${file}`).subarray(0, 4).toString(), 'wOF2'); assert(css.includes(file)); }
  for (const key of ['opensans', 'lato', 'roboto', 'montserrat', 'poppins']) assert.match(readFileSync(`public/licenses/fonts/${key}-OFL.txt`, 'utf8'), /SIL OPEN FONT LICENSE/);
  assert.doesNotMatch(css, /https?:\/\//);
});

test('public typography controls are wired to permissions, text roles and protected admin paths', () => {
  const app = readFileSync('src/App.jsx', 'utf8');
  assert.match(app, /path="\/AdminTypography" element=\{<RequireAuth allowedRoles=\{\['admin'\]\}/);
  const layout = readFileSync('src/Layout.jsx', 'utf8');
  assert.match(layout, /data-d16-public=\{isPublicTypographyPath\(location.pathname\)/);
  const gallery = readFileSync('src/Pages/ConceptItemGallery.jsx', 'utf8');
  assert.match(gallery, /<button data-d16-text="body" type="button" aria-pressed/);
  assert.match(gallery, /data-d16-text="card-title"/);
  assert.match(readFileSync('src/Pages/catalogue/ConceptGalleryLink.jsx', 'utf8'), /data-d16-text="button"/);
});
