import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { contactInfoClient } from '@/api/contactInfoClient';
import { IS_DEMO } from '@/api/transport';
import { useAuth } from '@/context/AuthContext';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MAX_SOCIAL_LINKS, validateSocialLinks, validateFloatingSocial } from '../../server/src/socialMediaSchema.js';

const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const platformKey = (value) => value.trim().toLowerCase().replace(/\s+/g, '_');
const platformLabel = (value) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const emptyDraft = () => ({ rows: [], enabled: false, side: 'right' });

// Strict reads prevent an editor from silently dropping invalid saved content.
function readSocialContact(contact) {
  if (!contact) return { draft: emptyDraft(), record: null };
  const social_links = validateSocialLinks(contact.social_links);
  const floating_social = validateFloatingSocial(contact.floating_social, social_links);
  const version = contact.version === undefined ? 1 : contact.version;
  if (!Number.isSafeInteger(version) || version < 1) throw new Error('The saved contact version is invalid. Reload before editing.');
  const keys = [...floating_social.platforms, ...Object.keys(social_links).filter((key) => !floating_social.platforms.includes(key))];
  return {
    record: { id: contact.id, version },
    draft: { enabled: floating_social.enabled, side: floating_social.side, rows: keys.map((platform, index) => ({ id: `social-${index}`, platform, url: social_links[platform], floating: floating_social.platforms.includes(platform) })) },
  };
}

function socialPayload(draft) {
  const names = new Set(); const entries = []; const platforms = [];
  for (const row of draft.rows) {
    const platform = platformKey(row.platform);
    if (!platform && !row.url.trim() && !row.floating) continue;
    if (!platform || !row.url.trim()) throw new Error('Each profile needs a platform name and a full website URL. Remove empty profiles you do not need.');
    if (names.has(platform)) throw new Error('Each platform must be unique. Names are matched without case and spaces become underscores.');
    names.add(platform); entries.push([platform, row.url]);
    if (row.floating) platforms.push(platform);
  }
  const social_links = validateSocialLinks(Object.fromEntries(entries));
  const floating_social = validateFloatingSocial({ enabled: draft.enabled, side: draft.side, platforms }, social_links);
  return { social_links, floating_social };
}

export default function AdminSocialMedia() {
  const { user } = useAuth();
  return <SocialMediaEditor key={user?.id || 'signed-out'} userId={user?.id} />;
}

