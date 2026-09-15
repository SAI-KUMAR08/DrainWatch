'use client';

import { useListOfficerAuditLogs } from '@workspace/api-client-react';
import { FileClock, RefreshCw, XCircle } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';
import { shortId, fmt } from '@/lib/utils';

function Loading() { return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>Loading live information</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>}</div>; }

export default function AuditLogsPage() {
  const logs = useListOfficerAuditLogs();
  return (
    <OfficerShell title="Audit trail">
      <div className="content-head"><div><div className="overline">Accountability record</div><h2>Every change has a trace.</h2><p>Immutable activity history for authorized operational actions.</p></div><FileClock size={22} color="hsl(var(--primary))" /></div>
      {logs.isLoading ? <Loading /> : logs.isError ? <ErrorState onRetry={() => logs.refetch()} /> : logs.data?.length ? (
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Report</th></tr></thead><tbody>
          {logs.data.map((log) => <tr key={log.id} data-testid={`row-audit-${log.id}`}><td>{fmt(log.created_at)}</td><td><span className="report-location">{log.action}</span></td><td>{log.actor}</td><td><span className="report-id">{shortId(log.report_id)}</span></td></tr>)}
        </tbody></table></div>
      ) : <div className="empty"><FileClock size={28} style={{ margin: '0 auto 10px' }} /><strong>No audit events yet</strong><span>Actions taken in the desk will appear here.</span></div>}
    </OfficerShell>
  );
}
