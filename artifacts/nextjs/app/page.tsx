'use client';

import { useListPublicAlerts, useListPublicReports, useHealthCheck } from '@workspace/api-client-react';
import type { Report } from '@workspace/api-client-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Bell, Navigation, ShieldCheck, Waves, Send, Search, RefreshCw, XCircle } from 'lucide-react';
import { hazardName } from '@/lib/utils';

const OfficerMap = dynamic(() => import('@/components/officer-map'), { ssr: false });

function Loading({ label = 'Loading live information' }: { label?: string }) {
  return <div className="loading-state" data-testid="status-loading"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>{label}</span></div>;
}
function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return <div className="error-state" data-testid="status-error"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry} data-testid="button-retry"><RefreshCw size={14} /> Retry</button></div>}</div>;
}

export default function Home() {
  const alerts = useListPublicAlerts();
  const reports = useListPublicReports();
  const health = useHealthCheck();
  const visibleReports = (reports.data?.slice(0, 12) ?? []) as Report[];
  return (
    <div className="app-shell">
      <header className="public-nav">
        <Link href="/" className="brand" data-testid="link-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span><span className="brand-word">DrainWatch</span><span className="brand-sub">Hyderabad civic safety</span></span>
        </Link>
        <nav className="public-links" aria-label="Citizen navigation">
          <Link href="/track-report" data-testid="link-track-report">Track a report</Link>
          <Link href="/my-reports" data-testid="link-my-reports">My reports</Link>
          <Link href="/login" className="btn btn-outline" data-testid="link-login">Sign in</Link>
        </nav>
      </header>
      <main className="page-wrap">
        <section className="hero">
          <div>
            <div className="eyebrow">A clearer signal for a safer city</div>
            <h1>See a blocked drain? <em>Make it visible.</em></h1>
            <p className="hero-copy">DrainWatch connects Hyderabad residents to the teams keeping streets moving. Send a precise report in under a minute, then follow what happens next.</p>
            <div className="actions">
              <Link href="/report" className="btn btn-primary" data-testid="link-report-hazard"><Send size={15} /> Report a hazard</Link>
              <Link href="/track-report" className="btn btn-outline" data-testid="link-track-home"><Search size={15} /> Track a report</Link>
            </div>
          </div>
          <div className="hero-panel" aria-label="Live Hyderabad incident overview">
            <div className="hero-map"><OfficerMap reports={visibleReports} height={320} /></div>
            <div className="hero-panel-foot"><span className="live">Signal active across Hyderabad</span><span>{reports.isLoading ? 'Syncing' : `${visibleReports.length || '—'} recent reports`}</span></div>
          </div>
        </section>
        <section className="alert-strip" aria-label="Public safety alerts">
          <strong><Bell size={14} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Public alerts</strong>
          {alerts.isLoading && <span className="alert-chip">Checking current advisories…</span>}
          {alerts.isError && <span className="alert-chip">Advisories temporarily unavailable.</span>}
          {alerts.data?.length === 0 && <span className="alert-chip">No active advisories.</span>}
          {alerts.data?.slice(0, 3).map((alert) => <span className="alert-chip" key={alert.id}><strong>{alert.title}</strong> · {alert.message}</span>)}
        </section>
        <section className="section">
          <div className="section-heading"><div><div className="eyebrow">One useful civic loop</div><h2>From signal to action.</h2></div><p className="section-intro">Every report adds context to the city's shared picture. Location, hazard type and your description help response teams prioritize the right street.</p></div>
          <div className="feature-grid">
            <div className="info-card"><div className="icon-box"><Navigation size={17} /></div><h3>Pin the real place</h3><p>Use your location or name a nearby landmark. Officers see the report on Hyderabad's actual street map.</p></div>
            <div className="info-card"><div className="icon-box"><ShieldCheck size={17} /></div><h3>Know the status</h3><p>Reported, verified, assigned, in progress or resolved. No black box.</p></div>
            <div className="info-card"><div className="icon-box"><Waves size={17} /></div><h3>Stay safer</h3><p>Public advisories surface here when rainfall or conditions change.</p></div>
          </div>
        </section>
        <section className="section">
          <div className="section-heading"><div><div className="eyebrow">Network pulse</div><h2>What the city is seeing.</h2></div><div className="actions" style={{ marginTop: 0 }}><span className="demo-tag">Demo data active</span><span className="demo-tag">{health.data?.status || 'Live'} connection</span></div></div>
          {reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : <div className="status-board">
            <div className="metric"><div className="metric-number">{visibleReports.length}</div><div className="metric-label">Visible reports</div></div>
            <div className="metric"><div className="metric-number">{visibleReports.filter((r) => r.severity === 'critical' || r.severity === 'high').length}</div><div className="metric-label">High attention</div></div>
            <div className="metric"><div className="metric-number">{visibleReports.filter((r) => r.status === 'resolved').length}</div><div className="metric-label">Resolved in view</div></div>
            <div className="metric"><div className="metric-number">24/7</div><div className="metric-label">Report intake</div></div>
          </div>}
        </section>
        <footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span><span>For urgent danger, contact local emergency services.</span></footer>
      </main>
    </div>
  );
}
