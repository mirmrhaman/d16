import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, RotateCcw, Save, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { ABOUT_PAGE_ID, resolveAboutContent, safeAboutImage } from '@/data/aboutContent';
import { ICON_NAMES, STATIC_ICON_SLOTS, WEBSITE_ICONS_ID } from '@/data/siteAppearance';
import { IconPreview } from '@/components/SiteIcon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const selectRecord = (records) => records.find((record) => record.id === WEBSITE_ICONS_ID) || records[0] || null;
const cloneIcons = (record) => structuredClone(record?.icons || {});

async function loadIcons() {
  const records = await base44.entities.WebsiteIcons.list();
  if (!Array.isArray(records)) throw new Error('The saved icon settings could not be read.');
  const record = selectRecord(records);
  if (record && (!record.icons || typeof record.icons !== 'object' || Array.isArray(record.icons))) throw new Error('The saved icon settings have an invalid format. Nothing has been changed.');
  return records;
}

function IconCard({ slot, override, onEdit, onRestore, onUpload }) {
  const id = React.useId();
  const current = override || { icon_name: '', icon_url: '' };
  return <article className="min-w-0 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[var(--primary)]">
        <IconPreview iconName={current.icon_name} iconUrl={current.icon_url} fallback={slot.icon} size={36} />
      </div>
      <div className="min-w-0"><h3 className="font-semibold text-[var(--primary)]">{slot.label}</h3><p className="mt-1 text-xs text-gray-500">{slot.group}</p></div>
    </div>
    <div className="space-y-2">
      <label htmlFor={`${id}-built-in`} className="block text-sm font-medium text-gray-800">Built-in icon for {slot.label}</label>
      <select id={`${id}-built-in`} value={current.icon_name || ''} onChange={(event) => onEdit({ icon_name: event.target.value, icon_url: '' })} className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
        <option value="">Use default — {slot.icon}</option>
        {ICON_NAMES.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
    </div>
    <div className="space-y-2">
      <label htmlFor={`${id}-url`} className="block text-sm font-medium text-gray-800">Custom image address for {slot.label}</label>
      <Input id={`${id}-url`} value={current.icon_url || ''} onChange={(event) => onEdit({ ...current, icon_url: event.target.value })} maxLength={2048} placeholder="https://… or /uploads/…" />
      <p className="text-xs text-gray-500">A custom image overrides the built-in icon. Clear this address to use the built-in choice.</p>
    </div>
    <div className="space-y-2">
      <label htmlFor={`${id}-file`} className="block text-sm font-medium text-gray-800">Upload an icon for {slot.label}</label>
      <input id={`${id}-file`} type="file" accept="image/png,image/jpeg,image/webp" className="block w-full min-w-0 text-sm" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file); }} />
      <p className="text-xs text-gray-500">PNG, JPG or WebP; {IS_DEMO ? '500 KB maximum in this preview' : '5 MB maximum'}. Transparent PNG works well. SVG uploads are not accepted.</p>
    </div>
    <Button type="button" size="sm" variant="outline" disabled={!override} aria-label={`Restore default for ${slot.label}`} onClick={onRestore}><RotateCcw size={15} className="mr-2" />Restore default</Button>
  </article>;
}

