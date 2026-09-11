import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const blank = { email: '', name: '', phone: '', password: '', role: 'viewer', verified: false };
export default function AdminUsers() {
  const cache = useQueryClient();
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saved, setSaved] = useState(false);
  const { data: users = [], isLoading, error } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const save = useMutation({
    mutationFn: () => editingId ? base44.entities.User.update(editingId, { ...form, password: form.password || undefined }) : base44.entities.User.create(form),
    onSuccess: () => { cache.invalidateQueries({ queryKey: ['users'] }); setForm(blank); setEditingId(null); setSaved(true); },
  });
  function edit(user) { setEditingId(user.id); setForm({ email: user.email, name: user.name, phone: user.phone, role: user.role, verified: user.verified, is_active: user.is_active, password: '' }); setSaved(false); }
  return <main className="min-h-screen bg-slate-50 py-10 px-4"><div className="max-w-5xl mx-auto space-y-6">
    <Link to="/AdminDashboard" className="text-sm underline">← Admin dashboard</Link>
    <h1 className="text-3xl font-bold text-[var(--primary)]">Team accounts</h1>
    <p className="text-slate-600">Create and approve team access. Passwords are securely hashed by the server and never returned. Updating access or a password signs that user out of existing sessions.</p>
    {IS_DEMO && <p className="bg-amber-50 p-4 rounded-lg">Account management is disabled in preview. Connect QA before entering real credentials.</p>}
    {saved && <p role="status" className="text-green-800">Account saved.</p>}
    {(error || save.error) && <p role="alert" className="text-red-800">{(error || save.error).message}</p>}
    <form onSubmit={(e) => { e.preventDefault(); setSaved(false); save.mutate(); }} className="p-6 bg-white border rounded-xl space-y-4">
      <h2 className="text-xl font-semibold">{editingId ? 'Edit account' : 'Create account'}</h2>
      <fieldset disabled={IS_DEMO || save.isPending} className="grid sm:grid-cols-2 gap-4">
        <label>Name<Input value={form.name} maxLength={255} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label>Email<Input type="email" autoComplete="off" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Phone<Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>{editingId ? 'New password (leave blank to keep)' : 'Initial password (12+ characters)'}<Input type="password" autoComplete="new-password" minLength={12} required={!editingId} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <label>Role<select className="block w-full rounded-md border p-2" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="viewer">Viewer</option><option value="super">Content editor (Super)</option><option value="admin">Administrator</option></select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} />Approved to sign in</label>
        {editingId && <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Account active</label>}
        <div className="flex gap-3"><Button disabled={IS_DEMO || save.isPending}>{save.isPending ? 'Saving…' : 'Save account'}</Button>{editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel</Button>}</div>
      </fieldset>
    </form>
    <p className="text-sm text-slate-500">MFA enrollment and automatic invitations require a real delivery/verification provider; they are not simulated. Share initial access through your approved secure channel.</p>
    {isLoading ? <p>Loading accounts…</p> : <ul className="space-y-3">{users.map((user) => <li key={user.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-5">
      <div><h2 className="font-semibold">{user.name || user.email}</h2><p className="text-sm text-slate-600">{user.email} · {user.role} · {user.is_active && user.verified ? 'Active & approved' : 'Sign-in blocked'}</p><code className="text-xs text-slate-500 break-all">{user.id}</code></div>
      <Button variant="outline" onClick={() => edit(user)}>Edit account</Button>
    </li>)}</ul>}
  </div></main>;
}