function SocialMediaEditor({ userId }) {
  const queryClient = useQueryClient();
  const [restored] = useState(() => userId ? queryClient.getQueryData(['socialMediaDraft', userId]) : null);
  const [draft, setDraft] = useState(() => restored ? structuredClone(restored.draft) : null);
  const [baseline, setBaseline] = useState(() => restored ? structuredClone(restored.baseline) : null);
  const [record, setRecord] = useState(() => restored ? structuredClone(restored.record) : null);
  const [status, setStatus] = useState(restored ? 'Your unsaved social media draft was restored. Review it before saving.' : '');
  const [saveError, setSaveError] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [reloading, setReloading] = useState(false);
  const confirmRef = useRef(null);
  const dirty = draft !== null && !same(draft, baseline);
  const query = useQuery({ queryKey: ['contactInfo'], queryFn: () => contactInfoClient.list() });
  let saved = null; let loadError = query.error?.message || '';
  if (query.data !== undefined) {
    try {
      if (!Array.isArray(query.data)) throw new Error('The saved contact settings could not be read.');
      const contact = record?.id ? query.data.find((item) => String(item.id) === String(record.id)) : query.data[0];
      if (record?.id && !contact) throw new Error('This contact profile is no longer available. Your draft has been kept.');
      saved = readSocialContact(contact);
    } catch (failure) { loadError = failure.message; }
  }
  const remoteChanged = Boolean(record && saved?.record && record.version !== saved.record.version);
  const cacheDraft = useCallback((next, nextRecord, nextBaseline) => {
    const key = ['socialMediaDraft', userId];
    if (userId && next !== null && !same(next, nextBaseline)) {
      queryClient.setQueryDefaults(key, { gcTime: Infinity });
      queryClient.setQueryData(key, { draft: structuredClone(next), record: structuredClone(nextRecord), baseline: structuredClone(nextBaseline) });
    } else queryClient.removeQueries({ queryKey: key, exact: true });
  }, [queryClient, userId]);
  const acceptSaved = useCallback((next) => {
    cacheDraft(next.draft, next.record, next.draft);
    setDraft(next.draft); setBaseline(structuredClone(next.draft)); setRecord(next.record);
  }, [cacheDraft]);
  const edit = (next) => {
    cacheDraft(next, record, baseline); setDraft(next);
    setStatus(''); setSaveError(''); setConfirmation(false);
  };
  const setRow = (index, key, value) => edit({ ...draft, rows: draft.rows.map((row, current) => current === index ? { ...row, [key]: value } : row) });
  const moveRow = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= draft.rows.length) return;
    const rows = [...draft.rows]; [rows[index], rows[target]] = [rows[target], rows[index]];
    edit({ ...draft, rows });
  };
  const save = useMutation({
    mutationFn: async ({ content, original }) => {
      const payload = socialPayload(content);
      const result = original?.id
        ? await contactInfoClient.update(original.id, { ...payload, version: original.version })
        : await contactInfoClient.create(payload);
      readSocialContact(result);
      return result;
    },
    onSuccess: (contact) => {
      acceptSaved(readSocialContact(contact)); setSaveError(''); setConfirmation(false);
      queryClient.setQueryData(['contactInfo'], (old = []) => old.some((item) => String(item.id) === String(contact.id)) ? old.map((item) => String(item.id) === String(contact.id) ? contact : item) : [...old, contact]);
      queryClient.invalidateQueries({ queryKey: ['contactInfo'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      window.dispatchEvent(new Event('d16-branding-refresh'));
      setStatus(`Social media links and floating buttons saved.${IS_DEMO ? ' This preview is saved only in this browser; other visitors and production are unchanged.' : ''}`);
    },
    onError: (failure) => {
      setStatus('');
      setSaveError(failure.status === 409
        ? 'Another editor saved newer contact settings. Your draft is still here. Copy changes you want to keep before choosing Reload Saved.'
        : `Could not save: ${failure.message} Your draft is still here.`);
      if (failure.status === 409) queryClient.invalidateQueries({ queryKey: ['contactInfo'] });
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
  useEffect(() => { if (confirmation) { confirmRef.current?.scrollIntoView({ block: 'nearest' }); confirmRef.current?.focus({ preventScroll: true }); } }, [confirmation]);
  const reload = async () => {
    setReloading(true); setConfirmation(false); setSaveError(''); setStatus('');
    try {
      const result = await query.refetch();
      if (result.error) throw result.error;
      if (!Array.isArray(result.data)) throw new Error('The saved contact settings could not be read.');
      const contact = record?.id ? result.data.find((item) => String(item.id) === String(record.id)) : result.data[0];
      if (record?.id && !contact) throw new Error('The saved profile is no longer available.');
      acceptSaved(readSocialContact(contact)); setStatus('Saved social media settings loaded.');
    } catch (failure) { setSaveError(`Could not reload: ${failure.message} Your draft has been kept.`); }
    finally { setReloading(false); }
  };
  const submit = (event) => {
    event.preventDefault();
    if (busy || !draft || loadError) return;
    setSaveError(''); setStatus(''); setConfirmation(false);
    try { socialPayload(draft); save.mutate({ content: structuredClone(draft), original: record }); }
    catch (failure) { setSaveError(failure.message); }
  };
  const selected = draft?.rows.filter((row) => row.floating) || [];

  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-4xl px-4 sm:px-6">
    <div className="mb-6 flex items-center gap-4"><Link to={createPageUrl('AdminDashboard')} className="rounded-md border bg-white p-3 text-[var(--primary)]" aria-label="Back to dashboard"><ArrowLeft size={20} /></Link><div><h1 className="text-3xl font-bold text-[var(--primary)]">Social Media Management</h1><p className="mt-1 text-gray-600">Manage footer profiles and choose which buttons remain visible while visitors scroll.</p></div></div>
    {IS_DEMO && <p className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Browser preview: saved changes stay in this browser only. Other visitors and DianaHost production will not see your test changes.</p>}
    <p className="mb-5 text-sm text-gray-600">Unsaved edits stay in this signed-in session while you navigate. Reloading the browser or signing out discards unsaved edits.</p>
    {query.isPending && <p role="status" className="mb-5">Loading social profiles…</p>}
    {loadError && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800"><p>Could not load social settings: {loadError} No saved settings have been replaced.</p><Button type="button" variant="outline" className="mt-3" disabled={busy} onClick={() => query.refetch()}>Retry Loading</Button></div>}
    {status && <p role="status" className="mb-5 rounded-lg bg-green-50 p-4 text-green-800">{status}</p>}
    {saveError && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800">{saveError}</p>}
    {remoteChanged && <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4 text-amber-900">Saved contact settings have changed since you opened this draft. Your edits have been kept. Reload Saved to use the latest version.</p>}
    {confirmation && <section ref={confirmRef} tabIndex={-1} role="alertdialog" aria-labelledby="social-reload-title" aria-describedby="social-reload-description" className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4"><h2 id="social-reload-title" className="font-semibold">Discard your unsaved social media changes?</h2><p id="social-reload-description" className="mt-2 text-sm">Reload Saved will replace this draft with the latest saved settings. Previously saved links will not change.</p><div className="mt-4 flex flex-wrap gap-3"><Button type="button" disabled={busy} onClick={reload}>Discard Draft & Reload</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setConfirmation(false)}>Keep Editing</Button></div></section>}
    {draft && <form onSubmit={submit} noValidate aria-label="Social media settings"><fieldset disabled={busy || Boolean(loadError)} className="space-y-6">
      <Card><CardHeader><CardTitle>Floating media buttons</CardTitle></CardHeader><CardContent className="space-y-4">
        <label className="flex items-start gap-3 font-medium"><input type="checkbox" className="mt-1 h-4 w-4" checked={draft.enabled} onChange={(event) => edit({ ...draft, enabled: event.target.checked })} /><span>Show floating media buttons<span className="mt-1 block text-sm font-normal text-gray-600">Selected profiles stay visible on public pages while scrolling. Switch this off to keep footer links only.</span></span></label>
        <div><Label htmlFor="floating-media-side">Screen side</Label><select id="floating-media-side" className="mt-2 block rounded-md border bg-white px-3 py-2" value={draft.side} onChange={(event) => edit({ ...draft, side: event.target.value })}><option value="right">Right</option><option value="left">Left</option></select></div>
        <div className="rounded-lg bg-gray-50 p-4" aria-label="Floating buttons preview"><p className="text-sm font-medium">{draft.enabled ? `Selected buttons — ${draft.side} side` : 'Floating buttons are switched off'}</p>{selected.length ? <div className="mt-3 flex flex-wrap gap-2">{selected.map((row) => <span key={row.id} className="rounded-full border bg-white px-3 py-1 text-sm">{platformLabel(row.platform.trim()) || 'Unnamed profile'}</span>)}</div> : <p className="mt-2 text-sm text-gray-600">No floating buttons selected. Choose one or more profiles below; there is no minimum.</p>}<p className="mt-3 text-xs text-gray-500">Preview labels only; changes appear on the public website after saving. All saved profiles remain in the footer, whether selected here or not.</p></div>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Social accounts</CardTitle></CardHeader><CardContent className="space-y-5">
        <p className="text-sm text-gray-600">Use Up and Down to choose the order. Select any number of your profiles to keep visible while scrolling. Platform names may use spaces; for example, “Design Channel” is saved as “design_channel”.</p>
        {draft.rows.length === 0 && <p className="rounded-lg bg-gray-50 p-6 text-center text-gray-600">No social profiles added yet. Add the accounts you want visitors to find.</p>}
        {draft.rows.map((row, index) => <div key={row.id} className="space-y-4 rounded-xl border p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr]"><div className="space-y-2"><Label htmlFor={`platform-${row.id}`}>Platform {index + 1}</Label><Input id={`platform-${row.id}`} value={row.platform} maxLength={64} placeholder="e.g. WhatsApp or YouTube" onChange={(event) => setRow(index, 'platform', event.target.value)} /></div><div className="space-y-2"><Label htmlFor={`profile-url-${row.id}`}>Profile URL {index + 1}</Label><Input id={`profile-url-${row.id}`} type="url" value={row.url} maxLength={2048} placeholder="https://…" onChange={(event) => setRow(index, 'url', event.target.value)} /></div></div>
          <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" className="h-4 w-4" checked={row.floating} onChange={(event) => setRow(index, 'floating', event.target.checked)} /><span>Keep {platformLabel(row.platform.trim()) || `profile ${index + 1}`} visible while scrolling</span></label>
          <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={index === 0} aria-label={`Move ${row.platform || `profile ${index + 1}`} up`} onClick={() => moveRow(index, -1)}><ArrowUp size={16} className="mr-1" />Up</Button><Button type="button" size="sm" variant="outline" disabled={index === draft.rows.length - 1} aria-label={`Move ${row.platform || `profile ${index + 1}`} down`} onClick={() => moveRow(index, 1)}><ArrowDown size={16} className="mr-1" />Down</Button><Button type="button" size="sm" variant="outline" aria-label={`Remove ${row.platform || `profile ${index + 1}`}`} onClick={() => edit({ ...draft, rows: draft.rows.filter((item) => item.id !== row.id) })}><Trash2 size={16} className="mr-1" />Remove</Button></div>
        </div>)}
        <Button type="button" variant="outline" disabled={draft.rows.length >= MAX_SOCIAL_LINKS} onClick={() => edit({ ...draft, rows: [...draft.rows, { id: crypto.randomUUID(), platform: '', url: '', floating: false }] })}><Plus size={18} className="mr-2" />Add Link</Button>
        {draft.rows.length >= MAX_SOCIAL_LINKS && <p className="text-sm text-gray-600">The safety limit is {MAX_SOCIAL_LINKS} profiles. Edit or remove a profile to add another.</p>}
      </CardContent></Card>
      <div className="flex flex-wrap items-center gap-3"><Button type="submit"><Save size={17} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Social Media Links'}</Button><Button type="button" variant="outline" onClick={() => dirty ? setConfirmation(true) : reload()}><RefreshCw size={17} className="mr-2" />Reload Saved</Button><span className="text-sm text-gray-600">{dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</span></div>
    </fieldset></form>}
  </div></div>;
}
