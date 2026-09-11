export function dashboardCardKey(card) {
  const value = typeof card === 'string' ? card : card?.key ?? card?.link;
  return typeof value === 'string' ? value.replace(/^\/+/, '') : '';
}

// Saved layouts never hide newly added cards or introduce unknown routes.
export function normalizeDashboardOrder(order, cards) {
  const defaults = [...new Set((Array.isArray(cards) ? cards : []).map(dashboardCardKey).filter(Boolean))];
  const allowed = new Set(defaults);
  const result = [];
  for (const item of Array.isArray(order) ? order : []) {
    const key = typeof item === 'string' ? dashboardCardKey(item) : '';
    if (allowed.has(key) && !result.includes(key)) result.push(key);
  }
  for (const key of defaults) if (!result.includes(key)) result.push(key);
  return result;
}

export function moveDashboardCard(order, cardKey, targetIndex) {
  const result = Array.isArray(order) ? [...order] : [];
  const currentIndex = result.indexOf(cardKey);
  if (currentIndex < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= result.length) return result;
  result.splice(currentIndex, 1);
  result.splice(targetIndex, 0, cardKey);
  return result;
}

export function dropDashboardCard(order, draggedKey, targetKey) {
  if (!Array.isArray(order) || !order.includes(draggedKey) || !order.includes(targetKey)) return Array.isArray(order) ? [...order] : [];
  return moveDashboardCard(order, draggedKey, order.indexOf(targetKey));
}

export function sortDashboardOrder(order, cards, direction = 'asc') {
  const normalized = normalizeDashboardOrder(order, cards);
  const titles = new Map(cards.map((card) => [dashboardCardKey(card), typeof card === 'string' ? dashboardCardKey(card) : card.title || dashboardCardKey(card)]));
  const compare = new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare;
  const multiplier = direction === 'desc' ? -1 : 1;
  return [...normalized].sort((left, right) => multiplier * compare(titles.get(left), titles.get(right)));
}
