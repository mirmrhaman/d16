import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, Plus, Save, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { DEFAULT_ABOUT, safeAboutImage } from '@/data/aboutContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

const cloneContent = (record) => structuredClone(Object.fromEntries(
  Object.entries(DEFAULT_ABOUT).map(([key, value]) => [key, record?.[key] ?? value]),
));

function TextField({ label, value, onChange, multiline = false, required = false, maxLength = multiline ? 10000 : 300 }) {
  const id = React.useId();
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium text-gray-800">{label}</label>
    {multiline
      ? <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} rows={4} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" />
      : <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} maxLength={maxLength} />}
  </div>;
}

function ImageField({ label, value, onChange, onUpload }) {
  const id = React.useId();
  return <div className="space-y-3 rounded-xl border bg-gray-50 p-4">
    <label htmlFor={id} className="block text-sm font-medium text-gray-800">{label} — image address</label>
    <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={2048} placeholder="https://… or /uploads/…" />
    <label htmlFor={`${id}-upload`} className="block text-sm text-gray-600">Or upload JPG, PNG or WebP ({IS_DEMO ? 'up to 500 KB in this preview' : 'up to 5 MB'})</label>
    <input id={`${id}-upload`} type="file" accept="image/jpeg,image/png,image/webp" className="block w-full min-w-0 text-sm" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onUpload(file); }} />
    {safeAboutImage(value) && <img src={safeAboutImage(value)} alt={`${label} preview`} className="h-32 w-48 rounded-lg object-cover" />}
  </div>;
}

function RowActions({ label, index, count, onMove, onRemove }) {
  return <div className="flex flex-wrap gap-2">
    <Button type="button" variant="outline" size="sm" disabled={index === 0} aria-label={`Move ${label} up`} onClick={() => onMove(-1)}><ArrowUp size={16} /><span className="ml-1">Up</span></Button>
    <Button type="button" variant="outline" size="sm" disabled={index === count - 1} aria-label={`Move ${label} down`} onClick={() => onMove(1)}><ArrowDown size={16} /><span className="ml-1">Down</span></Button>
    <Button type="button" variant="outline" size="sm" aria-label={`Remove ${label}`} onClick={onRemove}><Trash2 size={16} /><span className="ml-1">Remove</span></Button>
  </div>;
}

