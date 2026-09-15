'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  useGetOfficerDashboard, useListOfficerReports, useListOfficerActivity, useGetOfficerWeather,
} from '@workspace/api-client-react';
import { CloudRain, ArrowRight, Activity, RefreshCw, XCircle } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';
import { fmt, hazardName } from '@/lib/utils';
import type { DashboardStats, ActivityItem, Report } from '@workspace/api-client-react';

const OfficerMap = dynamic(() => import('@/components/officer-map'), { ssr: false });

function Loading({ label = 'Loading live information' }: { label?: string }) { return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>{label}</span></div>; }
function ErrorState({ onRetry }: { onRetry?: () => void }) { return <div className="error-state"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>}</div>; }

function StatCards({ stats }: { stats?: DashboardStats }) {
  const values = stats ? [[stats.active_reports, 'Active reports', 'Needs attention'], [stats.critical_reports, 'Critical now', 'Priority queue'], [stats.verified_today, 'Verified today', 'Evidence checked'], [stats.resolved_today, 'Resolved today', 'Closed loop']] : [[0, 'Active reports', 'Loading'], [0, 'Critical now', 'Loading'], [0, 'Verified today', 'Loading'], [0, 'Resolved today', 'Loading']];
  return <div className="dash-grid">{values.map(([value, label, foot]) => <div className="stat-card" key={label as string}><div className="stat-value">{stats ? value : <div className="skeleton" style={{ width: 55 }} />}</div><div className="stat-label">{label}</div><div className="stat-foot"><span>{foot}</span><Activity size={13} /></div></div>)}</div>;
}

function ActivityCard({ activity }: { activity: ActivityItem[] | undefined }) {
  return <div className="map-card"><div className="card-head"><h3>Recent activity</h3><Link href="/officer/audit-logs" style={{ color: 'hsl(var(--primary))', fontSize: 11 }} data-testid="link-view-audit">View audit trail <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div>{activity?.length ? <div className="activity-list">{activity.slice(0, 5).map((item) => <div className="activity" key={item.id}><span className={`activity-mark ${item.severity === 'critical' ? 'critical' : ''}`} /><div><div className="activity-text">{item.text}</div><div className="activity-time">{fmt(item.created_at)} · {hazardName(item.status)}</div></div></div>)}</div> : <div className="empty">No recent activity available.</div>}</div>;
}

export default function DashboardPage() {
  const stats = useGetOfficerDashboard();
  const reports = useListOfficerReports();
  const activity = useListOfficerActivity();
  const weather = useGetOfficerWeather();
  return (
    <OfficerShell title="Operational overview">
      <div className="content-head">
        <div><div className="overline">Tuesday · Hyderabad response network</div><h2>Good morning. Here is the city.</h2><p>Prioritize what needs a response before the next rainfall window.</p></div>
        {stats.data?.is_demo && <span className="demo-tag">Demo data active</span>}
      </div>
      {stats.isError ? <ErrorState onRetry={() => stats.refetch()} /> : <StatCards stats={stats.data} />}
      <div className="dashboard-grid">
        <div className="map-card">
          <div className="card-head"><div><h3>Incident map</h3><span>Hyderabad · live report coordinates</span></div><Link className="btn btn-outline" style={{ minHeight: 32, padding: '0 10px' }} href="/officer/map" data-testid="link-open-map">Open full map <ArrowRight size={13} /></Link></div>
          {reports.isLoading ? <Loading label="Loading incident map" /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : <OfficerMap reports={reports.data || []} height={445} />}
        </div>
        <div className="side-stack">
          <div className="map-card">
            <div className="card-head"><h3>Rainfall context</h3><CloudRain size={16} color="hsl(var(--primary))" /></div>
            <div className="weather">{weather.isLoading ? <Loading /> : weather.data?.status === 'unavailable' ? <div className="empty"><strong>Weather unavailable</strong><span>Risk scoring continues with available signals.</span></div> : <><div className="weather-status"><div><div className="overline">Current status</div><div className="weather-number">{weather.data?.rainfall_mm ?? '—'}<small style={{ fontSize: 13, letterSpacing: 0 }}> mm</small></div></div><span className="pill available">{weather.data?.status || 'Available'}</span></div><div className="weather-detail"><span>{weather.data?.source || 'Municipal weather feed'}</span><span>{fmt(weather.data?.observed_at)}</span></div></>}</div>
          </div>
          <ActivityCard activity={activity.data} />
        </div>
      </div>
    </OfficerShell>
  );
}
