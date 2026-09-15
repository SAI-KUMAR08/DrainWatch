'use client';

import { useState } from 'react';
import { useHealthCheck } from '@workspace/api-client-react';
import { Settings } from 'lucide-react';
import OfficerShell from '@/components/officer-shell';

export default function SettingsPage() {
  const health = useHealthCheck();
  const [alerts, setAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  return (
    <OfficerShell title="Settings">
      <div className="content-head"><div><div className="overline">Workspace controls</div><h2>A quieter desk, tuned to the work.</h2><p>Manage local preferences for this officer workspace.</p></div><Settings size={22} color="hsl(var(--primary))" /></div>
      <div className="detail-card" style={{ maxWidth: 760 }}>
        <div className="setting-row"><div><strong>Incident alerts</strong><span>Surface priority changes in the response desk.</span></div><button className={`switch ${alerts ? 'on' : ''}`} onClick={() => setAlerts(!alerts)} aria-label="Toggle incident alerts" data-testid="button-toggle-alerts" /></div>
        <div className="setting-row"><div><strong>Automatic refresh</strong><span>Keep queue and map data current while the desk is open.</span></div><button className={`switch ${autoRefresh ? 'on' : ''}`} onClick={() => setAutoRefresh(!autoRefresh)} aria-label="Toggle automatic refresh" data-testid="button-toggle-refresh" /></div>
        <div className="setting-row"><div><strong>API connection</strong><span>Health endpoint status for this workspace.</span></div><span className={`pill ${health.data?.status === 'ok' ? 'available' : ''}`}>{health.isLoading ? 'Checking' : health.data?.status || 'Unavailable'}</span></div>
        <div className="setting-row"><div><strong>Data environment</strong><span>Reports marked demo are deterministic backend fixtures.</span></div><span className="demo-tag">Visible demo labels</span></div>
      </div>
    </OfficerShell>
  );
}
