'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useListOfficerReports } from '@workspace/api-client-react';
import { RefreshCw, XCircle } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';

const OfficerMap = dynamic(() => import('@/components/officer-map'), { ssr: false });

function Loading({ label = 'Loading live information' }: { label?: string }) { return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>{label}</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>}</div>; }

export default function OfficerMapPage() {
  const reports = useListOfficerReports();
  const [severity, setSeverity] = useState('');
  const filtered = (reports.data || []).filter((r) => !severity || r.severity === severity);
  return (
    <OfficerShell title="Live incident map">
      <div className="content-head">
        <div><div className="overline">Geographic operations</div><h2>See every signal in place.</h2><p>Map markers use the coordinates submitted with each authorized report.</p></div>
        <div className="filters">
          <select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)} data-testid="select-map-severity">
            <option value="">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <span className="demo-tag">{filtered.length} mapped</span>
        </div>
      </div>
      {reports.isLoading ? <Loading label="Loading Hyderabad map" /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : <div className="map-card"><div className="card-head"><h3>Hyderabad · OpenStreetMap</h3><span>Click a marker for report context</span></div><OfficerMap reports={filtered} height={600} /></div>}
    </OfficerShell>
  );
}
