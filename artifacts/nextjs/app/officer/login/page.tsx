'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useOfficerLogin } from '@workspace/api-client-react';
import { ArrowRight } from 'lucide-react';

export default function OfficerLoginPage() {
  const router = useRouter();
  const login = useOfficerLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="auth-page">
      <div className="auth-art">
        <Link href="/" className="brand"><span className="brand-mark" /><span><span className="brand-word">DrainWatch</span><span className="brand-sub">Municipal incident desk</span></span></Link>
        <div>
          <div className="eyebrow" style={{ color: 'hsl(var(--sidebar-primary))' }}>Municipal operations</div>
          <h1>Calm decisions for streets under pressure.</h1>
          <p>A map-first incident desk for Hyderabad response teams. Prioritize by evidence, coordinate clearly, close the loop.</p>
        </div>
        <div className="auth-quote">Response teams see the same signal residents can track — with the operational context to act on it.</div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: (session) => { localStorage.setItem('drainwatch-session', JSON.stringify(session)); router.push('/officer/dashboard'); } }); }}>
          <div className="eyebrow">Restricted workspace</div>
          <h2>Officer sign in</h2>
          <p>Use your municipal credentials to enter the response desk.</p>
          {login.isError && <div className="auth-error">Sign in failed. Confirm your credentials or contact your administrator.</div>}
          <div className="form-group"><label htmlFor="officer-email">Work email</label><input id="officer-email" className="field" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-officer-email" /></div>
          <div className="form-group"><label htmlFor="officer-password">Password</label><input id="officer-password" className="field" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="input-officer-password" /></div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 7 }} disabled={login.isPending} data-testid="button-officer-login">{login.isPending ? 'Opening desk…' : 'Enter incident desk'} <ArrowRight size={15} /></button>
          <div className="auth-switch">Citizen access? <Link href="/citizen/login" data-testid="link-citizen-login-alt">Sign in as a citizen</Link></div>
        </form>
      </div>
    </div>
  );
}
