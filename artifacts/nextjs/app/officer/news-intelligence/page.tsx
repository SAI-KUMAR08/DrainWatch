'use client';

import { useListPublicReports, useListPublicAlerts } from '@workspace/api-client-react';
import { BookOpen, RefreshCw, XCircle } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';
import { fmt, hazardName } from '@/lib/utils';

function Loading() { return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>Loading live information</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>}</div>; }

export default function NewsIntelligencePage() {
  const reports = useListPublicReports();
  const alerts = useListPublicAlerts();
  const newsReports = reports.data?.filter((r) => r.source === 'news') || [];
  return (
    <OfficerShell title="News intelligence">
      <div className="content-head"><div><div className="overline">External signal layer</div><h2>Context beyond the queue.</h2><p>Public safety alerts and news-sourced reports help explain emerging patterns.</p></div><BookOpen size={22} color="hsl(var(--primary))" /></div>
      <div className="simple-grid">
        <div className="detail-card"><h3>Public alerts</h3>{alerts.isLoading ? <Loading /> : alerts.isError ? <ErrorState onRetry={() => alerts.refetch()} /> : alerts.data?.length ? alerts.data.map((alert) => <div className="assignment-card" key={alert.id}><div className="assignment-top"><strong>{alert.title}</strong><span className={`pill ${alert.severity}`}>{alert.severity}</span></div><p>{alert.message}</p><span className="help">Issued {fmt(alert.issued_at)}</span></div>) : <div className="empty">No public alerts currently issued.</div>}</div>
        <div className="detail-card"><h3>Publicly visible incident signals</h3>{reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : newsReports.length ? newsReports.map((report) => <div className="assignment-card" key={report.id}><div className="assignment-top"><strong>{report.location_name}</strong><span className={`pill ${report.severity}`}>{report.severity}</span></div><p>{report.description}</p><span className="help">{hazardName(report.hazard_type)} · {fmt(report.created_at)}</span></div>) : <div className="empty">No news-sourced signals in the current feed.</div>}</div>
      </div>
    </OfficerShell>
  );
}
