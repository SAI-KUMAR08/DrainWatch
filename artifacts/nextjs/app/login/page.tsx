'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLogin } from '@workspace/api-client-react';
import { ArrowRight } from 'lucide-react';
import { storedSession } from '@/lib/utils';

function Brand({ officer = false }: { officer?: boolean }) {
  return <Link href={officer ? '/officer/dashboard' : '/'} className="brand" data-testid="link-brand">
    <span className="brand-mark" aria-hidden="true" />
    <span><span className="brand-word">DrainWatch</span><span className="brand-sub">{officer ? 'Municipal incident desk' : 'Hyderabad civic safety'}</span></span>
  </Link>;
}

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="auth-page">
      <div className="auth-art">
        <Brand />
        <div>
          <div className="eyebrow" style={{ color: 'hsl(var(--sidebar-primary))' }}>DrainWatch access</div>
          <h1>One signal. The right workspace.</h1>
          <p>Use your DrainWatch credentials. The server opens the citizen portal or municipal operations desk for your account.</p>
        </div>
        <div className="auth-quote">"The most useful report is the one a response team can act on."<br /><br />— DrainWatch response principle</div>
      </div>
      <div className="auth-form-wrap">
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: (session) => { localStorage.setItem('drainwatch-session', JSON.stringify(session)); router.push(session.role === 'officer' ? '/officer/dashboard' : '/my-reports'); } }); }}>
          <div className="eyebrow">Welcome back</div>
          <h2>Sign in to DrainWatch</h2>
          <p>Your credentials determine which workspace opens.</p>
          {login.isError && <div className="auth-error" data-testid="status-login-error">We could not sign you in. Check your email and password, then try again.</div>}
          <div className="form-group"><label htmlFor="login-email">Email address</label><input id="login-email" className="field" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-login-email" /></div>
          <div className="form-group"><label htmlFor="login-password">Password</label><input id="login-password" className="field" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="input-login-password" /></div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 7 }} disabled={login.isPending} data-testid="button-login">{login.isPending ? 'Signing in…' : 'Continue'} <ArrowRight size={15} /></button>
          <div className="auth-switch" style={{ marginTop: 14 }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'hsl(var(--primary))', fontWeight: 600 }} data-testid="link-register">
              Register as Citizen
            </Link>
          </div>
          <div className="auth-switch" style={{ marginTop: 4, fontSize: '0.8rem', opacity: 0.8 }}>Citizen and officer accounts use this same secure sign-in.</div>
        </form>
      </div>
    </div>
  );
}
