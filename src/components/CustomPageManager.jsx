import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ExternalLink, FilePlus2, Plus, Save, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PAGE_TYPES, createCustomPage, getCustomPagePath, isPublishedCustomPage, validateCustomPage } from '../../server/src/customPageSchema.js';

const ADMIN_KEY = ['customPages', 'admin'];
const TYPE_FIELDS = {
  landing: { plural: 'Feature sections', single: 'feature section', title: 'Section heading', text: 'Section text', meta: 'Short highlight', image: true },
  standard: { plural: 'Content sections', single: 'content section', title: 'Section heading', text: 'Section text', meta: 'Subtitle', image: true },
  services: { plural: 'Service cards', single: 'service', title: 'Service name', text: 'Service description', meta: 'Short detail or price label', image: true },
  portfolio: { plural: 'Project cards', single: 'project', title: 'Project title', text: 'Project description', meta: 'Location or category', image: true },
  concepts: { plural: 'Design concepts', single: 'design concept', title: 'Concept title', text: 'Concept description', meta: 'Style or category', image: true },
  gallery: { plural: 'Gallery images', single: 'gallery image', title: 'Image title / alternative text', text: 'Image caption', meta: 'Category', image: true },
  blog: { plural: 'News entries', single: 'news entry', title: 'Entry title', text: 'Entry text', meta: 'Author or date label', image: true },
  contact: { plural: 'Public contact details', single: 'contact detail', title: 'Detail label (for example, Office)', text: 'Public contact information', meta: 'Opening hours or extra detail', image: true },
  faq: { plural: 'Questions and answers', single: 'question', title: 'Question', text: 'Answer', meta: 'Topic', image: false },
  team: { plural: 'Team members', single: 'team member', title: 'Name', text: 'Biography', meta: 'Role', image: true },
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const clone = (value) => structuredClone(value);
const contentOf = (record) => validateCustomPage(record, { allowDataImages: IS_DEMO });
const readPages = (records) => {
  if (!Array.isArray(records)) throw new Error('The saved pages could not be read.');
  return records.map((page) => {
    if (!page || typeof page.id !== 'string' || !page.id) throw new Error('A saved page has an invalid identity.');
    getCustomPagePath(page);
    return { ...page, ...contentOf(page) };
  });
};

// Use the shared content validator before placing a user-provided address in an
// image tag. No raw HTML, SVG data, executable URLs or embedded forms are used.
function imagePreview(value) {
  if (!value) return '';
  try {
    validateCustomPage({ ...createCustomPage('standard'), title: 'Image preview', hero_image: value }, { allowDataImages: IS_DEMO });
    return value;
  } catch { return ''; }
}

function TextField({ label, value, onChange, multiline = false, required = false, maxLength = 300, rows = 4 }) {
  const id = React.useId();
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium text-gray-800">{label}</label>{multiline
    ? <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} rows={rows} />
    : <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} />}</div>;
}

function ImageField({ label, value, onChange, onUpload }) {
  const id = React.useId();
  const preview = imagePreview(value);
  return <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
    <label htmlFor={id} className="block text-sm font-medium text-gray-800">{label} — image address</label>
    {value.startsWith('data:') ? <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-gray-600">Uploaded image stored in this browser preview.</p><Button type="button" size="sm" variant="outline" onClick={() => onChange('')}>Remove Image</Button></div>
      : <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={2048} placeholder="https://… or /uploads/…" />}
    <label htmlFor={`${id}-upload`} className="block text-sm text-gray-600">Or upload JPG, PNG or WebP, up to {IS_DEMO ? '500 KB' : '5 MB'}</label>
    <input id={`${id}-upload`} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full min-w-0 text-sm" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file); }} />
    {preview && <img src={preview} alt={`${label} preview`} className="max-h-40 max-w-full rounded-lg object-contain" />}
    {value && !preview && <p className="text-sm text-red-700">This image address is not supported. Use a secure image address or upload a raster image.</p>}
  </div>;
}