export default function AdminIcons() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['websiteIcons'], queryFn: loadIcons, staleTime: 30000, refetchOnWindowFocus: false });
  const statsQuery = useQuery({ queryKey: ['stats'], queryFn: () => base44.entities.Stats.list(), refetchOnWindowFocus: false });
  const aboutQuery = useQuery({ queryKey: ['aboutPage', 'icons'], queryFn: () => base44.entities.AboutPage.list(), refetchOnWindowFocus: false });
  const [record, setRecord] = useState(null);
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [group, setGroup] = useState('All sections');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    if (query.isSuccess && draft === null) {
      const saved = selectRecord(query.data);
      setRecord(saved);
      setDraft(cloneIcons(saved));
    }
  }, [query.isSuccess, query.data, draft]);

  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading]);

  const slots = [...STATIC_ICON_SLOTS];
  if (Array.isArray(statsQuery.data)) {
    for (const stat of statsQuery.data) slots.push({ key: `stats.${stat.id}`, label: stat.label || 'Statistic', group: 'Home — Statistics', icon: ICON_NAMES.includes(stat.icon) ? stat.icon : 'Award' });
  }
  if (aboutQuery.isSuccess && Array.isArray(aboutQuery.data)) {
    const aboutRecord = aboutQuery.data.find((entry) => entry.id === ABOUT_PAGE_ID) || aboutQuery.data[0];
    for (const step of resolveAboutContent(aboutRecord).approach_steps) slots.push({ key: `about.step.${step.id}`, label: step.title, group: 'About — Our Approach', icon: ICON_NAMES.includes(step.icon) ? step.icon : 'Lightbulb' });
  }
  const knownKeys = new Set(slots.map((slot) => slot.key));
  for (const key of Object.keys(draft || {})) {
    if (!knownKeys.has(key)) slots.push({ key, label: key, group: 'Other saved entries', icon: 'Sparkles' });
  }
  const groups = ['All sections', ...new Set(slots.map((slot) => slot.group))];
  const visibleSlots = slots.filter((slot) => (group === 'All sections' || group === slot.group) && `${slot.label} ${slot.group}`.toLowerCase().includes(search.trim().toLowerCase()));

  const save = useMutation({
    mutationFn: (icons) => {
      const payload = { title: 'Website icons', icons, ...(Number.isInteger(record?.version) ? { version: record.version } : {}) };
      return record?.id ? base44.entities.WebsiteIcons.update(record.id, payload) : base44.entities.WebsiteIcons.create(payload);
    },
    onSuccess: (saved) => {
      setRecord(saved); setDraft(cloneIcons(saved)); setDirty(false); setSaveError('');
      queryClient.setQueryData(['websiteIcons'], [saved]);
      queryClient.invalidateQueries({ queryKey: ['websiteIcons'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      setStatus(IS_DEMO ? 'Icons saved in this browser preview. The live website has not changed.' : 'Website icons saved. The changes are available on the website and recorded in Change History.');
    },
    onError: (error) => setSaveError(`${error.message} Your edits are still here.${error.status === 409 ? ' Another editor may have saved first. Copy your changes before reloading the saved version.' : ''}`),
  });

  const markEdited = () => { setDirty(true); setStatus(''); setSaveError(''); };
  const editSlot = (key, value) => {
    setDraft((current) => ({ ...current, [key]: { icon_name: value.icon_name || '', icon_url: value.icon_url || '' } }));
    markEdited();
  };
  const restoreSlot = (key) => {
    setDraft((current) => { const next = { ...current }; delete next[key]; return next; });
    markEdited();
  };
  const upload = async (file, slot) => {
    setSaveError(''); setStatus('');
    const limit = IS_DEMO ? 500 * 1024 : 5 * 1024 * 1024;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > limit) return setSaveError(`Choose a PNG, JPG or WebP file up to ${IS_DEMO ? '500 KB' : '5 MB'}. SVG uploads are not accepted.`);
    setUploading(slot.label);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      if (!safeAboutImage(result.file_url)) throw new Error('The upload did not return a supported image address.');
      editSlot(slot.key, { icon_name: draft[slot.key]?.icon_name || '', icon_url: result.file_url });
    } catch (error) { setSaveError(`Icon upload failed: ${error.message}`); }
    finally { setUploading(''); }
  };
  const submit = (event) => {
    event.preventDefault(); setStatus(''); setSaveError('');
    for (const [key, value] of Object.entries(draft)) {
      if (value.icon_name && !ICON_NAMES.includes(value.icon_name)) return setSaveError(`Choose an available built-in icon for ${slots.find((slot) => slot.key === key)?.label || key}.`);
      if (value.icon_url && !safeAboutImage(value.icon_url)) return setSaveError(`Use a valid image address or upload for ${slots.find((slot) => slot.key === key)?.label || key}.`);
      if (!IS_DEMO && value.icon_url?.startsWith('data:')) return setSaveError('Upload custom icons to the server or use hosted image addresses before saving. Local preview images cannot be saved to the hosted database.');
    }
    save.mutate(structuredClone(draft));
  };
  const reloadSaved = async () => {
    if (dirty && !window.confirm('Discard your unsaved icon changes and reload the saved version?')) return;
    const result = await query.refetch();
    if (!result.error) {
      const saved = selectRecord(result.data);
      setRecord(saved); setDraft(cloneIcons(saved)); setDirty(false); setSaveError(''); setStatus('Saved icon settings loaded.');
    }
  };

  if (draft === null && !query.error) return <p role="status" className="p-8">Loading website icon editor…</p>;
  const blocked = save.isPending || Boolean(uploading) || Boolean(query.error) || draft === null;

  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-6xl px-4 sm:px-6">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><Link to="/AdminDashboard" aria-label="Back to dashboard" className="rounded-lg border bg-white p-3" onClick={(event) => { if (dirty && !window.confirm('Leave without saving your icon changes?')) event.preventDefault(); }}><ArrowLeft size={20} /></Link><div><h1 className="text-2xl font-bold text-[var(--primary)] sm:text-3xl">Website Icons</h1><p className="mt-1 text-gray-600">Choose built-in icons or upload your approved artwork.</p></div></div>
      <div className="flex flex-wrap gap-3"><a href={import.meta.env.BASE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-[var(--primary)]">View website <ExternalLink size={16} /></a><Button type="submit" form="icons-editor" disabled={blocked}><Save size={18} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Icons'}</Button></div>
    </div>
    <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">The built-in collection contains no pig icons. Only upload or link approved, pig-free public artwork. Uploaded image contents are not automatically checked for pig imagery. Custom images keep their own colors.</p>
    {query.error && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800"><p>Could not load saved icon settings: {query.error.message}</p><Button type="button" variant="outline" onClick={reloadSaved} className="mt-3">Retry loading</Button></div>}
    {(statsQuery.error || aboutQuery.error) && <div role="alert" className="mb-5 rounded-lg bg-amber-50 p-4 text-amber-900"><p>Some statistics or About steps could not be loaded. Their saved icons are preserved under Other saved entries.</p><Button type="button" variant="outline" className="mt-3" onClick={() => { if (statsQuery.error) statsQuery.refetch(); if (aboutQuery.error) aboutQuery.refetch(); }}>Retry loading content</Button></div>}
    {status && <p role="status" className="mb-5 rounded-lg bg-green-50 p-4 text-green-800">{status}</p>}
    {saveError && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800">{saveError}</p>}
    {uploading && <p role="status" className="mb-5 rounded-lg bg-blue-50 p-4 text-blue-800">Uploading {uploading}…</p>}
    {draft !== null && <>
      <div className="mb-6 grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <div><label htmlFor="icon-group" className="mb-2 block text-sm font-medium">Website section</label><select id="icon-group" value={group} onChange={(event) => setGroup(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2">{groups.map((name) => <option key={name}>{name}</option>)}</select></div>
        <div><label htmlFor="icon-search" className="mb-2 block text-sm font-medium">Search icons</label><div className="relative"><Search aria-hidden="true" size={18} className="absolute left-3 top-2.5 text-gray-400" /><Input id="icon-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title or section" className="pl-10" /></div></div>
      </div>
      <p className="mb-4 text-sm text-gray-600">Showing {visibleSlots.length} of {slots.length} icon locations. {dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</p>
      <form id="icons-editor" onSubmit={submit}><fieldset disabled={blocked} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">{visibleSlots.map((slot) => <IconCard key={slot.key} slot={slot} override={draft[slot.key]} onEdit={(value) => editSlot(slot.key, value)} onRestore={() => restoreSlot(slot.key)} onUpload={(file) => upload(file, slot)} />)}</div>
        {visibleSlots.length === 0 && <p className="rounded-xl border bg-white p-8 text-center text-gray-600">No icon locations match this search.</p>}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5"><Button type="submit"><Save size={18} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Icons'}</Button><Button type="button" variant="outline" onClick={reloadSaved}>Reload Saved Version</Button><p className="text-sm text-gray-600">Changes appear after saving.</p></div>
      </fieldset></form>
    </>}
  </div></div>;
}
