import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, Plus, RefreshCw, RotateCcw, Save, Trash2, Type } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { useAuth } from '@/context/AuthContext';
import { createPageUrl } from '@/utils';
import { navigationPageChoices } from '@/data/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFAULT_TYPOGRAPHY, FONT_OPTIONS, TYPOGRAPHY_ID, TYPOGRAPHY_TARGETS, validateTypography } from '../../server/src/typographySchema.js';

const MAX_RULES = 200;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const selectClass = 'w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]';
const targetLabel = (value) => TYPOGRAPHY_TARGETS.find((target) => target.value === value)?.label || value;

function readSettings(records) {
  if (!Array.isArray(records) || records.length > 1) throw new Error('The saved typography settings could not be read safely. Nothing has been replaced.');
  if (!records.length) return { draft: structuredClone(DEFAULT_TYPOGRAPHY), record: null };
  const item = records[0];
  if (!item || item.id !== TYPOGRAPHY_ID || !Number.isSafeInteger(item.version) || item.version < 1) throw new Error('The saved typography identity or version is invalid. Reload before editing.');
  return { draft: validateTypography({ title: item.title, rules: item.rules }), record: { id: item.id, version: item.version } };
}

function Field({ label, help, children }) {
  const id = React.useId();
  return <div className="min-w-0 space-y-2"><label htmlFor={id} className="block text-sm font-medium text-gray-800">{label}</label>{React.cloneElement(children, { id, ...(help ? { 'aria-describedby': `${id}-help` } : {}) })}{help && <p id={`${id}-help`} className="text-xs leading-relaxed text-gray-600">{help}</p>}</div>;
}

