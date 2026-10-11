import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { requestJson, IS_DEMO } from '@/api/transport';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, MessageSquare, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

const dateLabel = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? format(date, 'MMM d, yyyy HH:mm') : 'Date unavailable';
};

function ConsultationThread({ consultation, canWrite }) {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('note');
  const [channel, setChannel] = useState('internal');
  const [body, setBody] = useState('');
  const [sentManually, setSentManually] = useState(false);
  const threadKey = ['consultation-messages', consultation.id];
  const thread = useQuery({
    queryKey: threadKey,
    queryFn: () => requestJson(`/consultations/${encodeURIComponent(consultation.id)}/messages`),
    enabled: open && !IS_DEMO,
  });
  const saveMessage = useMutation({
    mutationFn: () => requestJson(`/consultations/${encodeURIComponent(consultation.id)}/messages`, {
      method: 'POST', body: JSON.stringify({ message_kind: kind, channel, body, sent_manually: sentManually }),
    }),
    onSuccess: () => {
      setBody(''); setSentManually(false);
      cache.invalidateQueries({ queryKey: threadKey });
    },
  });

  function changeKind(value) {
    setKind(value);
    setChannel(value === 'note' ? 'internal' : 'email');
    setSentManually(false);
  }

  return <section className="mt-5 border-t pt-4">
    <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}>
      <MessageSquare size={16} className="mr-2" />{open ? 'Hide history' : 'Conversation history'}
    </Button>
    {open && <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">Original website request · {dateLabel(consultation.created_date || consultation.created_at)}</p>
        {consultation.message ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{consultation.message}</p> : <p className="mt-2 text-sm text-slate-600">No message text was submitted.</p>}
      </div>
      {IS_DEMO ? <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Preview mode does not store private client conversations. Connect the QA database before using real client data.</p> : <>
        {thread.isLoading && <p className="text-sm text-slate-600">Loading history…</p>}
        {thread.error && <p role="alert" className="text-sm text-red-800">{thread.error.message}</p>}
        {(thread.data || []).map((message) => <article key={message.id} className="rounded-lg border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{message.message_kind === 'note' ? 'Internal note' : `Reply logged · ${message.channel}`}</p>
            <time className="text-xs text-slate-500">{dateLabel(message.created_at)}</time>
          </div>
          <p className="mt-1 text-xs text-slate-600">By {message.actor_name}{message.delivery_status === 'logged_manual' ? ' · marked as sent outside this website' : ' · visible to authorized admins only'}</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{message.body}</p>
        </article>)}
        {!thread.isLoading && !thread.error && !(thread.data || []).length && <p className="text-sm text-slate-600">No staff notes or reply history yet.</p>}
        {canWrite ? <form className="space-y-3 rounded-lg border bg-slate-50 p-4" onSubmit={(event) => { event.preventDefault(); saveMessage.mutate(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Entry type
              <select className="mt-1 block w-full rounded-md border bg-white p-2" value={kind} onChange={(event) => changeKind(event.target.value)}>
                <option value="note">Internal note</option><option value="reply">Log a reply already sent</option>
              </select>
            </label>
            {kind === 'reply' && <label className="text-sm font-medium">Sent through
              <select className="mt-1 block w-full rounded-md border bg-white p-2" value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="email">Email</option><option value="sms">SMS / cell message</option><option value="whatsapp">WhatsApp</option><option value="social">Other social media</option>
              </select>
            </label>}
          </div>
          <label className="block text-sm font-medium">{kind === 'note' ? 'Private note' : 'Copy of the reply'}</label>
          <Textarea value={body} maxLength={20000} rows={4} onChange={(event) => setBody(event.target.value)} placeholder={kind === 'note' ? 'Add information for your team…' : 'Record what you sent to the client…'} required />
          {kind === 'reply' && <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={sentManually} onChange={(event) => setSentManually(event.target.checked)} className="mt-1" />I already sent this message outside the website. This form only records it; it will not send anything.</label>}
          {saveMessage.error && <p role="alert" className="text-sm text-red-800">{saveMessage.error.message}</p>}
          <Button type="submit" disabled={saveMessage.isPending || !body.trim() || (kind === 'reply' && !sentManually)}>{saveMessage.isPending ? 'Saving…' : kind === 'note' ? 'Save internal note' : 'Log sent reply'}</Button>
        </form> : <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-700">You have view-only access to this request.</p>}
      </>}
    </div>}
  </section>;
}

export default function AdminConsultations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: consultations = [], isLoading, error } = useQuery({
    queryKey: ['consultations'], queryFn: () => base44.entities.Consultation.list('-created_date'),
  });
  const canWrite = user?.permissions?.includes('consultations.write') || user?.role === 'admin';
  const canAssign = user?.permissions?.includes('users.manage') || user?.role === 'admin';
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list(), enabled: !IS_DEMO && canAssign });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => base44.entities.Consultation.update(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['consultations'] }),
  });
  const statusColors = { pending: 'bg-yellow-100 text-yellow-800', contacted: 'bg-blue-100 text-blue-800', in_progress: 'bg-purple-100 text-purple-800', completed: 'bg-green-100 text-green-800' };

  return <main className="min-h-screen bg-gray-50 py-6 sm:py-12">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <header className="mb-6 flex items-center gap-3 sm:mb-8 sm:gap-4">
        <Link to={createPageUrl('AdminDashboard')}><Button variant="outline" size="icon" aria-label="Back to dashboard"><ArrowLeft size={20} /></Button></Link>
        <div><h1 className="text-2xl font-bold text-[var(--primary)] sm:text-3xl">Client Requests & Inbox</h1><p className="mt-1 text-sm text-gray-600 sm:text-base">Review requests, assign an owner and keep a private history.</p></div>
      </header>
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><LockKeyhole size={18} className="mt-0.5 shrink-0" /><p>Messages are encrypted and saved in the database. This inbox does not send email, SMS, WhatsApp or social-media messages; use the contact links to reach the client, then log the sent reply here.</p></div>
      {IS_DEMO && <p className="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Preview mode: personal client data and conversation history are not saved here. Connect QA before testing with real client information.</p>}
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">{error.message}</p>}
      {updateMutation.error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">{updateMutation.error.message}</p>}
      {isLoading ? <p className="py-12 text-center text-gray-500">Loading requests…</p> : consultations.length === 0 ? <p className="py-12 text-center text-gray-500">No consultation requests yet.</p> : <div className="space-y-4">
        {consultations.map((consultation) => <Card key={consultation.id}><CardContent className="p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-6 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="mb-2 text-xl font-bold text-[var(--primary)]">{consultation.full_name}</h2><Badge className={statusColors[consultation.status] || 'bg-slate-100 text-slate-700'}>{String(consultation.status).replace(/_/g, ' ')}</Badge></div><time className="text-sm text-gray-500">{dateLabel(consultation.created_date || consultation.created_at)}</time></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 break-all text-sm text-gray-600"><Mail size={16} className="shrink-0 text-[var(--accent)]" /><a href={`mailto:${consultation.email}`} className="hover:text-[var(--primary)]">{consultation.email}</a></div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={16} className="shrink-0 text-[var(--accent)]" /><a href={`tel:${consultation.phone}`} className="hover:text-[var(--primary)]">{consultation.phone}</a></div>
                {consultation.location && <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin size={16} className="text-[var(--accent)]" />{consultation.location}</div>}
                {consultation.preferred_date && <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar size={16} className="text-[var(--accent)]" />{dateLabel(consultation.preferred_date).split(' ').slice(0, 3).join(' ')}</div>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2"><div><span className="text-sm font-semibold text-gray-700">Project type</span><p className="text-sm text-gray-600">{consultation.project_type || 'Not specified'}</p></div>{consultation.budget && <div><span className="text-sm font-semibold text-gray-700">Budget</span><p className="text-sm text-gray-600">{consultation.budget}</p></div>}</div>
            </div>
            <aside className="space-y-4 lg:w-64 lg:shrink-0">
              <div><Label className="mb-2 block text-sm font-semibold text-gray-700">Status</Label><Select disabled={!canWrite} value={consultation.status} onValueChange={(status) => updateMutation.mutate({ id: consultation.id, updates: { status } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select></div>
              {!IS_DEMO && canAssign && <div><Label className="mb-2 block text-sm font-semibold text-gray-700">Assigned to</Label><select disabled={!canWrite} className="block w-full rounded-md border bg-white p-2 text-sm disabled:opacity-60" value={consultation.assigned_to_user_id || 'unassigned'} onChange={(event) => updateMutation.mutate({ id: consultation.id, updates: { assigned_to_user_id: event.target.value === 'unassigned' ? null : event.target.value } })}><option value="unassigned">Unassigned</option>{users.filter((teamUser) => teamUser.is_active && teamUser.verified && teamUser.permissions?.includes('consultations.read') && teamUser.permissions?.includes('consultations.write')).map((teamUser) => <option key={teamUser.id} value={teamUser.id}>{teamUser.name || teamUser.email}</option>)}</select></div>}
            </aside>
          </div>
          <ConsultationThread consultation={consultation} canWrite={canWrite} />
        </CardContent></Card>)}
      </div>}
    </div>
  </main>;
}
