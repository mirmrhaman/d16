import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';

const utcDate = (value) => {
  if (!value) return 'Unknown time';
  const date = new Date(/[Z+]/.test(value) ? value : value.replace(' ', 'T') + 'Z');
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString(undefined, { timeZoneName: 'short' });
};
export default function AdminHistory() {
  const { data: logs = [], isLoading, error, refetch } = useQuery({ queryKey: ['auditLogs'], queryFn: () => base44.entities.AuditLog.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });
  const actors = new Map(users.map((user) => [user.id, user.name || user.email]));
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><div className="max-w-6xl mx-auto space-y-6">
    <Link to="/AdminDashboard" className="text-sm underline">← Admin dashboard</Link>
    <div className="flex items-center justify-between gap-4"><h1 className="text-3xl font-bold text-[var(--primary)]">Change history</h1><button className="rounded-lg border px-4 py-2" onClick={() => refetch()}>Refresh</button></div>
    <p className="text-slate-600">Latest 100 recorded events. Times are displayed in your device’s timezone. The log stores identity, action and changed field names—not confidential values.</p>
    {IS_DEMO && <p className="bg-amber-50 p-4 rounded-lg">Real change history is available after the QA database is connected. Preview edits are not audited.</p>}
    {error && <p role="alert" className="text-red-700">{error.message}</p>}
    {isLoading ? <p>Loading history…</p> : !logs.length ? <p>No recorded events available.</p> : <div className="overflow-x-auto rounded-xl bg-white border">
      <table className="w-full text-sm text-left"><thead className="bg-slate-100"><tr>{['Date & time','Changed by','Action','Record','Changed fields'].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead>
      <tbody>{logs.map((log) => <tr key={log.id} className="border-t align-top">
        <td className="p-4 whitespace-nowrap">{utcDate(log.created_at)}</td>
        <td className="p-4">{actors.get(log.actor_user_id) || (log.actor_user_id ? 'Former / unavailable user' : 'Public visitor / system')}<code className="block text-xs break-all text-slate-500">{log.actor_user_id || 'No signed-in identity'}</code></td>
        <td className="p-4">{log.action}</td>
        <td className="p-4">{log.entity_name}<code className="block text-xs break-all text-slate-500">{log.entity_id}</code></td>
        <td className="p-4">{log.new_data?.changed_fields?.join(', ') || '—'}</td>
      </tr>)}</tbody></table>
    </div>}
  </div></main>;
}
