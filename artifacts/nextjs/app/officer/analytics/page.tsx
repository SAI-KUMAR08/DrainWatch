'use client';

import { useListOfficerReports, useGetOfficerDashboard } from '@workspace/api-client-react';
import { RefreshCw, XCircle } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';

function Loading() { return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>Loading live information</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>}</div>; }

export default function AnalyticsPage() {
  const reports = useListOfficerReports();
  const stats = useGetOfficerDashboard();
  const counts = ['reported', 'verified', 'assigned', 'in_progress', 'resolved'].map((status) => reports.data?.filter((r) => r.status === status).length || 0);
  const max = Math.max(...counts, 1);
  return (
    <OfficerShell title="Analytics">
      <div className="content-head"><div><div className="overline">Operational patterns</div><h2>Measure the response, not just the volume.</h2><p>Current authorized reports grouped by workflow state and risk.</p></div>{stats.data?.is_demo && <span className="demo-tag">Demo data active</span>}</div>
      {reports.isLoading || stats.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : (
        <div className="simple-grid">
          <div className="detail-card">
            <h3>Workflow distribution</h3>
            <div className="chart-bars">{counts.map((count, i) => <div className="bar-wrap" key={i}><div className="bar" style={{ height: `${Math.max(7, (count / max) * 100)}%` }} title={`${count} reports`} /><span className="bar-label">{['New', 'Check', 'Assign', 'Work', 'Done'][i]}</span></div>)}</div>
            <div className="detail-list" style={{ marginTop: 20 }}>{counts.map((count, i) => <div key={i}><dt>{['Reported', 'Verified', 'Assigned', 'In progress', 'Resolved'][i]}</dt><dd>{count} reports</dd></div>)}</div>
          </div>
          <div className="detail-card">
            <h3>Coverage snapshot</h3>
            <div className="metric" style={{ marginBottom: 10 }}><div className="metric-number">{stats.data?.total_reports ?? reports.data?.length}</div><div className="metric-label">Total reports in system</div></div>
            <div className="metric" style={{ marginBottom: 10 }}><div className="metric-number">{reports.data?.filter((r) => r.risk_level === 'critical').length || 0}</div><div className="metric-label">Critical risk records</div></div>
            <div className="metric"><div className="metric-number">{reports.data?.filter((r) => r.verification_status === 'verified').length || 0}</div><div className="metric-label">Verified evidence</div></div>
          </div>
        </div>
      )}
    </OfficerShell>
  );
}