function Choice({ label, value, onChange, options, help }) {
  return <Field label={label} help={help}><select className={selectClass} value={value || ''} onChange={(event) => onChange(event.target.value)}><option value="">Keep existing</option>{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></Field>;
}

function sampleStyle(rule) {
  try {
    const normalized = validateTypography({ title: DEFAULT_TYPOGRAPHY.title, rules: [rule] }).rules[0].style;
    return { ...normalized, ...(normalized.fontSize && !normalized.lineHeight ? { lineHeight: 'normal' } : {}), ...(normalized.fontFamily ? { fontFamily: FONT_OPTIONS.find((font) => font.value === normalized.fontFamily)?.family } : {}) };
  } catch { return {}; }
}

export default function AdminTypography() {
  const { user } = useAuth();
  return <TypographyEditor key={user?.id || 'signed-out'} userId={user?.id} />;
}

function TypographyEditor({ userId }) {
  const queryClient = useQueryClient();
  const [restored] = useState(() => userId ? queryClient.getQueryData(['typographyDraft', userId]) : null);
  const [draft, setDraft] = useState(() => restored ? structuredClone(restored.draft) : null);
  const [baseline, setBaseline] = useState(() => restored ? structuredClone(restored.baseline) : null);
  const [record, setRecord] = useState(() => restored ? structuredClone(restored.record) : null);
  const [selectedId, setSelectedId] = useState(() => restored?.draft?.rules?.[0]?.id || '');
  const [sizeUnits, setSizeUnits] = useState({});
  const [status, setStatus] = useState(restored ? 'Your unsaved text-style draft was restored. Review it before saving.' : '');
  const [saveError, setSaveError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [reloading, setReloading] = useState(false);
  const confirmationRef = useRef(null);
  const dirty = draft !== null && !same(draft, baseline);
  const query = useQuery({ queryKey: ['websiteTypography'], queryFn: () => base44.entities.WebsiteTypography.list() });
  const customPagesQuery = useQuery({ queryKey: ['customPages', 'admin'], queryFn: () => base44.entities.CustomPage.list({ admin: true }), staleTime: 30000 });
  const pageChoices = navigationPageChoices(Array.isArray(customPagesQuery.data) ? customPagesQuery.data : [], { includeDrafts: true });
  let saved = null;
  let loadError = query.error?.message || '';
  if (query.data !== undefined) {
    try {
      saved = readSettings(query.data);
      if (record && !saved.record) throw new Error('The saved settings are no longer available. Your draft has been kept.');
    } catch (error) { loadError = error.message; }
  }
  const remoteChanged = Boolean(record && saved?.record && record.version !== saved.record.version);
  const cacheDraft = useCallback((next, nextRecord, nextBaseline) => {
    const key = ['typographyDraft', userId];
    if (userId && next !== null && !same(next, nextBaseline)) {
      queryClient.setQueryDefaults(key, { gcTime: Infinity });
      queryClient.setQueryData(key, { draft: structuredClone(next), record: structuredClone(nextRecord), baseline: structuredClone(nextBaseline) });
    } else queryClient.removeQueries({ queryKey: key, exact: true });
  }, [queryClient, userId]);
  const acceptSaved = useCallback((next) => {
    cacheDraft(next.draft, next.record, next.draft);
    setDraft(next.draft); setBaseline(structuredClone(next.draft)); setRecord(next.record);
    setSelectedId((current) => next.draft.rules.some((rule) => rule.id === current) ? current : next.draft.rules[0]?.id || '');
  }, [cacheDraft]);
  const edit = (next) => {
    cacheDraft(next, record, baseline); setDraft(next); setSaveError(''); setStatus(''); setConfirmation(null);
  };
  const setRule = (id, change) => edit({ ...draft, rules: draft.rules.map((rule) => rule.id === id ? { ...rule, ...change } : rule) });
  const setStyle = (id, property, value) => {
    const rule = draft.rules.find((entry) => entry.id === id);
    const style = { ...rule.style };
    if (value === '') delete style[property]; else style[property] = value;
    setRule(id, { style });
  };
  const addRule = (source) => {
    if (draft.rules.length >= MAX_RULES) return;
    const next = source ? { ...structuredClone(source), id: crypto.randomUUID() } : { id: crypto.randomUUID(), page: '*', target: 'body', text: '', style: {} };
    edit({ ...draft, rules: [...draft.rules, next] }); setSelectedId(next.id);
  };
  const moveRule = (id, step) => {
    const index = draft.rules.findIndex((rule) => rule.id === id);
    const destination = index + step;
    if (index < 0 || destination < 0 || destination >= draft.rules.length) return;
    const rules = [...draft.rules]; [rules[index], rules[destination]] = [rules[destination], rules[index]];
    edit({ ...draft, rules });
  };
  const removeRule = (id) => {
    const index = draft.rules.findIndex((rule) => rule.id === id);
    const rules = draft.rules.filter((rule) => rule.id !== id);
    edit({ ...draft, rules });
    if (selectedId === id) setSelectedId(rules[Math.min(index, rules.length - 1)]?.id || '');
  };
  const save = useMutation({
    mutationFn: async ({ content, original }) => {
      const payload = validateTypography(content);
      const result = original?.id
        ? await base44.entities.WebsiteTypography.update(original.id, { ...payload, version: original.version })
        : await base44.entities.WebsiteTypography.create(payload);
      readSettings([result]); return result;
    },
    onSuccess: (result) => {
      acceptSaved(readSettings([result])); setSaveError(''); setConfirmation(null);
      queryClient.setQueryData(['websiteTypography'], [result]);
      queryClient.invalidateQueries({ queryKey: ['websiteTypography'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      window.dispatchEvent(new Event('d16-typography-refresh'));
      setStatus(IS_DEMO ? 'Text styles saved in this browser preview only. Open the public website to check them; other visitors and production are unchanged.' : 'Text styles saved for the public website and recorded in Change History. Preview the affected pages to check readability.');
    },
    onError: (error) => {
      setStatus('');
      setSaveError(error.status === 409 ? 'Another editor saved newer typography settings. Your draft is still here. Copy the changes you want to keep before choosing Reload Saved.' : `Could not save: ${error.message} Your draft is still here.`);
      if (error.status === 409) queryClient.invalidateQueries({ queryKey: ['websiteTypography'] });
    },
  });
  const busy = save.isPending || reloading;
  const savedSignature = saved ? JSON.stringify(saved) : '';
  useEffect(() => {
    if (!savedSignature || loadError || dirty || busy) return;
    const next = JSON.parse(savedSignature);
    if (!same(next.draft, baseline) || !same(next.record, record)) acceptSaved(next);
  }, [savedSignature, loadError, dirty, busy, baseline, record, acceptSaved]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);
  useEffect(() => {
    if (confirmation) { confirmationRef.current?.scrollIntoView({ block: 'nearest' }); confirmationRef.current?.focus({ preventScroll: true }); }
  }, [confirmation]);
  const reload = async () => {
    setReloading(true); setConfirmation(null); setSaveError(''); setStatus('');
    try {
      const result = await query.refetch();
      if (result.error) throw result.error;
      acceptSaved(readSettings(result.data)); setStatus('Saved text styles loaded.');
    } catch (error) { setSaveError(`Could not reload: ${error.message} Your draft has been kept.`); }
    finally { setReloading(false); }
  };
  const submit = (event) => {
    event.preventDefault();
    if (!draft || busy || loadError) return;
    setSaveError(''); setStatus(''); setConfirmation(null);
    try { validateTypography(draft); save.mutate({ content: structuredClone(draft), original: record }); }
    catch (error) { setSaveError(error.message); }
  };
  const selected = draft?.rules.find((rule) => rule.id === selectedId);
  const sizeMatch = selected?.style.fontSize?.match(/^([\d.]+)(px|rem)$/);
  const sizeUnit = sizeMatch?.[2] || sizeUnits[selectedId] || 'px';
  const sample = selected?.text || ({ navigation: 'About Us', button: 'Get a Quote', title: 'Create a space you love', heading: 'Our approach', 'card-title': 'Master Bedroom', small: 'Thoughtful details, beautifully finished', link: 'Explore our designs' }[selected?.target] || 'Beautiful interiors, designed around you.');
  const rulePageLabel = (rule) => rule.page === '*' ? 'Entire website' : pageChoices.find((page) => page.path === rule.page)?.label || rule.page || 'Choose a page';

  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-7xl px-4 sm:px-6">
    <div className="mb-6 flex items-start gap-4"><Link to={createPageUrl('AdminDashboard')} onClick={(event) => { if (busy || (dirty && !window.confirm('You have unsaved text styles. Go back to the dashboard? Your draft stays in this signed-in session until you reload or sign out.'))) event.preventDefault(); }} className="shrink-0 rounded-md border bg-white p-3 text-[var(--primary)]" aria-label="Back to dashboard"><ArrowLeft size={20} /></Link><div><h1 className="text-3xl font-bold text-[var(--primary)]">Fonts &amp; Text Styles</h1><p className="mt-2 max-w-3xl text-gray-600">Choose fonts, sizes, colors and styles for website tabs, buttons, titles, descriptions and other text. The dashboard keeps its own readable styling.</p></div></div>
    {IS_DEMO ? <p className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Browser preview: saved changes stay in this browser only. Other visitors and DianaHost production will not see your test changes.</p> : <p className="mb-5 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">Saved styles are shared through this website’s database. Changes apply to public pages, not the admin dashboard.</p>}
    <div className="mb-5 rounded-xl border bg-white p-4 text-sm leading-relaxed text-gray-600"><p><strong className="text-gray-800">Start simple:</strong> Add a style, choose where it applies, change only the settings you need, then save and preview. “Keep existing” leaves the current design unchanged.</p><p className="mt-2">Page-specific styles override site-wide styles. An exact text match is strongest. More specific text types override “All text”; for otherwise matching styles, the lower rule wins. A page rule affects only that exact page, not its detail pages.</p></div>
    {query.isPending && <p role="status" className="mb-5">Loading text styles…</p>}
    {loadError && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800"><p>Could not load typography settings: {loadError} Saving is disabled to protect the saved styles.</p><Button type="button" variant="outline" disabled={busy} className="mt-3" onClick={() => query.refetch()}>Retry Loading</Button></div>}
    {status && <p role="status" className="mb-5 rounded-lg bg-green-50 p-4 text-green-800">{status}</p>}
    {saveError && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800">{saveError}</p>}
    {remoteChanged && <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4 text-amber-900">Saved styles changed since you opened this draft. Your edits have been kept. Reload Saved to load the newer version.</p>}
    {confirmation && <section ref={confirmationRef} tabIndex={-1} role="alertdialog" aria-labelledby="typography-confirm-title" aria-describedby="typography-confirm-description" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4"><h2 id="typography-confirm-title" className="font-semibold">{confirmation === 'reset' ? 'Remove every custom text style from this draft?' : 'Discard your unsaved text-style changes?'}</h2><p id="typography-confirm-description" className="mt-2 text-sm">{confirmation === 'reset' ? 'The original website styling will return only after you save. This does not delete page content, photos or navigation tabs.' : 'Reload Saved will replace this draft with the latest saved settings. It will not change the public website.'}</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" disabled={busy} onClick={() => confirmation === 'reload' ? reload() : (edit({ ...draft, rules: [] }), setSelectedId(''))}>{confirmation === 'reset' ? 'Clear Draft Styles' : 'Discard Draft & Reload'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>Keep Editing</Button></div></section>}
    {draft && <form onSubmit={submit} noValidate aria-label="Website typography settings"><fieldset disabled={busy || Boolean(loadError)} className="min-w-0 space-y-6">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
        <Card className="min-w-0 self-start"><CardHeader><CardTitle>Your text styles</CardTitle><p className="text-sm text-gray-600">{draft.rules.length} {draft.rules.length === 1 ? 'style' : 'styles'} · changes apply after saving</p></CardHeader><CardContent className="space-y-3">
          {draft.rules.length === 0 && <div className="rounded-lg bg-gray-50 p-5 text-sm text-gray-600"><Type className="mb-3 text-gray-400" size={26} /><p>No custom styles yet. Your original website design is unchanged.</p></div>}
          <ol className="space-y-3" aria-label="Text style order">{draft.rules.map((rule, index) => <li key={rule.id} className={`rounded-lg border p-3 ${selectedId === rule.id ? 'border-[var(--accent)] bg-amber-50/50' : 'bg-white'}`}><button type="button" className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" aria-pressed={selectedId === rule.id} onClick={() => setSelectedId(rule.id)}><span className="block text-sm font-semibold text-gray-900">{index + 1}. {targetLabel(rule.target)}</span><span className="mt-1 block break-words text-xs text-gray-600">{rulePageLabel(rule)}</span>{rule.text && <span className="mt-1 block break-words text-xs text-gray-600">“{rule.text}”</span>}</button><div className="mt-3 flex gap-2"><Button type="button" size="sm" variant="outline" disabled={index === 0} aria-label={`Move style ${index + 1} up`} onClick={() => moveRule(rule.id, -1)}><ArrowUp size={14} /></Button><Button type="button" size="sm" variant="outline" disabled={index === draft.rules.length - 1} aria-label={`Move style ${index + 1} down`} onClick={() => moveRule(rule.id, 1)}><ArrowDown size={14} /></Button><Button type="button" size="sm" variant="outline" aria-label={`Duplicate style ${index + 1}`} disabled={draft.rules.length >= MAX_RULES} onClick={() => addRule(rule)}><Copy size={14} /></Button><Button type="button" size="sm" variant="outline" aria-label={`Remove style ${index + 1}`} onClick={() => removeRule(rule.id)}><Trash2 size={14} /></Button></div></li>)}</ol>
          <Button type="button" variant="outline" className="w-full" disabled={draft.rules.length >= MAX_RULES} onClick={() => addRule()}><Plus size={17} className="mr-2" />Add Text Style</Button>
          {draft.rules.length >= MAX_RULES && <p className="text-xs text-gray-600">The safety limit is {MAX_RULES} styles. Edit or remove an existing style to add another.</p>}
        </CardContent></Card>
        <div className="min-w-0 space-y-6">{selected ? <>
          <Card><CardHeader><CardTitle>Where should this style apply?</CardTitle></CardHeader><CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2"><Field label="Page"><select className={selectClass} value={selected.page === '*' || pageChoices.some((page) => page.path === selected.page) ? selected.page : '__custom__'} onChange={(event) => setRule(selected.id, { page: event.target.value === '__custom__' ? '' : event.target.value })}><option value="*">Entire website</option>{pageChoices.map((page) => <option key={page.path} value={page.path}>{page.label}{page.custom && !page.published ? ' (draft)' : ''}</option>)}<option value="__custom__">Specific page path…</option></select></Field><Field label="Text type"><select className={selectClass} value={selected.target} onChange={(event) => setRule(selected.id, { target: event.target.value })}>{TYPOGRAPHY_TARGETS.map((target) => <option key={target.value} value={target.value}>{target.label}</option>)}</select></Field></div>
            {selected.page !== '*' && !pageChoices.some((page) => page.path === selected.page) && <Field label="Specific page path" help="Use the exact path after /d16, starting with /. Example: /PicYourConcept/bed-room. Do not include a domain, /d16, query string or # fragment."><Input value={selected.page} maxLength={500} placeholder="/PicYourConcept/bed-room" onChange={(event) => setRule(selected.id, { page: event.target.value })} /></Field>}
            {customPagesQuery.isError && <p className="text-xs text-amber-800">Custom page suggestions could not load. You can still enter an exact page path.</p>}
            <Field label="Only text that says… (optional)" help="Leave blank to style all text of the selected type. Enter the full visible text to target a title or button. Matching ignores letter case and extra spaces; repeated matches are all styled. If you rename that text later, update this match too."><Input value={selected.text} maxLength={300} placeholder="For example: Get a Quote" onChange={(event) => setRule(selected.id, { text: event.target.value })} /></Field>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Font &amp; appearance</CardTitle><p className="text-sm text-gray-600">Empty settings keep the existing design. Font settings change text, not button backgrounds or content.</p></CardHeader><CardContent className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2"><Choice label="Font family" value={selected.style.fontFamily} onChange={(value) => setStyle(selected.id, 'fontFamily', value)} options={FONT_OPTIONS.map((font) => [font.value, font.label])} /><div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2"><Field label="Font size" help={sizeUnit === 'px' ? '8–160 px; blank keeps existing.' : '0.5–10 rem; 1 rem is usually 16 px.'}><Input type="number" min={sizeUnit === 'px' ? 8 : 0.5} max={sizeUnit === 'px' ? 160 : 10} step="0.1" value={sizeMatch?.[1] || ''} placeholder={sizeUnit === 'px' ? '16' : '1.5'} onChange={(event) => setStyle(selected.id, 'fontSize', event.target.value ? `${event.target.value}${sizeUnit}` : '')} /></Field><Field label="Unit"><select className={selectClass} value={sizeUnit} onChange={(event) => { const unit = event.target.value; setSizeUnits((old) => ({ ...old, [selected.id]: unit })); if (sizeMatch) setStyle(selected.id, 'fontSize', `${sizeMatch[1]}${unit}`); }}><option value="px">px</option><option value="rem">rem</option></select></Field></div></div>
            <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Field label="Font color" help="Use a six-digit color such as #1F2937. Blank keeps existing."><Input value={selected.style.color || ''} maxLength={7} placeholder="#1F2937" onChange={(event) => setStyle(selected.id, 'color', event.target.value)} /></Field><div className="flex items-center gap-3"><input type="color" aria-label="Pick font color" className="h-10 w-14 cursor-pointer rounded border bg-white p-1" value={/^#[\da-f]{6}$/i.test(selected.style.color || '') ? selected.style.color : '#1f2937'} onChange={(event) => setStyle(selected.id, 'color', event.target.value)} /><Button type="button" size="sm" variant="outline" disabled={!selected.style.color} onClick={() => setStyle(selected.id, 'color', '')}>Keep Existing Color</Button></div></div><Choice label="Font weight" value={selected.style.fontWeight} onChange={(value) => setStyle(selected.id, 'fontWeight', value)} options={[['100', '100 — Thin'], ['200', '200 — Extra light'], ['300', '300 — Light'], ['400', '400 — Regular'], ['500', '500 — Medium'], ['600', '600 — Semibold'], ['700', '700 — Bold'], ['800', '800 — Extra bold'], ['900', '900 — Black']]} help="Some fonts may not include every weight; the browser uses the closest available style." /></div>
            <div className="grid gap-5 sm:grid-cols-3"><Choice label="Font style" value={selected.style.fontStyle} onChange={(value) => setStyle(selected.id, 'fontStyle', value)} options={[["normal", 'Normal'], ['italic', 'Italic']]} /><Choice label="Decoration" value={selected.style.textDecoration} onChange={(value) => setStyle(selected.id, 'textDecoration', value)} options={[["none", 'None'], ['underline', 'Underline'], ['line-through', 'Strikethrough']]} /><Choice label="Letter case" value={selected.style.textTransform} onChange={(value) => setStyle(selected.id, 'textTransform', value)} options={[["none", 'Original case'], ['uppercase', 'UPPERCASE'], ['lowercase', 'lowercase'], ['capitalize', 'Capitalize words']]} /></div>
            <div className="grid gap-5 sm:grid-cols-2"><Field label="Line height (optional)" help="0.8–3 times the font size. For paragraphs, start around 1.5."><Input type="number" min="0.8" max="3" step="0.1" value={selected.style.lineHeight || ''} placeholder="1.5" onChange={(event) => setStyle(selected.id, 'lineHeight', event.target.value)} /></Field><Field label="Letter spacing (optional)" help="Include a unit, for example 0.5px or 0.02em. Blank keeps existing."><Input value={selected.style.letterSpacing || ''} maxLength={20} placeholder="0.5px" onChange={(event) => setStyle(selected.id, 'letterSpacing', event.target.value)} /></Field></div>
            <Button type="button" size="sm" variant="outline" onClick={() => setRule(selected.id, { style: {} })}><RotateCcw size={15} className="mr-2" />Clear This Style’s Appearance</Button>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Sample preview</CardTitle><p className="text-sm text-gray-600">A sample of this rule only—not a preview of every overlapping rule or the page layout.</p></CardHeader><CardContent className="space-y-4"><div className="grid min-w-0 gap-4 sm:grid-cols-2"><div className="min-w-0 rounded-lg border bg-white p-4"><p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">On a light background</p><p className="min-w-0 break-words text-gray-900" style={sampleStyle(selected)}>{sample}</p></div><div className="min-w-0 rounded-lg bg-slate-900 p-4"><p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-300">On a dark background</p><p className="min-w-0 break-words text-white" style={sampleStyle(selected)}>{sample}</p></div></div><p className="text-sm text-amber-900">Check readability on both backgrounds and on mobile. Very small text, low color contrast or large navigation text can make the website hard to use. Incomplete or invalid settings are not applied to this sample.</p><Link to={selected.page && selected.page !== '*' ? selected.page : '/'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] underline"><ExternalLink size={16} />Open public page (saved styles)</Link></CardContent></Card>
        </> : <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed bg-white p-8 text-center"><Type size={40} className="mb-4 text-gray-400" /><h2 className="text-xl font-semibold text-gray-900">Make the website’s text your own</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-gray-600">Start with “Entire website → All text” for a common font, or choose a page and a text type for a smaller change. You can add separate styles for individual titles and buttons.</p><Button type="button" className="mt-5" onClick={() => addRule()}><Plus size={17} className="mr-2" />Add Your First Text Style</Button></div>}</div>
      </div>
      <div className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center gap-3"><Button type="submit"><Save size={17} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Text Styles'}</Button><Button type="button" variant="outline" onClick={() => dirty ? setConfirmation('reload') : reload()}><RefreshCw size={17} className="mr-2" />Reload Saved</Button><Button type="button" variant="outline" disabled={draft.rules.length === 0} onClick={() => setConfirmation('reset')}><RotateCcw size={17} className="mr-2" />Reset All Styles</Button><span className="text-sm text-gray-600">{dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</span></div><p className="mt-3 text-xs text-gray-600">Unsaved edits stay in this signed-in session while you navigate. Reloading the browser or signing out discards unsaved edits.</p></div>
    </fieldset></form>}
  </div></div>;
}
