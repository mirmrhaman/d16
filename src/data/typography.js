import { FONT_OPTIONS, validateTypography } from '../../server/src/typographySchema.js';

const natural = (selector) => `${selector}:not([data-d16-text])`;
const tagged = (role) => `[data-d16-text="${role}"]`;
// Explicit hooks cover nonsemantic text and CTA links. Natural fallbacks cover
// new content without applying CTA styling to selectable gallery-photo cards.
export const TEXT_SELECTORS = {
  all: '*:not(svg):not(svg *)',
  // Only the client-managed page tabs/dropdowns opt in. Header account actions
  // (login/logout/admin/consultation) can have their own contrasting buttons.
  navigation: tagged('navigation'),
  button: `${natural('button')}, ${tagged('button')}`,
  title: `${natural('h1')}, ${tagged('title')}`,
  heading: `${natural('h2')}, ${tagged('heading')}`,
  'card-title': `${['h3', 'h4', 'h5', 'h6'].map(natural).join(', ')}, ${tagged('card-title')}`,
  description: `${natural('p')}, ${tagged('description')}`,
  body: `${natural('li')}, ${natural('blockquote')}, ${natural('dt')}, ${natural('dd')}, ${tagged('body')}`,
  small: `${natural('small')}, ${natural('figcaption')}, ${tagged('small')}`,
  link: 'a:not([data-d16-text]):not(:has(button, h1, h2, h3, h4, h5, h6, p, img)):not(header a), [data-d16-text="link"]',
  form: 'input:not([type="checkbox"]):not([type="radio"]), textarea, select, [role="combobox"], [role="option"], label, legend, [data-d16-text="form"]',
  footer: 'footer, footer *:not(svg):not(svg *)',
};
const CSS_PROPERTIES = {
  fontFamily: 'font-family', fontSize: 'font-size', color: 'color', fontWeight: 'font-weight',
  fontStyle: 'font-style', textDecoration: 'text-decoration', textTransform: 'text-transform',
  lineHeight: 'line-height', letterSpacing: 'letter-spacing',
};
export const normalizeDisplayedText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
export const isPublicTypographyPath = (path) => typeof path === 'string' && !/^\/(?:admin|login|auth)/i.test(path);

export function typographyRulesForPage(record, path) {
  if (!isPublicTypographyPath(path)) return [];
  try {
    const { rules } = validateTypography(record || { title: 'Website typography', rules: [] });
    const priority = (rule) => (rule.text ? 4 : 0) + (rule.page !== '*' ? 2 : 0) + (rule.target !== 'all' ? 1 : 0);
    return rules.filter((rule) => rule.page === '*' || rule.page === path)
      .sort((left, right) => priority(left) - priority(right));
  } catch { return []; } // A corrupt public record cannot inject CSS or break browsing.
}

export function typographyDeclarations(style) {
  return Object.entries(style).filter(([key]) => Object.hasOwn(CSS_PROPERTIES, key)).map(([key, value]) => {
    const resolved = key === 'fontFamily' ? FONT_OPTIONS.find((font) => font.value === value)?.family : value;
    return resolved ? `${CSS_PROPERTIES[key]}: ${resolved} !important;` : '';
  }).join(' ');
}

export function typographyCss(record, path) {
  return typographyRulesForPage(record, path).map((rule) => {
    const match = rule.text ? `[data-d16-ty-match~="${rule.id}"]` : TEXT_SELECTORS[rule.target];
    // Equal specificity makes the documented rule order deterministic. Inline
    // spans follow the chosen role without restyling separately tagged children.
    const selector = `[data-d16-public] :where(${match}), [data-d16-public] :where(${match}) :where(span:not([data-d16-text]), strong:not([data-d16-text]), em:not([data-d16-text]))`;
    const declarations = typographyDeclarations(rule.style);
    if (!declarations) return '';
    const fill = rule.style.color ? `-webkit-text-fill-color: ${rule.style.color} !important;` : '';
    const scalableLine = rule.style.fontSize && !rule.style.lineHeight ? 'line-height: normal !important;' : '';
    return `${selector} { ${declarations} ${fill} ${scalableLine} }`;
  }).join('\n');
}

// Exact text is compared as data, never interpolated into a selector or HTML.
export function applyTypographyTextMatches(root, rules) {
  if (!root) return;
  const matches = new Map();
  const textCache = new Map();
  const textOf = (node) => {
    if (!textCache.has(node)) {
      const copy = node.cloneNode ? node.cloneNode(true) : node;
      copy.querySelectorAll?.('svg, script, style, [aria-hidden="true"], [hidden], .sr-only').forEach((child) => child.remove());
      textCache.set(node, normalizeDisplayedText(copy.textContent).toLowerCase());
    }
    return textCache.get(node);
  };
  for (const rule of rules.filter((entry) => entry.text)) {
    const wanted = normalizeDisplayedText(rule.text).toLowerCase();
    for (const node of root.querySelectorAll(TEXT_SELECTORS[rule.target])) {
      if (['SCRIPT', 'STYLE', 'SVG', 'PATH'].includes(node.tagName)) continue;
      if (textOf(node) !== wanted) continue;
      // For all-text rules choose the smallest matching text container, not an
      // entire card/section whose only visible string happens to be the same.
      if (rule.target === 'all' && Array.from(node.children).some((child) => textOf(child) === wanted)) continue;
      matches.set(node, [...(matches.get(node) || []), rule.id]);
    }
  }
  for (const node of root.querySelectorAll('[data-d16-ty-match]')) {
    if (!matches.has(node)) node.removeAttribute('data-d16-ty-match');
  }
  for (const [node, ids] of matches) {
    const value = ids.join(' ');
    if (node.getAttribute('data-d16-ty-match') !== value) node.setAttribute('data-d16-ty-match', value);
  }
}
