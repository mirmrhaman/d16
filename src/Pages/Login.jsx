import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { base44 } from '@/api/base44Client';
import { IS_DEMO } from '@/api/transport';
import { adminLanding } from '@/api/permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Login() {
  const { loginWithCredentials, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await loginWithCredentials({ email, password, authApi: base44.auth });
      const requested = location.state?.from;
      const destination = user.role === 'admin' ? (requested || '/AdminDashboard') : adminLanding(user, IS_DEMO);
      navigate(destination, { replace: true });
    } catch { /* Error shown by context; never pretend login succeeded. */ }
    finally { setLoading(false); }
  }
  return <main className="min-h-screen flex items-center justify-center bg-[#112037] p-5">
    <section className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md space-y-6">
      <Link to="/" className="text-sm text-slate-600">← Back to D16 Interior</Link>
      <h1 className="text-3xl font-bold text-[#112037]">{IS_DEMO ? 'Local design preview' : 'Team sign in'}</h1>
      <p className="text-slate-600">{IS_DEMO ? 'Preview the admin design with sample content. This is not production authentication. Do not enter real client data.' : 'Use your administrator-created account. Your identity and permissions are checked by the server.'}</p>
      <form onSubmit={submit} className="space-y-4">
        {!IS_DEMO && <>
          <label className="block">Email<Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block">Password<Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        </>}
        {authError && <p role="alert" className="p-3 bg-red-50 text-red-800 rounded-lg">{authError}</p>}
        <Button className="w-full bg-[#112037]" disabled={loading}>{loading ? 'Please wait…' : IS_DEMO ? 'Open sample admin preview' : 'Sign in'}</Button>
      </form>
      {!IS_DEMO && <p className="text-xs text-slate-500">Accounts requiring MFA remain locked until a real MFA provider is configured. No email or SMS delivery is simulated.</p>}
    </section>
  </main>;
}
