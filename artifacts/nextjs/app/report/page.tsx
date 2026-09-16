'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCreateCitizenReport } from '@workspace/api-client-react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Send, Info, LogOut, User } from 'lucide-react';
import { storedSession } from '@/lib/utils';

export default function ReportPage() {
  const router = useRouter();
  const createReport = useCreateCitizenReport();
  const [session, setSession] = useState<ReturnType<typeof storedSession>>({});
  const [mounted, setMounted] = useState(false);
  const [hazard, setHazard] = useState('blocked_drain');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('17.3850');
  const [longitude, setLongitude] = useState('78.4867');

  useEffect(() => {
    setSession(storedSession());
    setMounted(true);
  }, []);

  function signOut() {
    localStorage.removeItem('drainwatch-session');
    setSession({});
    router.push('/');
  }

  function NavBar() {
    return (
      <header className="public-nav">
        <Link href="/" className="brand"><span className="brand-mark" /><span><span className="brand-word">DrainWatch</span><span className="brand-sub">Hyderabad civic safety</span></span></Link>
        <nav className="public-links">
          <Link href="/track-report">Track a report</Link>
          <Link href="/my-reports">My reports</Link>
          {mounted && session.token ? (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                <User size={14} />{session.name || session.email || 'Citizen'}
              </span>
              <button className="btn btn-outline" onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : mounted ? (
            <>
              <Link href="/register" className="btn btn-outline">Register</Link>
              <Link href="/login" className="btn btn-primary">Sign in</Link>
            </>
          ) : null}
        </nav>
      </header>
    );
  }

  if (mounted && session.role !== 'citizen') {
    return (
      <div className="app-shell">
        <NavBar />
        <main className="page-wrap">
          <div className="empty" style={{ maxWidth: 600, margin: '100px auto' }}>
            <ShieldCheck size={29} style={{ margin: '0 auto 10px', color: 'hsl(var(--primary))' }} />
            <strong>Sign in to submit a report</strong>
            <span>Your report will be attached to your private citizen account so you can track it later.</span>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 17 }}>
              <Link href="/register" className="btn btn-outline">Register</Link>
              <Link href="/login" className="btn btn-primary" data-testid="link-report-sign-in">Sign in</Link>
            </div>
          </div>
          <footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span><span>For urgent danger, contact local emergency services.</span></footer>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <NavBar />
      <main className="page-wrap">
        <div className="form-shell" style={{ paddingTop: 46 }}>
          <div className="content-head">
            <div><div className="eyebrow">Citizen report</div><h2>Give the street a signal.</h2><p>Tell us what is happening and where. No perfect wording required.</p></div>
            <span className="demo-tag">Response-ready intake</span>
          </div>
          <div className="form-card">
            <form onSubmit={(e) => { e.preventDefault(); createReport.mutate({ data: { hazard_type: hazard as never, description, location_name: locationName, latitude: Number(latitude), longitude: Number(longitude) } }, { onSuccess: (report) => { router.push(`/track-report?id=${report.id}`); } }); }}>
              <div className="form-grid">
                <div className="form-group full"><label>What are you seeing?</label><div className="radio-grid">{[['blocked_drain', 'Blocked drain'], ['waterlogging', 'Waterlogging'], ['open_manhole', 'Open manhole'], ['sewage_overflow', 'Sewage overflow'], ['damaged_road', 'Damaged road'], ['other', 'Other']].map(([value, label]) => <label className="radio-option" key={value}><input type="radio" name="hazard" value={value} checked={hazard === value} onChange={() => setHazard(value)} />{label}</label>)}</div></div>
                <div className="form-group full"><label htmlFor="report-description">What should the response team know?</label><textarea id="report-description" className="field" minLength={10} placeholder="For example: water is knee-deep outside the pharmacy entrance…" value={description} onChange={(e) => setDescription(e.target.value)} required data-testid="input-report-description" /><span className="help">A specific detail helps teams verify the location faster.</span></div>
                <div className="form-group full"><label htmlFor="report-location">Location or nearby landmark</label><input id="report-location" className="field" minLength={2} placeholder="Road, landmark, colony or junction" value={locationName} onChange={(e) => setLocationName(e.target.value)} required data-testid="input-report-location" /></div>
                <div className="form-group"><label htmlFor="report-latitude">Latitude</label><input id="report-latitude" className="field" type="number" step="any" min="16" max="18" value={latitude} onChange={(e) => setLatitude(e.target.value)} required data-testid="input-report-latitude" /></div>
                <div className="form-group"><label htmlFor="report-longitude">Longitude</label><input id="report-longitude" className="field" type="number" step="any" min="77" max="79" value={longitude} onChange={(e) => setLongitude(e.target.value)} required data-testid="input-report-longitude" /></div>
              </div>
              {createReport.isError && <div className="auth-error" style={{ marginTop: 20 }} data-testid="status-report-error">This report could not be sent. Please check the location and try again.</div>}
              <div className="notice" style={{ marginTop: 22 }}><Info size={16} /><span>Reports may be marked as demo data when the municipal server is in demonstration mode.</span></div>
              <div className="actions" style={{ justifyContent: 'flex-end' }}><Link href="/" className="btn btn-outline" data-testid="link-cancel-report">Cancel</Link><button className="btn btn-primary" type="submit" disabled={createReport.isPending} data-testid="button-submit-report">{createReport.isPending ? 'Sending report…' : 'Send report'} <Send size={15} /></button></div>
            </form>
          </div>
        </div>
        <footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span><span>For urgent danger, contact local emergency services.</span></footer>
      </main>
    </div>
  );
}