export default function CustomPageManager({ onAddToMenu, menuPages = [], newPageRequest = null }) {
  const { user } = useAuth();
  return <PageManager key={user?.id || 'signed-out'} userId={user?.id} onAddToMenu={onAddToMenu} menuPages={menuPages} newPageRequest={newPageRequest} />;
}

function PageManager({ userId, onAddToMenu, menuPages, newPageRequest }) {
  const queryClient = useQueryClient();
  const [restored] = useState(() => userId ? queryClient.getQueryData(['customPageDraft', userId]) : null);
  const [draft, setDraft] = useState(() => restored ? clone(restored.draft) : null);
  const [record, setRecord] = useState(() => restored ? clone(restored.record) : null);
  const [baseline, setBaseline] = useState(() => restored ? clone(restored.baseline) : null);
  const [newType, setNewType] = useState('standard');
  const [status, setStatus] = useState(restored ? 'Your unsaved page draft was restored. Review it before saving.' : '');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState('');
  const [reloading, setReloading] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const editorRef = useRef(null);
  const confirmRef = useRef(null);
  const mounted = useRef(true);
  const seenNewPageRequests = useRef(new Set());
  const pendingNewPageRequests = useRef([]);
  const dirty = draft !== null && !same(draft, baseline);
  const query = useQuery({ queryKey: ADMIN_KEY, queryFn: async () => readPages(await base44.entities.CustomPage.list({ admin: true })), staleTime: 30000 });
  let pages = [];
  let loadError = query.error?.message || '';
  if (query.data !== undefined) {
    try { pages = readPages(query.data); }
    catch (failure) { loadError = failure.message; }
  }
  const currentSaved = record ? pages.find((page) => page.id === record.id) : null;
  const remoteChanged = Boolean(record && query.isSuccess && !loadError && (!currentSaved || currentSaved.version !== record.version));

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useEffect(() => {
    if (confirmation) {
      confirmRef.current?.scrollIntoView({ block: 'nearest' });
      confirmRef.current?.focus({ preventScroll: true });
    }
  }, [confirmation]);

  const cacheDraft = useCallback((next, nextRecord = record, nextBaseline = baseline) => {
    const key = ['customPageDraft', userId];
    if (userId && next !== null && !same(next, nextBaseline)) {
      queryClient.setQueryDefaults(key, { gcTime: Infinity });
      queryClient.setQueryData(key, { draft: clone(next), record: clone(nextRecord), baseline: clone(nextBaseline) });
    } else queryClient.removeQueries({ queryKey: key, exact: true });
  }, [userId, queryClient, record, baseline]);
  const clearNotice = useCallback(() => { setError(''); setStatus(''); setConfirmation(null); }, []);
  const selectDraft = useCallback((next, nextRecord, nextBaseline) => {
    cacheDraft(next, nextRecord, nextBaseline);
    setDraft(next); setRecord(nextRecord); setBaseline(nextBaseline); clearNotice();
    requestAnimationFrame(() => { editorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); editorRef.current?.focus({ preventScroll: true }); });
  }, [cacheDraft, clearNotice]);
  const performAction = useCallback((action) => {
    if (action.kind === 'new') selectDraft(createCustomPage(action.pageType), null, null);
    if (action.kind === 'edit') { const next = contentOf(action.page); selectDraft(next, action.page, clone(next)); }
    if (action.kind === 'close') selectDraft(null, null, null);
  }, [selectDraft]);
  const changeDraft = (next, message = '') => {
    cacheDraft(next); setDraft(next); clearNotice(); setStatus(message);
  };
  const edit = (key, value) => { if (!busy) changeDraft({ ...draft, [key]: value }); };
  const editItem = (id, key, value) => edit('items', draft.items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  const moveItem = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= draft.items.length) return;
    const items = [...draft.items];
    [items[index], items[target]] = [items[target], items[index]];
    edit('items', items);
  };

  const save = useMutation({
    mutationFn: async ({ content, original }) => {
      const payload = validateCustomPage(content, { allowDataImages: IS_DEMO });
      const result = original?.id
        ? await base44.entities.CustomPage.update(original.id, { ...payload, version: original.version })
        : await base44.entities.CustomPage.create(payload);
      readPages([result]);
      return result;
    },
    onSuccess: (saved) => {
      const next = contentOf(saved);
      cacheDraft(next, saved, next); setRecord(saved); setDraft(next); setBaseline(clone(next)); setError(''); setConfirmation(null);
      queryClient.setQueryData(ADMIN_KEY, (old = []) => [...old.filter((page) => page.id !== saved.id), saved]);
      queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
      queryClient.invalidateQueries({ queryKey: ['customPages', 'public'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      setStatus(`${saved.published ? 'Page saved and published. Use Add to Menu below, then Save Tabs to include it in navigation.' : 'Page saved as a draft. Select Make this page public and Save Page when it is ready.'}${IS_DEMO ? ' This preview is saved only in this browser; it does not change the live website.' : ''}`);
    },
    onError: (failure) => {
      setStatus('');
      setError(failure.status === 409
        ? 'Another editor saved a newer page. Your draft is still here. Copy the changes you need before selecting Reload Saved.'
        : `Could not save page: ${failure.message} Your draft is still here.`);
      if (failure.status === 409) queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    },
  });
  const busy = save.isPending || Boolean(uploading) || reloading;
  const requestAction = useCallback((action) => {
    if (busy) return;
    if (dirty) setConfirmation(action);
    else performAction(action);
  }, [busy, dirty, performAction]);
  // Add Tab may request a page while a save/upload is still finishing. Keep
  // every distinct request until the editor is ready, and use the same draft
  // confirmation as Create New Page instead of replacing unsaved content.
  useEffect(() => {
    if (typeof newPageRequest?.id === 'string' && newPageRequest.id && !seenNewPageRequests.current.has(newPageRequest.id)) {
      seenNewPageRequests.current.add(newPageRequest.id);
      pendingNewPageRequests.current.push({ kind: 'new', pageType: newPageRequest.pageType });
    }
    if (busy || query.isPending || loadError || confirmation || pendingNewPageRequests.current.length === 0) return;
    const action = pendingNewPageRequests.current.shift();
    if (!PAGE_TYPES.some((type) => type.value === action.pageType)) {
      setError('Choose a supported page type, then select Add Tab again.');
      return;
    }
    setNewType(action.pageType);
    requestAction(action);
  }, [newPageRequest, busy, query.isPending, loadError, confirmation, requestAction]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);

  const upload = async (file, label, apply) => {
    if (busy) return;
    clearNotice();
    const limit = (IS_DEMO ? 500 * 1024 : 5 * 1024 * 1024);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > limit || file.size === 0) {
      setError(`Choose a non-empty JPG, PNG or WebP image no larger than ${IS_DEMO ? '500 KB' : '5 MB'}.`); return;
    }
    setUploading(label);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (!result?.file_url || !imagePreview(result.file_url)) throw new Error('The upload did not return a supported image.');
      if (mounted.current) apply(result.file_url);
    } catch (failure) { if (mounted.current) setError(`Image upload failed: ${failure.message}`); }
    finally { if (mounted.current) setUploading(''); }
  };
  const reload = async () => {
    setConfirmation(null); setReloading(true); setError(''); setStatus('');
    try {
      const result = await query.refetch();
      if (result.error) throw result.error;
      const saved = readPages(result.data).find((page) => page.id === record?.id);
      if (!saved) throw new Error('The saved page is no longer available. Your draft has been kept.');
      const next = contentOf(saved); selectDraft(next, saved, clone(next)); setStatus('Saved page loaded.');
    } catch (failure) { setError(failure.message); }
    finally { setReloading(false); }
  };
  const submit = (event) => {
    event.preventDefault();
    if (busy || !draft || loadError) return;
    clearNotice();
    try { save.mutate({ content: validateCustomPage(draft, { allowDataImages: IS_DEMO }), original: record }); }
    catch (failure) { setError(failure.message); }
  };
  const inMenu = (page) => menuPages.includes(`custom:${page.id}`);
  const addToMenu = (page) => {
    if (busy || !isPublishedCustomPage(page) || inMenu(page)) return;
    if (onAddToMenu(page) === false) {
      setStatus(''); setError('This page could not be added to the menu draft. Check the menu message above and try again.'); return;
    }
    setStatus(`${page.title} was added to your menu draft. Select Save Tabs below to finish adding the tab.`);
  };
  const typeInfo = PAGE_TYPES.find((type) => type.value === draft?.page_type);
  const fields = TYPE_FIELDS[draft?.page_type] || TYPE_FIELDS.standard;
  const image = (key, label) => <ImageField label={label} value={draft[key]} onChange={(value) => edit(key, value)} onUpload={(file) => upload(file, label, (value) => changeDraft({ ...draft, [key]: value }))} />;

  return <section aria-labelledby="custom-pages-title" className="mb-8 space-y-5 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6">
    <div><h2 id="custom-pages-title" className="text-xl font-bold text-[var(--primary)]">Create and Edit Pages</h2><p className="mt-2 text-sm text-gray-600">Create a brand-new page, choose its layout, then add it as a website tab. This editor is separate from the menu below.</p></div>
    <div className="rounded-xl border bg-gray-50 p-4"><label htmlFor="custom-page-new-type" className="mb-2 block text-sm font-medium text-gray-800">Which type of page would you like?</label><div className="flex flex-wrap items-start gap-3"><select id="custom-page-new-type" value={newType} disabled={busy} onChange={(event) => setNewType(event.target.value)} className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">{PAGE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><Button type="button" disabled={busy || Boolean(loadError) || query.isPending} onClick={() => requestAction({ kind: 'new', pageType: newType })}><FilePlus2 size={17} className="mr-2" />Create New Page</Button></div><p className="mt-3 text-sm text-gray-600">{PAGE_TYPES.find((type) => type.value === newType)?.description}</p><p className="mt-2 text-xs text-gray-500">Templates create separate editable pages; they do not copy or change your existing Home, About, Services or other pages.</p></div>
    {IS_DEMO && <p className="text-sm text-amber-800">Browser preview: pages and uploaded images are saved only in this browser. Other visitors will not see your test pages.</p>}
    {query.isPending && <p role="status" className="text-sm text-gray-600">Loading your custom pages…</p>}
    {loadError && <div role="alert" className="rounded-lg bg-red-50 p-4 text-red-800"><p>Could not load your pages: {loadError} No saved content has been replaced.</p><Button type="button" variant="outline" className="mt-3" disabled={busy} onClick={() => query.refetch()}>Retry Loading Pages</Button></div>}
    {confirmation && <section ref={confirmRef} tabIndex={-1} role="alertdialog" aria-labelledby="custom-page-confirm-title" aria-describedby="custom-page-confirm-description" className="rounded-xl border border-amber-300 bg-amber-50 p-4"><h3 id="custom-page-confirm-title" className="font-semibold text-amber-950">Discard your unsaved page changes?</h3><p id="custom-page-confirm-description" className="mt-2 text-sm text-amber-900">Your current page draft will be discarded. Previously saved pages will not change.</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" disabled={busy} onClick={() => confirmation.kind === 'reload' ? reload() : performAction(confirmation)}>Discard Draft & Continue</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>Keep Editing Page</Button></div></section>}
    {status && <p role="status" aria-live="polite" className="rounded-lg bg-green-50 p-4 text-sm text-green-800">{status}</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {uploading && <p role="status" className="text-sm text-gray-700">Uploading {uploading}… Keep this editor open until the upload finishes.</p>}
    {remoteChanged && <p role="status" className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">This page has changed since you opened it. Your draft has been kept. Reload Saved to use the latest version.</p>}
    {draft && <form onSubmit={submit} aria-label="Custom page editor"><fieldset disabled={busy || Boolean(loadError)} className="space-y-5">
      <div ref={editorRef} tabIndex={-1} className="rounded-xl border-l-4 border-[var(--accent)] bg-gray-50 p-4"><h3 className="font-semibold text-[var(--primary)]">{record ? `Editing: ${record.title}` : 'New page draft'}</h3><p className="mt-2 text-sm text-gray-600">{typeInfo?.description}</p><p className="mt-2 text-xs text-gray-500">Unsaved edits stay in this signed-in session while you navigate. Reloading or signing out discards unsaved edits.</p></div>
      <div><label htmlFor="custom-page-editor-type" className="mb-2 block text-sm font-medium text-gray-800">Page layout</label><select id="custom-page-editor-type" value={draft.page_type} onChange={(event) => changeDraft({ ...draft, page_type: event.target.value }, 'Layout changed in your draft. All text, images and items have been kept; review the field labels before saving.')} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">{PAGE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><p className="mt-2 text-xs text-gray-500">Changing the layout preserves your content and items.</p></div>
      <TextField label="Page title" value={draft.title} onChange={(value) => edit('title', value)} required maxLength={120} />
      <TextField label="Introduction / subtitle" value={draft.intro} onChange={(value) => edit('intro', value)} multiline maxLength={2000} rows={3} />
      <TextField label="Main page text" value={draft.body} onChange={(value) => edit('body', value)} multiline maxLength={20000} rows={6} />
      <p className="text-xs text-gray-500">Text is displayed safely as plain text with line breaks. HTML code and embedded forms are not supported.</p>
      {draft.page_type === 'contact' && <p className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">Use only contact information approved for public display. This template does not create a form or collect personal messages.</p>}
      {image('hero_image', 'Page header image (optional)')}
      <section className="space-y-4" aria-labelledby="custom-page-items-title"><div className="flex flex-wrap items-center justify-between gap-3"><h4 id="custom-page-items-title" className="font-semibold text-[var(--primary)]">{fields.plural} ({draft.items.length}/40)</h4><Button type="button" variant="outline" disabled={draft.items.length >= 40} onClick={() => edit('items', [...draft.items, { id: crypto.randomUUID(), title: '', text: '', image: '', meta: '' }])}><Plus size={16} className="mr-2" />Add {fields.single}</Button></div>
        {draft.items.length === 0 && <p className="text-sm text-gray-600">No items yet. Add an item above, or keep this page as title, text and header image only.</p>}
        {draft.items.map((item, index) => <section key={item.id} className="space-y-4 rounded-xl border bg-gray-50 p-4" aria-label={`${fields.single} ${index + 1}`}><div className="flex flex-wrap items-center justify-between gap-3"><h5 className="font-medium text-gray-800">{index + 1}. {item.title || `New ${fields.single}`}</h5><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={index === 0} aria-label={`Move item ${index + 1} up`} onClick={() => moveItem(index, -1)}><ArrowUp size={15} /><span className="ml-1">Up</span></Button><Button type="button" variant="outline" size="sm" disabled={index === draft.items.length - 1} aria-label={`Move item ${index + 1} down`} onClick={() => moveItem(index, 1)}><ArrowDown size={15} /><span className="ml-1">Down</span></Button><Button type="button" variant="outline" size="sm" aria-label={`Remove item ${index + 1} from draft`} onClick={() => edit('items', draft.items.filter((entry) => entry.id !== item.id))}><Trash2 size={15} /><span className="ml-1">Remove</span></Button></div></div>
          <TextField label={`${fields.title} ${index + 1}`} value={item.title} onChange={(value) => editItem(item.id, 'title', value)} required maxLength={120} />
          <TextField label={`${fields.text} ${index + 1}`} value={item.text} onChange={(value) => editItem(item.id, 'text', value)} multiline maxLength={10000} />
          <TextField label={`${fields.meta} ${index + 1} (optional)`} value={item.meta} onChange={(value) => editItem(item.id, 'meta', value)} maxLength={300} />
          {(fields.image || item.image) && <ImageField label={`Item ${index + 1} image (optional)`} value={item.image} onChange={(value) => editItem(item.id, 'image', value)} onUpload={(file) => upload(file, `item ${index + 1} image`, (value) => changeDraft({ ...draft, items: draft.items.map((entry) => entry.id === item.id ? { ...entry, image: value } : entry) }))} />}
        </section>)}
      </section>
      <div className="rounded-xl border p-4"><label className="inline-flex items-start gap-3 text-sm font-medium text-gray-800"><input type="checkbox" checked={draft.published} onChange={(event) => edit('published', event.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" /><span>Make this page public when I save</span></label><p className="mt-2 text-sm text-gray-600">Unchecked pages are drafts and unavailable at their public address. Unpublishing keeps the content for later and hides its menu link; republishing restores that link. New published pages still need Add to Menu and Save Tabs.</p></div>
      <div className="flex flex-wrap items-center gap-3"><Button type="submit"><Save size={16} className="mr-2" />{save.isPending ? 'Saving Page…' : 'Save Page'}</Button>{record && <Button type="button" variant="outline" onClick={() => dirty ? setConfirmation({ kind: 'reload' }) : reload()}>Reload Saved</Button>}<Button type="button" variant="outline" onClick={() => requestAction({ kind: 'close' })}>{dirty ? 'Discard Page Draft' : 'Close Page Editor'}</Button><span className="text-sm text-gray-600">{dirty ? 'Unsaved page changes' : 'Page saved'}</span></div>
      {record && isPublishedCustomPage(record) && <div className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-50 p-4"><Button type="button" variant="outline" disabled={inMenu(record)} onClick={() => addToMenu(record)}><Plus size={16} className="mr-2" />{inMenu(record) ? 'Already in Menu Draft' : 'Add to Menu'}</Button><Link to={getCustomPagePath(record)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] underline">View saved page <ExternalLink size={15} /></Link>{dirty && <span className="text-xs text-gray-600">These actions use the last saved page, not unsaved edits.</span>}</div>}
    </fieldset></form>}
    <section aria-labelledby="custom-pages-saved-title" className="border-t pt-5"><h3 id="custom-pages-saved-title" className="font-semibold text-[var(--primary)]">Your custom pages ({pages.length})</h3>{pages.length === 0 && !query.isPending && !loadError && <p className="mt-3 text-sm text-gray-600">No custom pages yet. Choose a type above and select Create New Page.</p>}<ul className="mt-3 space-y-3">{pages.map((page) => <li key={page.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div className="min-w-0"><p className="break-words font-medium text-gray-800">{page.title}</p><p className="mt-1 text-xs text-gray-500">{PAGE_TYPES.find((type) => type.value === page.page_type)?.label} · {isPublishedCustomPage(page) ? 'Published' : 'Draft'}</p></div><div className="flex flex-wrap items-center gap-3"><Button type="button" variant="outline" size="sm" disabled={busy || (record?.id === page.id && !remoteChanged)} onClick={() => requestAction({ kind: 'edit', page })}>{record?.id === page.id && !remoteChanged ? 'Editing' : 'Edit'}</Button>{isPublishedCustomPage(page) && <><Button type="button" variant="outline" size="sm" disabled={busy || inMenu(page)} onClick={() => addToMenu(page)}>{inMenu(page) ? 'In Menu Draft' : 'Add to Menu'}</Button><Link to={getCustomPagePath(page)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--primary)] underline">View <ExternalLink size={14} /></Link></>}</div></li>)}</ul><p className="mt-4 text-xs text-gray-500">To take a page offline, edit it, uncheck Make this page public, and save. Content is kept; this editor does not permanently delete pages.</p></section>
  </section>;
}
