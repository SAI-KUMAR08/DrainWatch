'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useListCitizenReports } from '@workspace/api-client-react';
import { ClipboardList, ArrowRight, Send, RefreshCw, XCircle, LogOut, User } from 'lucide-react';
import { storedSession, shortId, hazardName, fmt } from '@/lib/utils';

function Loading() { return <div className="loading-state" data-testid="status-loading"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>Loading live information</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state" data-testid="status-error"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry} data-testid="button-retry"><RefreshCw size={14} /> Retry</button></div>}</div>; }

export default function CitizenReportsPage() {
  const reports = useListCitizenReports();
  const router = useRouter();
  const [session, setSession] = useState<ReturnType<typeof storedSession>>({});
  const [mounted, setMounted] = useState(false);

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
    return <div className="app-shell"><NavBar /><main className="page-wrap"><div className="empty" style={{ maxWidth: 600, margin: '100px auto' }}><ClipboardList size={29} style={{ margin: '0 auto 10px', color: 'hsl(var(--primary))' }} /><strong>Sign in to view your reports</strong><span>Your report history is private to your citizen account.</span><div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 17 }}><Link href="/register" className="btn btn-outline">Register</Link><Link href="/login" className="btn btn-primary">Sign in</Link></div></div><footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span></footer></main></div>;
  }

  return (
    <div className="app-shell">
      <NavBar />
      <main className="page-wrap">
        <div className="content-head" style={{ paddingTop: 47 }}>
          <div><div className="eyebrow">Citizen portal</div><h2>My reports</h2><p>A simple record of every signal you have sent.</p></div>
          <Link href="/report" className="btn btn-primary" data-testid="link-new-report"><Send size={15} /> New report</Link>
        </div>
        {reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : reports.data?.length ? (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>Report</th><th>Location</th><th>Status</th><th>Sent</th><th /></tr></thead><tbody>
            {reports.data.map((report) => <tr key={report.id} data-testid={`row-citizen-report-${report.id}`}><td><span className="report-id">{shortId(report.id)}</span><div className="report-kind">{hazardName(report.hazard_type)}</div></td><td><span className="report-location">{report.location_name}</span></td><td><span className={`pill ${report.status}`}>{hazardName(report.status)}</span>{report.is_demo && <span className="demo-tag" style={{ marginLeft: 6 }}>Demo</span>}</td><td>{fmt(report.created_at)}</td><td><Link href={`/track-report?id=${report.id}`} className="btn btn-outline" style={{ minHeight: 32, padding: '0 10px' }} data-testid={`link-track-report-${report.id}`}>Track <ArrowRight size={13} /></Link></td></tr>)}
          </tbody></table></div>
        ) : <div className="empty"><ClipboardList size={29} style={{ margin: '0 auto 10px', color: 'hsl(var(--primary))' }} /><strong>No reports yet</strong><span>When you send a report, its progress will stay here.</span><div><Link href="/report" className="btn btn-primary" style={{ marginTop: 17 }} data-testid="link-empty-new-report">Send your first report</Link></div></div>}
        <footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span><span>For urgent danger, contact local emergency services.</span></footer>
      </main>
    </div>
  );
}
