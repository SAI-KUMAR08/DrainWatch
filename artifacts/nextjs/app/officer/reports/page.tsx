'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useListOfficerReports } from '@workspace/api-client-react';
import { ArrowRight, ListFilter, RefreshCw, XCircle } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';
import { shortId, hazardName, fmt } from '@/lib/utils';

function Loading() { return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>Loading live information</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>}</div>; }

export default function OfficerReportsPage() {
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const reports = useListOfficerReports({ status: status || undefined, severity: severity ? severity as never : undefined });
  return (
    <OfficerShell title="Report queue">
      <div className="content-head">
        <div><div className="overline">Authorized reports</div><h2>Work the queue.</h2><p>Filter by workflow state or severity, then open the operational record.</p></div>
        <span className="demo-tag">{reports.data?.length ?? '—'} records</span>
      </div>
      <div className="filters">
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-report-status">
          <option value="">All statuses</option><option value="reported">Reported</option><option value="verified">Verified</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option>
        </select>
        <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)} data-testid="select-report-severity">
          <option value="">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        <button className="btn btn-outline" onClick={() => reports.refetch()} data-testid="button-refresh-reports"><RefreshCw size={14} /> Refresh</button>
      </div>
      {reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : reports.data?.length ? (
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Report</th><th>Location</th><th>Risk</th><th>Status</th><th>Source</th><th>Updated</th><th /></tr></thead><tbody>
          {reports.data.map((report) => <tr key={report.id} data-testid={`row-officer-report-${report.id}`}>
            <td><span className="report-id">{shortId(report.id)}</span><div className="report-kind">{hazardName(report.hazard_type)}</div></td>
            <td><span className="report-location">{report.location_name}</span><div className="report-kind">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</div></td>
            <td><span className={`pill ${report.risk_level}`}>{report.risk_score} · {report.risk_level}</span></td>
            <td><span className={`pill ${report.status}`}>{hazardName(report.status)}</span></td>
            <td>{report.source}{report.is_demo && <span className="demo-tag" style={{ marginLeft: 5 }}>Demo</span>}</td>
            <td>{fmt(report.updated_at)}</td>
            <td><Link href={`/officer/reports/${report.id}`} className="btn btn-outline" style={{ minHeight: 32, padding: '0 9px' }} data-testid={`link-officer-report-${report.id}`}>Open <ArrowRight size={12} /></Link></td>
          </tr>)}
        </tbody></table></div>
      ) : <div className="empty"><ListFilter size={28} style={{ margin: '0 auto 10px' }} /><strong>Nothing in this view</strong><span>Try changing the workflow filters.</span></div>}
    </OfficerShell>
  );
}
