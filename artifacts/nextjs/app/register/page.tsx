'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

function Brand() {
  return (
    <Link href="/" className="brand" data-testid="link-brand">
      <span className="brand-mark" aria-hidden="true" />
      <span>
        <span className="brand-word">DrainWatch</span>
        <span className="brand-sub">Hyderabad civic safety</span>
      </span>
    </Link>
  );
}

type Step = 'details' | 'otp';

export default function RegisterPage() {
  const router = useRouter();

  // Step 1 — Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  // Step 2 — OTP
  const [step, setStep] = useState<Step>('details');
  const [displayedOtp, setDisplayedOtp] = useState('');   // shown on screen
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  const otpInputRef = useRef<HTMLInputElement>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setDetailsLoading(true);
    setDetailsError('');

    try {
      const res = await fetch('/api/auth/citizen/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDetailsError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setDisplayedOtp(data.otp as string);
      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 80);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');

    try {
      const res = await fetch('/api/auth/citizen/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: enteredOtp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error ?? 'Verification failed. Please try again.');
        return;
      }
      localStorage.setItem('drainwatch-session', JSON.stringify(data));
      router.push('/my-reports');
    } finally {
      setOtpLoading(false);
    }
  }

  function formatOtpDisplay(otp: string) {
    // Format as "482 931"
    return `${otp.slice(0, 3)} ${otp.slice(3)}`;
  }

  return (
    <div className="auth-page">
      {/* Left art panel */}
      <div className="auth-art">
        <Brand />
        <div>
          <div className="eyebrow" style={{ color: 'hsl(var(--sidebar-primary))' }}>
            Join DrainWatch
          </div>
          <h1>Your city. Your signal.</h1>
          <p>
            Create a free citizen account in seconds. Report blocked drains, track your submissions, and help keep
            Hyderabad moving.
          </p>
        </div>
        <div className="auth-quote">
          "Every report that reaches the right team is a street made safer."
          <br />
          <br />— DrainWatch citizen mission
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-wrap">
        {step === 'details' ? (
          <form
            className="auth-form"
            onSubmit={handleRegister}
            data-testid="form-register"
          >
            <div className="eyebrow">New account</div>
            <h2>Create your account</h2>
            <p>Fill in your details below. We'll generate a verification code for the next step.</p>

            {detailsError && (
              <div className="auth-error" data-testid="status-register-error">
                {detailsError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                className="field"
                type="text"
                autoComplete="name"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="input-reg-name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                className="field"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-reg-email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reg-password"
                  className="field"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ width: '100%', paddingRight: 40 }}
                  data-testid="input-reg-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'hsl(var(--muted-foreground))',
                    padding: 2,
                    display: 'flex',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 7 }}
              disabled={detailsLoading}
              data-testid="button-register"
            >
              {detailsLoading ? 'Creating account…' : 'Continue'}
              <ArrowRight size={15} />
            </button>

            <div className="auth-switch">
              Already have an account?{' '}
              <Link href="/login" data-testid="link-to-login">
                Sign in
              </Link>
            </div>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={handleVerify}
            data-testid="form-otp"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ShieldCheck size={20} color="hsl(var(--primary))" />
              <div className="eyebrow" style={{ marginBottom: 0 }}>
                Verification
              </div>
            </div>
            <h2>Enter your code</h2>
            <p>
              Your one-time verification code is displayed below. Enter it in the box to complete registration.
            </p>

            {/* ── OTP display box ── */}
            <div className="otp-display" data-testid="display-otp" aria-label="Your verification code">
              {formatOtpDisplay(displayedOtp)}
            </div>
            <div className="otp-hint">↑ This is your one-time code — valid for 15 minutes</div>

            {otpError && (
              <div className="auth-error" data-testid="status-otp-error">
                {otpError}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="otp-input">Type the 6-digit code above</label>
              <input
                id="otp-input"
                ref={otpInputRef}
                className="field"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoComplete="one-time-code"
                style={{ letterSpacing: '0.35em', fontSize: 22, textAlign: 'center' }}
                data-testid="input-otp"
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 7 }}
              disabled={otpLoading || enteredOtp.length < 6}
              data-testid="button-verify-otp"
            >
              {otpLoading ? 'Verifying…' : 'Verify & create account'}
              <ArrowRight size={15} />
            </button>

            <div className="auth-switch">
              Wrong email?{' '}
              <button
                type="button"
                onClick={() => { setStep('details'); setEnteredOtp(''); setOtpError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'hsl(var(--primary))',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  padding: 0,
                }}
                data-testid="button-back-to-details"
              >
                Go back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
