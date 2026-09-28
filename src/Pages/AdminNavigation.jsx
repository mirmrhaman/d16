import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, GripVertical, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_NAVIGATION_MENU, NAVIGATION_MENU_ID, NAVIGATION_PAGES, normalizeNavigationItems, validateNavigationItems } from '@/data/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const readRecord = (records) => {
  if (!Array.isArray(records)) throw new Error('The saved website tabs could not be read.');
  if (records.length === 0) return null;
  const record = records.find((entry) => entry?.id === NAVIGATION_MENU_ID) || records[0];
  if (!record || typeof record.id !== 'string' || !record.id) throw new Error('The saved website menu has an invalid identity. Nothing has been changed.');
  // Admin must reject damaged settings rather than replace them with defaults.
  validateNavigationItems(record.items);
  return record;
};
const itemsFor = (record) => structuredClone(normalizeNavigationItems(record?.items));
const sameItems = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const DRAG_TYPE = 'application/x-d16-navigation-tab';

export default function AdminNavigation() {
  const { user } = useAuth();
  return <NavigationEditor key={user?.id || 'signed-out'} userId={user?.id} />;
}

function NavigationEditor({ userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draftKey = ['navigationDraft', userId];
  const [restoredDraft] = useState(() => userId ? queryClient.getQueryData(['navigationDraft', userId]) : null);
  const query = useQuery({
    queryKey: ['navigationMenu'],
    queryFn: async () => {
      const records = await base44.entities.NavigationMenu.list();
      readRecord(records);
      return records;
    },
    staleTime: 30000,
  });
  const [draft, setDraft] = useState(() => restoredDraft ? structuredClone(restoredDraft.items) : null);
  const [baseline, setBaseline] = useState(() => restoredDraft ? structuredClone(restoredDraft.baseline) : []);
  const [original, setOriginal] = useState(() => restoredDraft ? structuredClone(restoredDraft.original) : null);
  const [pageToAdd, setPageToAdd] = useState('');
  const [status, setStatus] = useState(restoredDraft ? 'Your unsaved website-tab draft was restored. Review it before saving.' : '');
  const [saveError, setSaveError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [reloading, setReloading] = useState(false);
  const [dropTarget, setDropTarget] = useState('');
  const dragSource = useRef('');
  const confirmationRef = useRef(null);
  let savedRecord = null;
  let validationError = '';
  // Layout shares this query key, so validate cached data independently as well.
  if (query.data !== undefined) {
    try { savedRecord = readRecord(query.data); }
    catch (error) { validationError = error.message; }
  }
  const loadError = query.error?.message || validationError;
  const dirty = draft !== null && !sameItems(draft, baseline);

  useEffect(() => {
    if (query.isSuccess && !validationError && draft === null) {
      const record = readRecord(query.data);
      const items = itemsFor(record);
      setOriginal(record); setBaseline(items); setDraft(items);
    }
  }, [query.isSuccess, query.data, draft, validationError]);

  useEffect(() => {
    if (confirmation) {
      confirmationRef.current?.scrollIntoView({ block: 'nearest' });
      confirmationRef.current?.focus({ preventScroll: true });
    }
  }, [confirmation]);

  const save = useMutation({
    mutationFn: async ({ items, record }) => {
      const payload = { title: DEFAULT_NAVIGATION_MENU.title, items: validateNavigationItems(items) };
      const result = record?.id
        ? await base44.entities.NavigationMenu.update(record.id, { ...payload, ...(record.version != null ? { version: record.version } : {}) })
        : await base44.entities.NavigationMenu.create(payload);
      if (!result?.id || !Array.isArray(result.items)) throw new Error('The server did not confirm the saved website tabs.');
      validateNavigationItems(result.items);
      return result;
    },
    onSuccess: (record) => {
      const items = itemsFor(record);
      setOriginal(record); setBaseline(items); setDraft(items); setSaveError(''); setConfirmation(null);
      queryClient.removeQueries({ queryKey: draftKey, exact: true });
      queryClient.setQueryData(['navigationMenu'], [record]);
      queryClient.invalidateQueries({ queryKey: ['navigationMenu'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      window.dispatchEvent(new Event('d16-navigation-refresh'));
      setStatus(IS_DEMO ? 'Website tabs saved only in this browser preview. The live website has not changed.' : 'Website tabs saved for everyone. This change is recorded in Change History.');
    },
    onError: (error) => {
      setStatus('');
      setSaveError(error.status === 409
        ? 'Another administrator saved newer website tabs. Your draft is still here. Keep a copy of any edits you need before reloading the saved version.'
        : `Could not save website tabs: ${error.message} Your draft is still here.`);
      if (error.status === 409) queryClient.invalidateQueries({ queryKey: ['navigationMenu'] });
    },
  });
  const busy = save.isPending || reloading;
  const remoteChanged = draft !== null && query.isSuccess && !loadError && (savedRecord?.id !== original?.id || savedRecord?.version !== original?.version || !sameItems(itemsFor(savedRecord), baseline));

  useEffect(() => {
    if (!dirty && !save.isPending) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, save.isPending]);

  const changeItems = (items, message = '') => {
    if (busy) return;
    // This cache is memory-only and AuthContext clears it on every auth change.
    // Save immediately, not during unmount, so header links and browser Back
    // preserve the original version as well as incomplete labels being edited.
    if (userId && !sameItems(items, baseline)) {
      queryClient.setQueryDefaults(draftKey, { gcTime: Infinity });
      queryClient.setQueryData(draftKey, { items: structuredClone(items), baseline: structuredClone(baseline), original: structuredClone(original) });
    } else {
      queryClient.removeQueries({ queryKey: draftKey, exact: true });
    }
    setDraft(items); setStatus(message); setSaveError(''); setConfirmation(null);
  };
  const moveItem = (id, targetIndex) => {
    if (busy || !draft || targetIndex < 0 || targetIndex >= draft.length) return;
    const sourceIndex = draft.findIndex((item) => item.id === id);
    if (sourceIndex < 0 || sourceIndex === targetIndex) return;
    const items = [...draft];
    const [item] = items.splice(sourceIndex, 1);
    items.splice(targetIndex, 0, item);
    changeItems(items, `${item.label || 'Tab'} moved to position ${targetIndex + 1}. Save Tabs to keep this order.`);
  };
  const sortItems = (direction) => {
    const compare = new Intl.Collator('en', { sensitivity: 'base', numeric: true }).compare;
    changeItems([...draft].sort((left, right) => direction * compare(left.label, right.label)), `Tabs sorted ${direction === 1 ? 'A–Z' : 'Z–A'} in your draft.`);
  };
  const addItem = () => {
    const page = NAVIGATION_PAGES.find((item) => item.page === pageToAdd);
    if (busy || !page || draft.some((item) => item.page === page.page)) return;
    changeItems([...draft, { id: crypto.randomUUID(), page: page.page, label: page.label, visible: true }], `${page.label} added to your draft. The page content has not changed.`);
    setPageToAdd('');
  };
  const reloadSaved = async () => {
    if (busy) return;
    setConfirmation(null); setReloading(true); setStatus(''); setSaveError('');
    try {
      const result = await query.refetch();
      if (result.error) throw result.error;
      const record = readRecord(result.data); const items = itemsFor(record);
      queryClient.removeQueries({ queryKey: draftKey, exact: true });
      setOriginal(record); setBaseline(items); setDraft(items); setPageToAdd('');
      setStatus(record ? 'Saved website tabs loaded.' : 'Default website tabs loaded. No shared menu has been saved yet.');
    } catch (error) { setSaveError(`Could not reload saved tabs: ${error.message} Your draft is still here.`); }
    finally { setReloading(false); }
  };
  const resetDefaults = () => changeItems(structuredClone(DEFAULT_NAVIGATION_MENU.items), 'Default tabs restored in your draft. Save Tabs to apply them.');
  const confirmAction = () => {
    if (confirmation === 'reload') reloadSaved();
    else if (confirmation === 'reset') resetDefaults();
    else if (confirmation === 'leave') {
      queryClient.removeQueries({ queryKey: draftKey, exact: true });
      navigate('/AdminDashboard');
    }
  };
  const submit = (event) => {
    event.preventDefault();
    if (busy || loadError || draft === null) return;
    setStatus(''); setSaveError('');
    try { save.mutate({ items: validateNavigationItems(draft), record: original }); }
    catch (error) { setSaveError(error.message); }
  };
  const isLocalDrag = (event) => Boolean(dragSource.current && draft?.some((item) => item.id === dragSource.current) && Array.from(event.dataTransfer.types || []).includes(DRAG_TYPE));
  const endDrag = () => { dragSource.current = ''; setDropTarget(''); };
  const availablePages = NAVIGATION_PAGES.filter((page) => !draft?.some((item) => item.page === page.page));
  const visibleItems = (draft || []).filter((item) => item.visible);

  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-5xl px-4 sm:px-6">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4"><Link to="/AdminDashboard" aria-label="Back to dashboard" className="rounded-lg border bg-white p-3" onClick={(event) => { if (busy || dirty) { event.preventDefault(); if (!busy) setConfirmation('leave'); } }}><ArrowLeft size={20} /></Link><div><h1 className="text-2xl font-bold text-[var(--primary)] sm:text-3xl">Website Tabs</h1><p className="mt-1 text-gray-600">Manage the links in your website navigation.</p></div></div>
      <div className="flex flex-wrap gap-3"><a href={import.meta.env.BASE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-[var(--primary)]">View website <ExternalLink size={16} /></a><Button type="submit" form="navigation-editor" disabled={busy || draft === null || Boolean(loadError)}><Save size={18} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Tabs'}</Button></div>
    </div>
    <p className="mb-6 rounded-xl border bg-white p-4 text-sm text-gray-700">Add a link to an existing page, rename its tab, reorder it, or show and hide it. Removing a tab removes only its menu link: the page, its content and its direct address remain available. You can add the page back later. This does not create new pages or external links.</p>
    <p className="mb-5 text-sm text-gray-600">Unsaved drafts are kept while you move between pages in this signed-in session. Reloading the browser or signing out discards them.</p>
    {IS_DEMO && <p className="mb-5 text-sm text-amber-800">Preview mode: saved tabs apply only in this browser, not to the live website.</p>}
    {draft === null && !loadError && <p role="status" className="rounded-xl border bg-white p-8">Loading website tabs…</p>}
    {loadError && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800"><p>Could not load saved website tabs: {loadError}</p><Button type="button" variant="outline" className="mt-3" disabled={busy} onClick={() => dirty ? setConfirmation('reload') : reloadSaved()}>Retry loading</Button></div>}
    {confirmation && <section ref={confirmationRef} tabIndex={-1} role="alertdialog" aria-labelledby="navigation-confirm-title" aria-describedby="navigation-confirm-description" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-5">
      <h2 id="navigation-confirm-title" className="font-semibold text-amber-950">{confirmation === 'leave' ? 'Leave without saving?' : confirmation === 'reset' ? 'Replace this draft with default tabs?' : 'Discard edits and reload?'}</h2>
      <p id="navigation-confirm-description" className="mt-2 text-sm text-amber-900">{confirmation === 'reset' ? 'Your current draft will be replaced. The saved website menu will not change until you select Save Tabs.' : 'Your unsaved tab changes will be discarded. The saved website menu will not change.'}</p>
      <div className="mt-4 flex flex-wrap gap-3"><Button type="button" disabled={busy} onClick={confirmAction}>{confirmation === 'leave' ? 'Leave Without Saving' : confirmation === 'reset' ? 'Use Default Tabs' : 'Discard & Reload'}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmation(null)}>Keep Editing</Button></div>
    </section>}
    {remoteChanged && <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">The saved menu changed after you opened this editor. Your draft has been kept. Reload Saved to use the latest version.</p>}
    {status && <p role="status" aria-live="polite" className="mb-5 rounded-lg bg-green-50 p-4 text-green-800">{status}</p>}
    {saveError && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800">{saveError}</p>}
    {draft !== null && <form id="navigation-editor" onSubmit={submit}><fieldset disabled={busy || Boolean(loadError)} className="space-y-6">
      <section aria-labelledby="navigation-preview-title" className="rounded-xl border bg-white p-5"><h2 id="navigation-preview-title" className="mb-3 font-semibold text-[var(--primary)]">Menu preview</h2>
        <div className="flex flex-wrap gap-2">{visibleItems.map((item) => <span key={item.id} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800">{item.label || '(Tab label required)'}</span>)}</div>
        {visibleItems.length === 0 && <p className="text-sm text-gray-600">No menu tabs will be shown. Existing pages remain reachable by their direct addresses.</p>}
        <p className="mt-3 text-xs text-gray-500">Draft preview — changes appear on the website only after saving.</p>
      </section>
      <section aria-labelledby="add-navigation-title" className="rounded-xl border bg-white p-5"><h2 id="add-navigation-title" className="mb-3 font-semibold text-[var(--primary)]">Add a tab</h2>
        <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label htmlFor="navigation-add-page" className="mb-2 block text-sm font-medium text-gray-700">Existing page</label><select id="navigation-add-page" value={availablePages.some((page) => page.page === pageToAdd) ? pageToAdd : ''} disabled={availablePages.length === 0} onChange={(event) => setPageToAdd(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">{availablePages.length ? 'Choose a page to add' : 'All existing pages are already in this menu'}</option>{availablePages.map((page) => <option key={page.page} value={page.page}>{page.label}</option>)}</select></div><Button type="button" variant="outline" disabled={!availablePages.some((page) => page.page === pageToAdd)} onClick={addItem}><Plus size={17} className="mr-2" />Add Tab</Button></div>
      </section>
      <section aria-labelledby="navigation-list-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="navigation-list-title" className="font-semibold text-[var(--primary)]">Your tabs ({draft.length} of {NAVIGATION_PAGES.length})</h2><p id="navigation-reorder-help" className="mt-1 text-sm text-gray-600">Drag the handle, use its arrow keys, or select Up and Down to reorder.</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={draft.length < 2} onClick={() => sortItems(1)}>A–Z</Button><Button type="button" size="sm" variant="outline" disabled={draft.length < 2} onClick={() => sortItems(-1)}>Z–A</Button></div></div>
        {draft.length === 0 && <p className="rounded-xl border bg-white p-6 text-gray-600">There are no tabs in this draft. Choose an existing page above to add one, or reset the default tabs.</p>}
        <ol className="space-y-4" aria-label="Website tabs">{draft.map((item, index) => {
          const page = NAVIGATION_PAGES.find((entry) => entry.page === item.page);
          return <li key={item.id} className={`rounded-xl border bg-white p-4 sm:p-5 ${dropTarget === item.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
            onDragOver={(event) => { if (!busy && isLocalDrag(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(item.id); } }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget((current) => current === item.id ? '' : current); }}
            onDrop={(event) => { if (!busy && isLocalDrag(event)) { event.preventDefault(); const source = event.dataTransfer.getData(DRAG_TYPE); if (source === dragSource.current) moveItem(source, index); endDrag(); } }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button type="button" draggable={!busy} aria-label={`Drag ${item.label || page?.label || 'tab'} to reorder; use arrow keys to move`} aria-describedby="navigation-reorder-help" className="inline-flex min-h-10 cursor-grab items-center gap-2 rounded-md border bg-gray-50 px-3 text-sm text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:cursor-grabbing" onDragStart={(event) => { dragSource.current = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(DRAG_TYPE, item.id); }} onDragEnd={endDrag} onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); moveItem(item.id, index + (event.key === 'ArrowUp' ? -1 : 1)); } }}><GripVertical size={18} aria-hidden="true" /><span>{index + 1} of {draft.length}</span></button>
              <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={index === 0} aria-label={`Move ${item.label || 'tab'} up`} onClick={() => moveItem(item.id, index - 1)}><ArrowUp size={16} /><span className="ml-1">Up</span></Button><Button type="button" variant="outline" size="sm" disabled={index === draft.length - 1} aria-label={`Move ${item.label || 'tab'} down`} onClick={() => moveItem(item.id, index + 1)}><ArrowDown size={16} /><span className="ml-1">Down</span></Button><Button type="button" variant="outline" size="sm" aria-label={`Remove ${item.label || 'tab'} from menu`} onClick={() => changeItems(draft.filter((entry) => entry.id !== item.id), `${item.label || 'Tab'} removed from this draft menu. Its page and content were not deleted.`)}><Trash2 size={16} /><span className="ml-1">Remove</span></Button></div>
            </div>
            <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]"><div className="min-w-0"><label htmlFor={`navigation-label-${item.id}`} className="mb-2 block text-sm font-medium text-gray-800">Tab label for {page?.label || item.page}</label><Input id={`navigation-label-${item.id}`} value={item.label} required maxLength={60} onChange={(event) => changeItems(draft.map((entry) => entry.id === item.id ? { ...entry, label: event.target.value } : entry))} /><p className="mt-2 break-all text-xs text-gray-500">Existing page: {page?.label || item.page} · {page?.path}</p></div><label className="inline-flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium"><input type="checkbox" checked={item.visible} onChange={(event) => changeItems(draft.map((entry) => entry.id === item.id ? { ...entry, visible: event.target.checked } : entry))} className="h-4 w-4 accent-[var(--primary)]" /><span>Show {page?.label || item.page} tab</span></label></div>
          </li>;
        })}</ol>
      </section>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5"><Button type="submit"><Save size={18} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Tabs'}</Button><Button type="button" variant="outline" onClick={() => dirty ? setConfirmation('reset') : resetDefaults()}><RotateCcw size={16} className="mr-2" />Reset Default Tabs</Button><Button type="button" variant="outline" onClick={() => dirty ? setConfirmation('reload') : reloadSaved()}>{reloading ? 'Reloading…' : dirty ? 'Discard & Reload' : 'Reload Saved'}</Button><p className="text-sm text-gray-600">{dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</p></div>
    </fieldset></form>}
  </div></div>;
}
