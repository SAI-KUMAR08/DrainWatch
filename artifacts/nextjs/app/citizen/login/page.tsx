'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCitizenLogin } from '@workspace/api-client-react';
import { ArrowRight } from 'lucide-react';

export default function CitizenLoginPage() {
  const router = useRouter();
  const login = useCitizenLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="auth-page">
      <div className="auth-art">
        <Link href="/" className="brand"><span className="brand-mark" /><span><span className="brand-word">DrainWatch</span><span className="brand-sub">Hyderabad civic safety</span></span></Link>
        <div>
          <div className="eyebrow" style={{ color: 'hsl(var(--sidebar-primary))' }}>Citizen portal</div>
          <h1>Your report should never disappear into the dark.</h1>
          <p>Sign in to submit reports, save your places and follow progress from first signal to resolution.</p>
        </div>
        <div className="auth-quote">"The most useful report is the one a response team can act on."<br /><br />— DrainWatch response principle</div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: (session) => { localStorage.setItem('drainwatch-session', JSON.stringify(session)); router.push('/my-reports'); } }); }}>
          <div className="eyebrow">Welcome back</div>
          <h2>Citizen sign in</h2>
          <p>Use your registered email to see your reports and updates.</p>
          {login.isError && <div className="auth-error" data-testid="status-login-error">We could not sign you in. Check your details and try again.</div>}
          <div className="form-group"><label htmlFor="citizen-email">Email address</label><input id="citizen-email" className="field" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-citizen-email" /></div>
          <div className="form-group"><label htmlFor="citizen-password">Password</label><input id="citizen-password" className="field" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="input-citizen-password" /></div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 7 }} disabled={login.isPending} data-testid="button-citizen-login">{login.isPending ? 'Signing in…' : 'Sign in to my reports'} <ArrowRight size={15} /></button>
          <div className="auth-switch">Need the municipal workspace? <Link href="/officer/login" data-testid="link-officer-login-alt">Officer sign in</Link></div>
        </form>
      </div>
    </div>
  );
}