export default function AdminAbout() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['aboutPage', 'admin'], queryFn: () => base44.entities.AboutPage.list(), refetchOnWindowFocus: false });
  const [draft, setDraft] = useState(null);
  const [record, setRecord] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    if (query.isSuccess && draft === null) {
      setRecord(query.data[0] || null);
      setDraft(cloneContent(query.data[0]));
    }
  }, [query.isSuccess, query.data, draft]);

  useEffect(() => {
    if (!dirty && !uploading) return;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, uploading]);

  const save = useMutation({
    mutationFn: (payload) => record?.id
      ? base44.entities.AboutPage.update(record.id, { ...payload, ...(record.version ? { version: record.version } : {}) })
      : base44.entities.AboutPage.create(payload),
    onSuccess: (saved) => {
      setRecord(saved); setDraft(cloneContent(saved)); setDirty(false); setSaveError('');
      queryClient.setQueryData(['aboutPage', 'admin'], [saved]);
      queryClient.setQueryData(['aboutPage', 'public'], saved);
      queryClient.invalidateQueries({ queryKey: ['aboutPage', 'public'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      setStatus(IS_DEMO ? 'Saved in this browser preview. Open About Us to see your changes. This does not change the live website.' : 'About page saved. Your changes are now available on the public page and recorded in Change History.');
    },
    onError: (error) => { setSaveError(`${error.message} Your edits are still here.${error.status === 409 ? ' Another editor may have saved first. Copy any changes you want to keep, then reload the saved version.' : ''}`); },
  });

  const edit = (key, value) => { setDraft((current) => ({ ...current, [key]: value })); setDirty(true); setStatus(''); setSaveError(''); };
  const updateRow = (key, id, field, value) => edit(key, draft[key].map((row) => row.id === id ? { ...row, [field]: value } : row));
  const moveRow = (key, index, direction) => {
    const rows = [...draft[key]];
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    edit(key, rows);
  };
  const upload = async (file, label, onChange) => {
    setSaveError(''); setStatus('');
    const limit = (IS_DEMO ? 0.5 : 5) * 1024 * 1024;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > limit) {
      setSaveError(`Choose a JPG, PNG or WebP smaller than ${IS_DEMO ? '500 KB' : '5 MB'}.`); return;
    }
    setUploading(label);
    try { const result = await base44.integrations.Core.UploadFile({ file }); onChange(result.file_url); }
    catch (error) { setSaveError(`Image upload failed: ${error.message}`); }
    finally { setUploading(''); }
  };
  const submit = (event) => {
    event.preventDefault(); setStatus(''); setSaveError('');
    const images = [draft.hero_image, draft.philosophy_image, ...draft.team_members.map((member) => member.image)];
    if (images.some((url) => url && !safeAboutImage(url))) return setSaveError('Use a valid https:// image address, a supported upload, or leave the image blank.');
    save.mutate(structuredClone(draft));
  };
  const reloadSaved = async () => {
    if (dirty && !window.confirm('Discard your unsaved About edits and load the saved version?')) return;
    const result = await query.refetch();
    if (!result.error) { setRecord(result.data[0] || null); setDraft(cloneContent(result.data[0])); setDirty(false); setSaveError(''); setStatus('Saved version loaded.'); }
  };

  if (!draft && !query.error) return <p role="status" className="p-8">Loading About page editor…</p>;
  const text = (key, label, multiline = false, required = false) => <TextField key={key} label={label} value={draft[key]} onChange={(value) => edit(key, value)} multiline={multiline} required={required} />;
  const image = (key, label) => <ImageField label={label} value={draft[key]} onChange={(value) => edit(key, value)} onUpload={(file) => upload(file, label, (value) => edit(key, value))} />;

  return <div className="min-h-screen bg-gray-50 py-8 sm:py-12"><div className="mx-auto max-w-5xl px-4 sm:px-6">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4"><Link to="/AdminDashboard" aria-label="Back to dashboard" className="rounded-lg border bg-white p-3" onClick={(event) => { if (dirty && !window.confirm('Leave without saving your About edits?')) event.preventDefault(); }}><ArrowLeft size={20} /></Link><div><h1 className="text-2xl font-bold text-[var(--primary)] sm:text-3xl">About Us & Team</h1><p className="mt-1 text-gray-600">Manage your story, mission, vision and the people behind D16.</p></div></div>
      <div className="flex flex-wrap gap-3"><a href={`${import.meta.env.BASE_URL}About`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium text-[var(--primary)]">View About Us <ExternalLink size={16} /></a><Button type="submit" form="about-editor" disabled={!draft || save.isPending || Boolean(uploading) || Boolean(query.error)}><Save size={18} className="mr-2" />{save.isPending ? 'Saving…' : 'Save Changes'}</Button></div>
    </div>
    <p className="mb-6 text-sm text-gray-600">Changes appear on the About page after you save. Team profiles are public: only add approved names, roles and photographs.</p>
    <nav aria-label="About editor sections" className="mb-6 flex flex-wrap gap-2">{[['story', 'About Us'], ['approach', 'Our Approach'], ['mission-vision', 'Mission & Vision'], ['team', 'Skilled Team']].map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-full border bg-white px-4 py-2 text-sm font-medium text-[var(--primary)]">{label}</a>)}</nav>
    {query.error && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800"><p>Could not load the saved About page: {query.error.message}</p><Button type="button" variant="outline" onClick={reloadSaved} className="mt-3">Retry loading</Button></div>}
    {status && <p role="status" className="mb-5 rounded-lg bg-green-50 p-4 text-green-800">{status}</p>}
    {saveError && <p role="alert" className="mb-5 rounded-lg bg-red-50 p-4 text-red-800">{saveError}</p>}
    {uploading && <p role="status" className="mb-5 rounded-lg bg-blue-50 p-4 text-blue-800">Uploading {uploading}…</p>}
    {draft && <form id="about-editor" onSubmit={submit}><fieldset disabled={save.isPending || Boolean(uploading) || Boolean(query.error)} className="space-y-6">
      <Card id="story" className="scroll-mt-32"><CardHeader><CardTitle>About Us & Our Philosophy</CardTitle></CardHeader><CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">{text('title', 'Page title', false, true)}{text('subtitle', 'Hero tagline')}</div>
        {image('hero_image', 'Hero banner')}
        {text('philosophy_title', 'Philosophy heading', false, true)}
        {text('philosophy_text', 'Philosophy — opening paragraph', true)}
        {text('philosophy_detail', 'Philosophy — second paragraph', true)}
        {text('mission_summary', 'Highlighted statement', true)}
        {image('philosophy_image', 'Philosophy photo')}
      </CardContent></Card>

      <Card id="approach" className="scroll-mt-32"><CardHeader><CardTitle>Our Approach</CardTitle></CardHeader><CardContent className="space-y-5">
        <p className="text-sm text-gray-600">Custom uploaded icons take priority over the built-in selections below.{user?.role === 'admin' && <> <Link to="/AdminIcons" className="underline">Manage approach, mission and vision icons in Website Icons.</Link></>}</p>
        {text('approach_title', 'Approach heading', false, true)}{text('approach_subtitle', 'Approach subtitle')}
        {draft.approach_steps.length === 0 && <p className="text-gray-600">No approach steps. Add a step to show your process.</p>}
        {draft.approach_steps.map((step, index) => <div key={step.id} className="space-y-4 rounded-xl border p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Step {index + 1}</h3><RowActions label={`step ${index + 1}`} index={index} count={draft.approach_steps.length} onMove={(direction) => moveRow('approach_steps', index, direction)} onRemove={() => edit('approach_steps', draft.approach_steps.filter((item) => item.id !== step.id))} /></div>
          <TextField label={`Step ${index + 1} title`} value={step.title} required onChange={(value) => updateRow('approach_steps', step.id, 'title', value)} />
          <TextField label={`Step ${index + 1} description`} value={step.description} multiline required maxLength={5000} onChange={(value) => updateRow('approach_steps', step.id, 'description', value)} />
          <label className="block space-y-2 text-sm font-medium"><span>Step {index + 1} icon</span><select className="block w-full rounded-md border bg-white px-3 py-2" value={step.icon} onChange={(event) => updateRow('approach_steps', step.id, 'icon', event.target.value)}>{['Lightbulb', 'Rocket', 'Award', 'Sparkles'].map((icon) => <option key={icon}>{icon}</option>)}</select></label>
        </div>)}
        <Button type="button" variant="outline" disabled={draft.approach_steps.length >= 12} onClick={() => edit('approach_steps', [...draft.approach_steps, { id: crypto.randomUUID(), title: '', description: '', icon: 'Lightbulb' }])}><Plus size={18} className="mr-2" />Add Approach Step</Button>
      </CardContent></Card>

      <Card id="mission-vision" className="scroll-mt-32"><CardHeader><CardTitle>Mission & Vision</CardTitle></CardHeader><CardContent className="space-y-5">
        {text('principles_title', 'Section heading', false, true)}{text('principles_subtitle', 'Section subtitle')}
        <div className="grid gap-6 md:grid-cols-2"><div className="space-y-5 rounded-xl border p-4">{text('vision_title', 'Vision heading', false, true)}{text('vision_text', 'Vision statement', true)}</div><div className="space-y-5 rounded-xl border p-4">{text('mission_title', 'Mission heading', false, true)}{text('mission_text', 'Mission statement', true)}</div></div>
      </CardContent></Card>

      <Card id="team" className="scroll-mt-32"><CardHeader><CardTitle>Meet Our Skilled Team</CardTitle></CardHeader><CardContent className="space-y-5">
        {text('team_title', 'Team heading', false, true)}{text('team_subtitle', 'Team subtitle')}
        <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">The starting profiles are sample content from the existing page. Replace them with your approved team members before publishing.</p>
        {draft.team_members.length === 0 && <p className="text-gray-600">No team members. Add a member when you are ready; removed profiles will not reappear.</p>}
        <div className="grid gap-5 md:grid-cols-2">{draft.team_members.map((member, index) => <div key={member.id} className="min-w-0 space-y-4 rounded-xl border p-4 sm:p-5">
          <h3 className="font-semibold">Team member {index + 1}</h3>
          <TextField label={`Team member ${index + 1} name`} value={member.name} required onChange={(value) => updateRow('team_members', member.id, 'name', value)} />
          <TextField label={`Team member ${index + 1} role`} value={member.role} required onChange={(value) => updateRow('team_members', member.id, 'role', value)} />
          <ImageField label={`Team member ${index + 1} photo`} value={member.image} onChange={(value) => updateRow('team_members', member.id, 'image', value)} onUpload={(file) => upload(file, member.name || 'team photo', (value) => updateRow('team_members', member.id, 'image', value))} />
          <RowActions label={`team member ${index + 1}`} index={index} count={draft.team_members.length} onMove={(direction) => moveRow('team_members', index, direction)} onRemove={() => edit('team_members', draft.team_members.filter((item) => item.id !== member.id))} />
        </div>)}</div>
        <Button type="button" variant="outline" disabled={draft.team_members.length >= 50} onClick={() => edit('team_members', [...draft.team_members, { id: crypto.randomUUID(), name: '', role: '', image: '' }])}><Plus size={18} className="mr-2" />Add Team Member</Button>
      </CardContent></Card>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5">
        <Button type="submit"><Save size={18} className="mr-2" />{save.isPending ? 'Saving…' : 'Save About Page'}</Button>
        <Button type="button" variant="outline" onClick={reloadSaved}>Reload Saved Version</Button>
        <p className="text-sm text-gray-600">{dirty ? 'You have unsaved changes.' : 'No unsaved changes.'}</p>
      </div>
    </fieldset></form>}
  </div></div>;
}
