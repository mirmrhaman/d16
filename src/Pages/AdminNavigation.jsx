import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, GripVertical, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_NAVIGATION_MENU, NAVIGATION_MENU_ID, MAX_NAVIGATION_ITEMS, navigationPageChoices, isCustomPageDestination, normalizeNavigationItems, validateNavigationItems, normalizeNavigationSettings, validateNavigationSettings, groupNavigationItems } from '@/data/navigation';
import { PAGE_TYPES } from '../../server/src/customPageSchema.js';
import CustomPageManager from '@/components/CustomPageManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const readRecord = (records) => {
  if (!Array.isArray(records)) throw new Error('The saved website tabs could not be read.');
  if (records.length === 0) return null;
  const record = records.find((entry) => entry?.id === NAVIGATION_MENU_ID) || records[0];
  if (!record || typeof record.id !== 'string' || !record.id) throw new Error('The saved website menu has an invalid identity. Nothing has been changed.');
  // Admin must reject damaged settings rather than replace them with defaults.
  validateNavigationItems(record.items);
  validateNavigationSettings(record);
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
  const customPagesQuery = useQuery({ queryKey: ['customPages', 'admin'], queryFn: () => base44.entities.CustomPage.list({ admin: true }), staleTime: 30000 });
  const [draft, setDraft] = useState(() => restoredDraft ? structuredClone(restoredDraft.items) : null);
  const [baseline, setBaseline] = useState(() => restoredDraft ? structuredClone(restoredDraft.baseline) : []);
  const [settings, setSettings] = useState(() => restoredDraft?.settings ? structuredClone(restoredDraft.settings) : normalizeNavigationSettings(restoredDraft?.original));
  const [baselineSettings, setBaselineSettings] = useState(() => normalizeNavigationSettings(restoredDraft?.baselineSettings || restoredDraft?.original));
  const [original, setOriginal] = useState(() => restoredDraft ? structuredClone(restoredDraft.original) : null);
  const [pageToAdd, setPageToAdd] = useState('__new__');
  const [newPageType, setNewPageType] = useState('standard');
  const [newPageRequest, setNewPageRequest] = useState(null);
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
  const dirty = draft !== null && (!sameItems(draft, baseline) || !sameItems(settings, baselineSettings));

  useEffect(() => {
    if (query.isSuccess && !validationError && draft === null) {
      const record = readRecord(query.data);
      const items = itemsFor(record);
      setOriginal(record); setBaseline(items); setDraft(items);
      setSettings(normalizeNavigationSettings(record)); setBaselineSettings(normalizeNavigationSettings(record));
    }
  }, [query.isSuccess, query.data, draft, validationError]);

  useEffect(() => {
    if (confirmation) {
      confirmationRef.current?.scrollIntoView({ block: 'nearest' });
      confirmationRef.current?.focus({ preventScroll: true });
    }
  }, [confirmation]);

  const save = useMutation({
    mutationFn: async ({ items, menuSettings, record }) => {
      const payload = { title: DEFAULT_NAVIGATION_MENU.title, items: validateNavigationItems(items), ...validateNavigationSettings(menuSettings) };
      const result = record?.id
        ? await base44.entities.NavigationMenu.update(record.id, { ...payload, ...(record.version != null ? { version: record.version } : {}) })
        : await base44.entities.NavigationMenu.create(payload);
      if (!result?.id || !Array.isArray(result.items)) throw new Error('The server did not confirm the saved website tabs.');
      validateNavigationItems(result.items);
      validateNavigationSettings(result);
      return result;
    },
    onSuccess: (record) => {
      const items = itemsFor(record);
      setOriginal(record); setBaseline(items); setDraft(items); setSaveError(''); setConfirmation(null);
      setSettings(normalizeNavigationSettings(record)); setBaselineSettings(normalizeNavigationSettings(record));
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
  const remoteChanged = draft !== null && query.isSuccess && !loadError && (savedRecord?.id !== original?.id || savedRecord?.version !== original?.version || !sameItems(itemsFor(savedRecord), baseline) || !sameItems(normalizeNavigationSettings(savedRecord), baselineSettings));

  useEffect(() => {
    if (!dirty && !save.isPending) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, save.isPending]);

  const changeItems = (items, message = '', menuSettings = settings) => {
    if (busy) return;
    // This cache is memory-only and AuthContext clears it on every auth change.
    // Save immediately, not during unmount, so header links and browser Back
    // preserve the original version as well as incomplete labels being edited.
    if (userId && (!sameItems(items, baseline) || !sameItems(menuSettings, baselineSettings))) {
      queryClient.setQueryDefaults(draftKey, { gcTime: Infinity });
      queryClient.setQueryData(draftKey, { items: structuredClone(items), baseline: structuredClone(baseline), settings: structuredClone(menuSettings), baselineSettings: structuredClone(baselineSettings), original: structuredClone(original) });
    } else {
      queryClient.removeQueries({ queryKey: draftKey, exact: true });
    }
    setDraft(items); setSettings(menuSettings); setStatus(message); setSaveError(''); setConfirmation(null);
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
    if (busy || !draft) return;
    if (draft.length >= MAX_NAVIGATION_ITEMS) { setSaveError(`This menu has reached the safety limit of ${MAX_NAVIGATION_ITEMS} links. Remove a menu link before adding another.`); return; }
    if (pageToAdd === '__new__' || !availablePages.some((page) => page.page === pageToAdd)) {
      setNewPageRequest({ id: crypto.randomUUID(), pageType: newPageType });
      setStatus('Complete the new page editor, publish the page, then select Add to Menu and Save Tabs.');
      setSaveError('');
      return;
    }
    const page = choices.find((item) => item.page === pageToAdd);
    if (busy || !page || draft.some((item) => item.page === page.page)) return;
    changeItems([...draft, { id: crypto.randomUUID(), page: page.page, label: page.label.slice(0, 60), visible: true, in_dropdown: false }], `${page.label} added to your menu draft. Select Save Tabs to apply it.`);
    setPageToAdd('__new__');
  };
  const addCustomPage = (page) => {
    if (busy || loadError || draft === null) { setSaveError('Wait for the menu to finish loading or saving, then add the page again.'); return false; }
    if (page.published !== true) { setSaveError('Save this page as published before adding it to the menu.'); return false; }
    const destination = `custom:${page.id}`;
    if (draft.some((item) => item.page === destination)) { setStatus('This page is already in your menu draft. Use its Show checkbox to make the tab visible.'); return false; }
    if (draft.length >= MAX_NAVIGATION_ITEMS) { setSaveError(`This menu has reached the safety limit of ${MAX_NAVIGATION_ITEMS} links. Remove a menu link before adding another.`); return false; }
    changeItems([...draft, { id: crypto.randomUUID(), page: destination, label: page.title.slice(0, 60), visible: true, in_dropdown: false }], `${page.title} added to your menu draft. Select Save Tabs below to show this link on the website.`);
    return true;
  };
  const reloadSaved = async () => {
    if (busy) return;
    setConfirmation(null); setReloading(true); setStatus(''); setSaveError('');
    try {
      const result = await query.refetch();
      if (result.error) throw result.error;
      const record = readRecord(result.data); const items = itemsFor(record);
      queryClient.removeQueries({ queryKey: draftKey, exact: true });
      setOriginal(record); setBaseline(items); setDraft(items); setPageToAdd('__new__');
      setSettings(normalizeNavigationSettings(record)); setBaselineSettings(normalizeNavigationSettings(record));
      setStatus(record ? 'Saved website tabs loaded.' : 'Default website tabs loaded. No shared menu has been saved yet.');
    } catch (error) { setSaveError(`Could not reload saved tabs: ${error.message} Your draft is still here.`); }
    finally { setReloading(false); }
  };
  const resetDefaults = () => changeItems(structuredClone(DEFAULT_NAVIGATION_MENU.items), 'Default tabs restored in your draft, without a dropdown. Save Tabs to apply them.', normalizeNavigationSettings(DEFAULT_NAVIGATION_MENU));
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
    try { save.mutate({ items: validateNavigationItems(draft), menuSettings: validateNavigationSettings(settings), record: original }); }
    catch (error) { setSaveError(error.message); }
  };
  const isLocalDrag = (event) => Boolean(dragSource.current && draft?.some((item) => item.id === dragSource.current) && Array.from(event.dataTransfer.types || []).includes(DRAG_TYPE));
  const endDrag = () => { dragSource.current = ''; setDropTarget(''); };
  const choices = navigationPageChoices(customPagesQuery.data);
  const allChoices = navigationPageChoices(customPagesQuery.data, { includeDrafts: true });
  const availablePages = choices.filter((page) => !draft?.some((item) => item.page === page.page));
  const visibleItems = (draft || []).filter((item) => item.visible);
  const { directItems, dropdownItems } = groupNavigationItems(visibleItems, settings);

  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-5xl px-4 sm:px-6">
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-4"><Link to="/AdminDashboard" aria-label="Back to dashboard" className="rounded-lg border bg-white p-3" onClick={(event) => { if (busy || dirty) { event.preventDefault(); if (!busy) setConfirmation('leave'); } }}><ArrowLeft size={20} /></Link><div><h1 className="text-2xl font-bold text-[var(--primary)] sm:text-3xl">Website Tabs</h1><p className="mt-1 text-gray-600">Manage the links in your website navigation.</p></div></div>
      <div className="flex flex-wrap gap-3"><a href={import.meta.env.BASE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-[var(--primary)]">View website <ExternalLink size={16} /></a><Button type="submit" form="navigation-editor" disabled={busy || draft === null || Boolean(loadError)}><Save size={18} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Tabs'}</Button></div>
    </div>
    <p className="mb-6 rounded-xl border bg-white p-4 text-sm text-gray-700">Add as many pages as your website needs; the page types are reusable templates, not a limit on the number of tabs. Use Add Tab to create a page or add an existing one. You choose which tabs stay in the main menu, which go in a dropdown, and the dropdown title. Nothing is moved automatically. Removing a tab removes only its menu link; unpublish a custom page to take its content off the public website.</p>
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
    <CustomPageManager onAddToMenu={addCustomPage} menuPages={(draft || []).map((item) => item.page)} newPageRequest={newPageRequest} />
    {draft !== null && <form id="navigation-editor" onSubmit={submit}><fieldset disabled={busy || Boolean(loadError)} className="space-y-6">
      <section aria-labelledby="navigation-dropdown-title" className="rounded-xl border bg-white p-5 space-y-4">
        <h2 id="navigation-dropdown-title" className="font-semibold text-[var(--primary)]">Dropdown menu options</h2>
        <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={settings.dropdown_enabled} onChange={(event) => changeItems(draft, '', { ...settings, dropdown_enabled: event.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />Use a dropdown menu</label>
        <p className="text-sm text-gray-600">Turn this off to show every visible tab directly. Turn it on and choose Main menu or Dropdown on each tab below. You decide exactly how many tabs go inside; no tabs are moved automatically.</p>
        <div><label htmlFor="navigation-dropdown-label" className="mb-2 block text-sm font-medium text-gray-700">Dropdown title</label><Input id="navigation-dropdown-label" required maxLength={60} value={settings.dropdown_label} onChange={(event) => changeItems(draft, '', { ...settings, dropdown_label: event.target.value })} placeholder="More, Explore, Discover…" /><p className="mt-2 text-xs text-gray-500">This replaces “More” on both desktop and mobile. The dropdown appears only when it contains a visible, published page.</p></div>
        <div className="flex flex-wrap items-center gap-3"><Button type="button" size="sm" variant="outline" disabled={!settings.dropdown_enabled || draft.length === 0} onClick={() => changeItems(draft.map((item) => ({ ...item, in_dropdown: true })), 'All tabs assigned to the dropdown in your draft. Save Tabs to apply.')}>Move All to Dropdown</Button><Button type="button" size="sm" variant="outline" disabled={draft.length === 0} onClick={() => changeItems(draft.map((item) => ({ ...item, in_dropdown: false })), 'All tabs assigned to the main menu in your draft. Save Tabs to apply.')}>Keep All in Main Menu</Button></div>
        <p className="text-sm text-gray-600">Visible tabs in this draft: {directItems.length} in main menu · {dropdownItems.length} in dropdown{!settings.dropdown_enabled && ' (dropdown off)'}. Unpublished custom pages stay hidden until published.</p>
      </section>
      <section aria-labelledby="navigation-preview-title" className="rounded-xl border bg-white p-5"><h2 id="navigation-preview-title" className="mb-3 font-semibold text-[var(--primary)]">Menu preview</h2>
        <div className="flex flex-wrap items-start gap-2">{directItems.map((item) => <span key={item.id} className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800">{item.label || '(Tab label required)'}</span>)}{dropdownItems.length > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3"><p className="mb-2 text-sm font-semibold">{settings.dropdown_label || '(Dropdown title required)'} ({dropdownItems.length})</p><ul className="space-y-1 text-sm">{dropdownItems.map((item) => <li key={item.id}>{item.label || '(Tab label required)'}</li>)}</ul></div>}</div>
        {visibleItems.length === 0 && <p className="text-sm text-gray-600">No menu tabs will be shown. Existing pages remain reachable by their direct addresses.</p>}
        <p className="mt-3 text-xs text-gray-500">Draft preview — changes appear on the website only after saving.</p>
      </section>
      <section aria-labelledby="add-navigation-title" className="rounded-xl border bg-white p-5"><h2 id="add-navigation-title" className="mb-3 font-semibold text-[var(--primary)]">Add a tab</h2>
        <p className="mb-4 text-sm text-gray-600">Choose Create a new page, select its type, then Add Tab to open the page editor. Publish your new page and select Add to Menu, then Save Tabs. You can reuse any template for multiple pages. Existing pages not already in the menu also appear below.</p>
        {customPagesQuery.error && <p role="alert" className="mb-3 text-sm text-red-700">Custom pages could not be loaded: {customPagesQuery.error.message}</p>}
        <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><label htmlFor="navigation-add-page" className="mb-2 block text-sm font-medium text-gray-700">Tab destination</label><select id="navigation-add-page" value={pageToAdd === '__new__' || availablePages.some((page) => page.page === pageToAdd) ? pageToAdd : '__new__'} onChange={(event) => setPageToAdd(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"><option value="__new__">Create a new page</option>{availablePages.map((page) => <option key={page.page} value={page.page}>{page.label}{page.custom ? ' (custom)' : ''}</option>)}</select></div>{(pageToAdd === '__new__' || !availablePages.some((page) => page.page === pageToAdd)) && <div className="min-w-0 flex-1"><label htmlFor="navigation-new-page-type" className="mb-2 block text-sm font-medium text-gray-700">Page type for new tab</label><select id="navigation-new-page-type" value={newPageType} onChange={(event) => setNewPageType(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">{PAGE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>}<Button type="button" variant="outline" disabled={draft.length >= MAX_NAVIGATION_ITEMS} onClick={addItem}><Plus size={17} className="mr-2" />Add Tab</Button></div>
      </section>
      <section aria-labelledby="navigation-list-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="navigation-list-title" className="font-semibold text-[var(--primary)]">Your tabs ({draft.length})</h2><p id="navigation-reorder-help" className="mt-1 text-sm text-gray-600">Drag the handle, use its arrow keys, or select Up and Down to reorder. This sets the order within both menu groups.</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={draft.length < 2} onClick={() => sortItems(1)}>A–Z</Button><Button type="button" size="sm" variant="outline" disabled={draft.length < 2} onClick={() => sortItems(-1)}>Z–A</Button></div></div>
        {draft.length === 0 && <p className="rounded-xl border bg-white p-6 text-gray-600">There are no tabs in this draft. Choose an existing page above to add one, or reset the default tabs.</p>}
        <ol className="space-y-4" aria-label="Website tabs">{draft.map((item, index) => {
          const page = allChoices.find((entry) => entry.page === item.page);
          return <li key={item.id} className={`rounded-xl border bg-white p-4 sm:p-5 ${dropTarget === item.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
            onDragOver={(event) => { if (!busy && isLocalDrag(event)) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropTarget(item.id); } }}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDropTarget((current) => current === item.id ? '' : current); }}
            onDrop={(event) => { if (!busy && isLocalDrag(event)) { event.preventDefault(); const source = event.dataTransfer.getData(DRAG_TYPE); if (source === dragSource.current) moveItem(source, index); endDrag(); } }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><button type="button" draggable={!busy} aria-label={`Drag ${item.label || page?.label || 'tab'} to reorder; use arrow keys to move`} aria-describedby="navigation-reorder-help" className="inline-flex min-h-10 cursor-grab items-center gap-2 rounded-md border bg-gray-50 px-3 text-sm text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] active:cursor-grabbing" onDragStart={(event) => { dragSource.current = item.id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(DRAG_TYPE, item.id); }} onDragEnd={endDrag} onKeyDown={(event) => { if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); moveItem(item.id, index + (event.key === 'ArrowUp' ? -1 : 1)); } }}><GripVertical size={18} aria-hidden="true" /><span>{index + 1} of {draft.length}</span></button>
              <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" disabled={index === 0} aria-label={`Move ${item.label || 'tab'} up`} onClick={() => moveItem(item.id, index - 1)}><ArrowUp size={16} /><span className="ml-1">Up</span></Button><Button type="button" variant="outline" size="sm" disabled={index === draft.length - 1} aria-label={`Move ${item.label || 'tab'} down`} onClick={() => moveItem(item.id, index + 1)}><ArrowDown size={16} /><span className="ml-1">Down</span></Button><Button type="button" variant="outline" size="sm" aria-label={`Remove ${item.label || 'tab'} from menu`} onClick={() => changeItems(draft.filter((entry) => entry.id !== item.id), `${item.label || 'Tab'} removed from this draft menu. Its page and content were not deleted.`)}><Trash2 size={16} /><span className="ml-1">Remove</span></Button></div>
            </div>
            <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto]"><div className="min-w-0"><label htmlFor={`navigation-label-${item.id}`} className="mb-2 block text-sm font-medium text-gray-800">Tab label for {page?.label || item.label}</label><Input id={`navigation-label-${item.id}`} value={item.label} required maxLength={60} onChange={(event) => changeItems(draft.map((entry) => entry.id === item.id ? { ...entry, label: event.target.value } : entry))} /><p className="mt-2 break-all text-xs text-gray-500">{page?.custom ? 'Custom page' : 'Existing page'}: {page?.label || item.label} · {page?.path}</p>{isCustomPageDestination(item.page) && (!page || !page.published) && <p className="mt-2 text-sm text-amber-800">This custom page is unpublished or unavailable. Its tab stays hidden on the website until the page is published.</p>}</div><label className="inline-flex min-h-10 items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium"><input type="checkbox" checked={item.visible} onChange={(event) => changeItems(draft.map((entry) => entry.id === item.id ? { ...entry, visible: event.target.checked } : entry))} className="h-4 w-4 accent-[var(--primary)]" /><span>Show {page?.label || item.label} tab</span></label></div>
            <div className="mt-4"><label htmlFor={`navigation-placement-${item.id}`} className="mb-2 block text-sm font-medium text-gray-800">Menu placement for {page?.label || item.label}</label><select id={`navigation-placement-${item.id}`} value={item.in_dropdown ? 'dropdown' : 'main'} disabled={!settings.dropdown_enabled} onChange={(event) => changeItems(draft.map((entry) => entry.id === item.id ? { ...entry, in_dropdown: event.target.value === 'dropdown' } : entry))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100"><option value="main">Main menu (outside dropdown)</option><option value="dropdown">Dropdown — {settings.dropdown_label || 'More'}</option></select>{!settings.dropdown_enabled && <p className="mt-1 text-xs text-gray-500">Dropdown is off, so this tab appears in the main menu. Its saved placement is kept for when you turn the dropdown on.</p>}</div>
          </li>;
        })}</ol>
      </section>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5"><Button type="submit"><Save size={18} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Tabs'}</Button><Button type="button" variant="outline" onClick={() => dirty ? setConfirmation('reset') : resetDefaults()}><RotateCcw size={16} className="mr-2" />Reset Default Tabs</Button><Button type="button" variant="outline" onClick={() => dirty ? setConfirmation('reload') : reloadSaved()}>{reloading ? 'Reloading…' : dirty ? 'Discard & Reload' : 'Reload Saved'}</Button><p className="text-sm text-gray-600">{dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</p></div>
    </fieldset></form>}
  </div></div>;
}
