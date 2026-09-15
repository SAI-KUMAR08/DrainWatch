'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useGetCitizenReport, getGetCitizenReportQueryKey } from '@workspace/api-client-react';
import { Search, ShieldCheck, RefreshCw, XCircle } from 'lucide-react';
import { shortId, hazardName, fmt } from '@/lib/utils';

function Loading({ label = 'Loading live information' }: { label?: string }) { return <div className="loading-state" data-testid="status-loading"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>{label}</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state" data-testid="status-error"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry} data-testid="button-retry"><RefreshCw size={14} /> Retry</button></div>}</div>; }

function PublicNav() {
  return <header className="public-nav"><Link href="/" className="brand"><span className="brand-mark" /><span><span className="brand-word">DrainWatch</span><span className="brand-sub">Hyderabad civic safety</span></span></Link><nav className="public-links"><Link href="/track-report">Track a report</Link><Link href="/my-reports">My reports</Link><Link href="/login" className="btn btn-outline">Sign in</Link></nav></header>;
}

function TrackReportContent() {
  const searchParams = useSearchParams();
  const [id, setId] = useState(searchParams.get('id') || '');
  const [lookup, setLookup] = useState(searchParams.get('id') || '');
  const report = useGetCitizenReport(lookup, { query: { enabled: Boolean(lookup), queryKey: getGetCitizenReportQueryKey(lookup) } });
  const statusSteps = ['reported', 'verified', 'assigned', 'in_progress', 'resolved'];
  const index = report.data ? statusSteps.indexOf(report.data.status) : -1;

  return (
    <div className="track-box">
      <div className="eyebrow">Public tracking</div>
      <h2 style={{ fontSize: 'clamp(35px, 6vw, 57px)', letterSpacing: '-.07em', margin: '13px 0 10px' }}>Where is the signal now?</h2>
      <p className="section-intro">Enter the report ID from your confirmation. You can also open any report from My reports.</p>
      <form className="track-search" onSubmit={(e) => { e.preventDefault(); setLookup(id.trim()); }}>
        <input className="field" placeholder="Report ID" value={id} onChange={(e) => setId(e.target.value)} data-testid="input-track-id" />
        <button className="btn btn-primary" type="submit" data-testid="button-track-report"><Search size={15} /> Find report</button>
      </form>
      {lookup && report.isLoading && <Loading label="Finding that report" />}
      {lookup && report.isError && <ErrorState onRetry={() => report.refetch()} />}
      {report.data && <div className="track-result">
        <div className="detail-card">
          <div className="detail-hero"><div><div className="eyebrow">{shortId(report.data.id)}</div><h2>{report.data.location_name}</h2></div><span className={`pill ${report.data.status}`}>{hazardName(report.data.status)}</span></div>
          <p className="description">{report.data.description}</p>
          <div style={{ margin: '30px 0 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'hsl(var(--muted-foreground))' }}><span>Received {fmt(report.data.created_at)}</span><span>{index >= 0 ? `${index + 1} of ${statusSteps.length}` : 'Reviewing'}</span></div>
            <div className="risk-meter" style={{ marginTop: 8 }}><span style={{ width: `${Math.max(8, ((index + 1) / statusSteps.length) * 100)}%` }} /></div>
          </div>
          <div className="timeline">{statusSteps.map((step, stepIndex) => <div className="timeline-item" key={step}><strong style={{ color: stepIndex <= index ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>{hazardName(step)}</strong><span>{stepIndex < index ? 'Completed' : stepIndex === index ? 'Current status' : 'Awaiting update'}</span></div>)}</div>
        </div>
        <div className="notice" style={{ marginTop: 12 }}><ShieldCheck size={16} /><span>Thank you for making this location visible. Updates are based on municipal review.</span></div>
      </div>}
    </div>
  );
}

export default function TrackReportPage() {
  return (
    <div className="app-shell">
      <PublicNav />
      <main className="page-wrap">
        <Suspense fallback={<Loading />}>
          <TrackReportContent />
        </Suspense>
        <footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span><span>For urgent danger, contact local emergency services.</span></footer>
      </main>
    </div>
  );
}
