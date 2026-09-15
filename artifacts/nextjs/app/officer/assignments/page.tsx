'use client';

import Link from 'next/link';
import { useListOfficerReports } from '@workspace/api-client-react';
import { Users, ArrowRight, RefreshCw, XCircle } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';
import { shortId, hazardName, fmt } from '@/lib/utils';

function Loading() { return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>Loading live information</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>}</div>; }

export default function AssignmentsPage() {
  const reports = useListOfficerReports({ status: 'assigned' });
  return (
    <OfficerShell title="Assignments">
      <div className="content-head"><div><div className="overline">Dispatch workflow</div><h2>Make ownership visible.</h2><p>Assigned records waiting for field progress updates.</p></div><span className="demo-tag">{reports.data?.length ?? '—'} assigned</span></div>
      {reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : reports.data?.length ? (
        <div>{reports.data.map((report) => (
          <div className="assignment-card" key={report.id}>
            <div className="assignment-top"><div><strong>{report.location_name}</strong><div className="report-kind">{shortId(report.id)} · {hazardName(report.hazard_type)}</div></div><span className={`pill ${report.severity}`}>{report.severity}</span></div>
            <p>{report.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="help">Assigned {fmt(report.updated_at)} · {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span><Link href={`/officer/reports/${report.id}`} className="btn btn-outline" style={{ minHeight: 33, padding: '0 11px' }} data-testid={`link-assignment-${report.id}`}>Open record <ArrowRight size={13} /></Link></div>
          </div>
        ))}</div>
      ) : <div className="empty"><Users size={28} style={{ margin: '0 auto 10px' }} /><strong>No assignments waiting</strong><span>The assigned queue is clear.</span></div>}
    </OfficerShell>
  );
}
