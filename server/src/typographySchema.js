// Public presentation settings shared by the API and browser preview.
// These are structured values, never raw CSS, selectors, HTML or font URLs.
export const TYPOGRAPHY_ID = '629feea4-9673-43ef-8ed7-e13546a60e16';
export const DEFAULT_TYPOGRAPHY = { title: 'Website typography', rules: [] };
export const MAX_TYPOGRAPHY_RULES = 200;
export const FONT_OPTIONS = [
  { value: 'system', label: 'System default', family: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { value: 'open-sans', label: 'Open Sans', family: '"D16 Open Sans", sans-serif' },
  { value: 'lato', label: 'Lato', family: '"D16 Lato", sans-serif' },
  { value: 'roboto', label: 'Roboto', family: '"D16 Roboto", sans-serif' },
  { value: 'montserrat', label: 'Montserrat', family: '"D16 Montserrat", sans-serif' },
  { value: 'poppins', label: 'Poppins', family: '"D16 Poppins", sans-serif' },
  { value: 'arial', label: 'Arial', family: 'Arial, sans-serif' },
  { value: 'georgia', label: 'Georgia', family: 'Georgia, serif' },
];
export const TYPOGRAPHY_TARGETS = [
  { value: 'all', label: 'All website text' },
  { value: 'navigation', label: 'Navigation tabs' },
  { value: 'button', label: 'Buttons' },
  { value: 'title', label: 'Page titles' },
  { value: 'heading', label: 'Section headings' },
  { value: 'card-title', label: 'Card titles' },
  { value: 'description', label: 'Descriptions' },
  { value: 'body', label: 'Body text' },
  { value: 'small', label: 'Small text' },
  { value: 'link', label: 'Text links' },
  { value: 'form', label: 'Form fields and labels' },
  { value: 'footer', label: 'Footer text' },
];
const fonts = new Set(FONT_OPTIONS.map(({ value }) => value));
const targets = new Set(TYPOGRAPHY_TARGETS.map(({ value }) => value));
const object = (value) => value && typeof value === 'object' && !Array.isArray(value);
const fail = (message) => { throw Object.assign(new Error(message), { status: 400, statusCode: 400 }); };
const noControl = (value) => ![...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);
const simpleNumber = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;
const normalizeDecimal = (value) => String(Number(value));

const validateStyleValue = (key, value) => {
  if (typeof value !== 'string' || value.length > 80 || !noControl(value)) fail(`Invalid typography ${key}`);
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (key === 'fontFamily') { if (!fonts.has(trimmed)) fail('Choose a supported font family'); return trimmed; }
  if (key === 'color') { if (!/^#[0-9a-f]{6}$/i.test(trimmed)) fail('Font color must use a six-digit hex color'); return trimmed.toLowerCase(); }
  if (key === 'fontWeight') { if (!/^[1-9]00$/.test(trimmed)) fail('Font weight must be 100 through 900'); return trimmed; }
  const choices = {
    fontStyle: ['normal', 'italic'],
    textDecoration: ['none', 'underline', 'line-through'],
    textTransform: ['none', 'uppercase', 'lowercase', 'capitalize'],
  };
  if (Object.hasOwn(choices, key)) { if (!choices[key].includes(trimmed)) fail(`Invalid typography ${key}`); return trimmed; }
  if (key === 'lineHeight') {
    if (!simpleNumber.test(trimmed) || !Number.isFinite(Number(trimmed)) || Number(trimmed) < 0.8 || Number(trimmed) > 3) fail('Line height must be a number from 0.8 to 3');
    return normalizeDecimal(trimmed);
  }
  const match = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|rem|em)$/.exec(trimmed);
  if (!match || !Number.isFinite(Number(match[1]))) fail(`Invalid typography ${key} unit or value`);
  const amount = Number(match[1]); const unit = match[2];
  if (key === 'fontSize') {
    if ((unit !== 'px' && unit !== 'rem') || (unit === 'px' ? amount < 8 || amount > 160 : amount < 0.5 || amount > 10)) fail('Font size must be 8–160px or 0.5–10rem');
  } else if (key === 'letterSpacing') {
    // Relative-unit limits are calculated with a conventional 16px reference.
    const equivalent = amount * (unit === 'px' ? 1 : 16);
    if (equivalent < -2 || equivalent > 20) fail('Letter spacing must be -2–20px, -0.125–1.25rem/em');
  } else fail('Unsupported typography style');
  return `${normalizeDecimal(match[1])}${unit}`;
};
const styleFields = new Set(['fontFamily', 'fontSize', 'color', 'fontWeight', 'fontStyle', 'textDecoration', 'textTransform', 'lineHeight', 'letterSpacing']);

export function validateTypography(payload) {
  if (!object(payload)) fail('Typography settings must be an object');
  const title = payload.title ?? DEFAULT_TYPOGRAPHY.title;
  if (typeof title !== 'string' || !title.trim() || title.length > 300 || !noControl(title)) fail('Typography title must contain 1–300 characters');
  if (!Array.isArray(payload.rules) || payload.rules.length > MAX_TYPOGRAPHY_RULES) fail(`Typography accepts at most ${MAX_TYPOGRAPHY_RULES} rules`);
  const ids = new Set();
  const rules = payload.rules.map((rule) => {
    if (!object(rule) || Object.keys(rule).some((key) => !['id', 'page', 'target', 'text', 'style'].includes(key))) fail('Typography rules accept only id, page, target, text and style');
    if (typeof rule.id !== 'string' || !/^[a-z0-9_-]{1,64}$/i.test(rule.id) || ids.has(rule.id)) fail('Typography rules need unique valid IDs');
    ids.add(rule.id);
    if (typeof rule.page !== 'string' || rule.page.length > 500 || (rule.page !== '*' && !/^\/(?:[a-z0-9_-]+(?:\/[a-z0-9_-]+)*)?$/i.test(rule.page))) fail('Choose an exact public page path, or * for all pages');
    const firstSegment = rule.page.split('/')[1] || '';
    if (/^(?:admin|login|sign-?in|sign-?up|register|logout|auth|d16)/i.test(firstSegment)) fail('Typography applies to public pages only, without the /d16 base path');
    if (!targets.has(rule.target)) fail('Choose a supported typography target');
    const text = rule.text ?? '';
    if (typeof text !== 'string' || text.length > 300 || [...text].some((char) => (char.charCodeAt(0) < 32 && !['\t', '\n', '\r'].includes(char)) || char.charCodeAt(0) === 127)) fail('Exact text must contain at most 300 characters');
    if (!object(rule.style) || Object.keys(rule.style).some((key) => !styleFields.has(key))) fail('Typography accepts only supported font style fields');
    const style = {};
    for (const [key, value] of Object.entries(rule.style)) {
      const normalized = validateStyleValue(key, value);
      if (normalized !== undefined) style[key] = normalized;
    }
    return { id: rule.id, page: rule.page, target: rule.target, text: text.trim().replace(/\s+/g, ' '), style };
  });
  return { title: title.trim(), rules };
}
