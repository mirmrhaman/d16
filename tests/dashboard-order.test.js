import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardCardKey, normalizeDashboardOrder, moveDashboardCard, dropDashboardCard, sortDashboardOrder } from '../src/data/dashboardOrder.js';

const cards = [
  { key: 'AdminAbout', title: 'About Us & Team' },
  { key: 'AdminStats', title: 'Statistics' },
  { key: 'AdminBlog', title: 'Blog Posts' },
  { key: 'AdminIcons', title: 'Website Icons' },
];

test('route-derived keys and saved layout normalization preserve all current cards', () => {
  assert.equal(dashboardCardKey({ link: '/AdminAbout' }), 'AdminAbout');
  assert.equal(dashboardCardKey(null), '');
  assert.deepEqual(normalizeDashboardOrder(['AdminBlog', 'RemovedCard', 'AdminBlog', null, '/AdminAbout'], cards), ['AdminBlog', 'AdminAbout', 'AdminStats', 'AdminIcons']);
  assert.deepEqual(normalizeDashboardOrder(null, cards), cards.map((card) => card.key));
  assert.deepEqual(normalizeDashboardOrder(['AdminAbout'], [...cards, cards[0]]), cards.map((card) => card.key));
});

test('up/down movement changes one position without mutating the source', () => {
  const order = cards.map((card) => card.key);
  assert.deepEqual(moveDashboardCard(order, 'AdminBlog', 1), ['AdminAbout', 'AdminBlog', 'AdminStats', 'AdminIcons']);
  assert.deepEqual(moveDashboardCard(order, 'AdminAbout', 3), ['AdminStats', 'AdminBlog', 'AdminIcons', 'AdminAbout']);
  assert.deepEqual(order, cards.map((card) => card.key));
  for (const index of [-1, 4, 1.5, NaN]) assert.deepEqual(moveDashboardCard(order, 'AdminAbout', index), order);
  assert.deepEqual(moveDashboardCard(order, 'ExternalCard', 1), order);
});

test('drop movement ignores unknown or external card identifiers', () => {
  const order = cards.map((card) => card.key);
  assert.deepEqual(dropDashboardCard(order, 'AdminIcons', 'AdminAbout'), ['AdminIcons', 'AdminAbout', 'AdminStats', 'AdminBlog']);
  assert.deepEqual(dropDashboardCard(order, 'AdminAbout', 'AdminBlog'), ['AdminStats', 'AdminBlog', 'AdminAbout', 'AdminIcons']);
  assert.deepEqual(dropDashboardCard(order, 'ExternalCard', 'AdminAbout'), order);
  assert.deepEqual(dropDashboardCard(order, 'AdminAbout', 'ExternalCard'), order);
  assert.deepEqual(dropDashboardCard(order, 'AdminAbout', 'AdminAbout'), order);
});

test('alphabetical order uses visible titles and supports both directions', () => {
  const manual = ['AdminIcons', 'AdminAbout', 'AdminBlog', 'AdminStats'];
  assert.deepEqual(sortDashboardOrder(manual, cards, 'asc'), ['AdminAbout', 'AdminBlog', 'AdminStats', 'AdminIcons']);
  assert.deepEqual(sortDashboardOrder(manual, cards, 'desc'), ['AdminIcons', 'AdminStats', 'AdminBlog', 'AdminAbout']);
  assert.deepEqual(manual, ['AdminIcons', 'AdminAbout', 'AdminBlog', 'AdminStats']);
  assert.deepEqual(sortDashboardOrder([], [{ key: 'a', title: 'section 10' }, { key: 'b', title: 'Section 2' }]), ['b', 'a']);
});
