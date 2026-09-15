'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useGetOfficerReport, useUpdateOfficerReportStatus, useListOfficerReports, getGetOfficerReportQueryKey, getListOfficerReportsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Navigation, RefreshCw, XCircle } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';
import { shortId, hazardName, fmt } from '@/lib/utils';
import type { ReportStatus } from '@workspace/api-zod';
import type { Report } from '@workspace/api-client-react';

const OfficerMap = dynamic(() => import('@/components/officer-map'), { ssr: false });

function Loading({ label = 'Loading live information' }: { label?: string }) { return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>{label}</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>}</div>; }

export default function OfficerReportDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const report = useGetOfficerReport(id, { query: { enabled: Boolean(id), queryKey: getGetOfficerReportQueryKey(id) } });
  const update = useUpdateOfficerReportStatus();
  const queryClient = useQueryClient();
  const statusOptions = ['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];

  return (
    <OfficerShell title="Operational report">
      <div className="content-head">
        <div>
          <Link href="/officer/reports" className="overline" data-testid="link-back-report-queue"><ArrowLeft size={12} style={{ verticalAlign: 'middle' }} /> Back to queue</Link>
          <h2 style={{ marginTop: 10 }}>{report.data ? report.data.location_name : 'Report detail'}</h2>
          <p>{report.data ? `${shortId(report.data.id)} · received ${fmt(report.data.created_at)}` : 'Loading operational record'}</p>
        </div>
        {report.data?.is_demo && <span className="demo-tag">Demo data</span>}
      </div>
      {report.isLoading ? <Loading /> : report.isError ? <ErrorState onRetry={() => report.refetch()} /> : report.data ? (
        <div className="detail-grid">
          <div className="detail-card">
            <div className="detail-hero">
              <div><div className="eyebrow">{hazardName(report.data.hazard_type)}</div><h2>{report.data.location_name}</h2></div>
              <span className={`pill ${report.data.severity}`}>{report.data.severity} severity</span>
            </div>
            <p className="description">{report.data.description}</p>
            <div className="detail-list" style={{ marginTop: 28 }}>
              <div><dt>Coordinates</dt><dd>{report.data.latitude.toFixed(5)}, {report.data.longitude.toFixed(5)}</dd></div>
              <div><dt>Verification</dt><dd>{report.data.verification_status}</dd></div>
              <div><dt>Source</dt><dd>{report.data.source}</dd></div>
              <div><dt>Risk level</dt><dd>{report.data.risk_level} · {report.data.risk_score}/100</dd></div>
            </div>
            <div style={{ marginTop: 28 }}>
              <div className="risk-row"><span>Risk score</span><strong>{report.data.risk_score}/100</strong></div>
              <div className="risk-meter"><span style={{ width: `${report.data.risk_score}%` }} /></div>
            </div>
            <div className="actions" style={{ marginTop: 30 }}>
              <select className="select" defaultValue={report.data.status} disabled={update.isPending}
                onChange={(e) => { update.mutate({ id, data: { status: e.target.value as ReportStatus } }, { onSuccess: (next) => { queryClient.setQueryData(getGetOfficerReportQueryKey(id), next); queryClient.invalidateQueries({ queryKey: getListOfficerReportsQueryKey() }); } }); }}
                data-testid="select-detail-status">
                {statusOptions.map((s) => <option value={s} key={s}>{hazardName(s)}</option>)}
              </select>
              {update.isPending && <span className="help">Saving status…</span>}
              {update.isError && <span className="auth-error" style={{ margin: 0 }}>Update failed</span>}
            </div>
          </div>
          <div className="side-stack">
            <div className="map-card">
              <div className="card-head"><h3>Location evidence</h3><Navigation size={15} color="hsl(var(--primary))" /></div>
              <OfficerMap reports={[report.data]} height={270} />
            </div>
            <div className="detail-card">
              <h3>Risk components</h3>
              {Object.entries(report.data.risk_components).map(([key, value]) => <div key={key}><div className="risk-row"><span>{hazardName(key)}</span><strong>{value}</strong></div><div className="risk-meter"><span style={{ width: `${Math.min(100, Number(value))}%` }} /></div></div>)}
            </div>
          </div>
        </div>
      ) : null}
    </OfficerShell>
  );
}
