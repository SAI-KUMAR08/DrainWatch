import { useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Bell, BookOpen, ClipboardList,
  CloudRain, FileClock, Info, LayoutDashboard, ListFilter, LogOut, Map, Navigation,
  RefreshCw, Search, Send, Settings, ShieldCheck, Users, Waves, XCircle,
} from 'lucide-react';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  getGetCitizenReportQueryKey, getGetOfficerReportQueryKey, getListOfficerReportsQueryKey,
  useCitizenLogin, useCreateCitizenReport, useGetCitizenReport,
  useGetOfficerDashboard, useGetOfficerReport, useGetOfficerWeather,
  useHealthCheck, useListCitizenReports, useListOfficerActivity,
  useListOfficerAuditLogs, useListOfficerReports, useListPublicAlerts,
  useListPublicReports, useLogin, useOfficerLogin, useUpdateOfficerReportStatus,
  type ActivityItem, type DashboardStats, type Report, type ReportStatus,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();
const HYDERABAD: [number, number] = [17.385, 78.4867];

function fmt(date?: string | null) {
  if (!date) return 'Unavailable';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}
function shortId(id: string) { return id.length > 12 ? `DW-${id.slice(-6).toUpperCase()}` : id; }
function hazardName(value: string) { return value.replaceAll('_', ' '); }
function initials(name?: string) { return (name || 'Officer').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(); }
function storedSession() {
  try {
    return JSON.parse(localStorage.getItem('drainwatch-session') || '{}') as {
      token?: string;
      role?: 'citizen' | 'officer';
      name?: string;
      email?: string;
    };
  } catch {
    return {};
  }
}

function Brand({ officer = false }: { officer?: boolean }) {
  return <Link href={officer ? '/officer/dashboard' : '/'} className="brand" data-testid="link-brand">
    <span className="brand-mark" aria-hidden="true" />
    <span><span className="brand-word">DrainWatch</span><span className="brand-sub">{officer ? 'Municipal incident desk' : 'Hyderabad civic safety'}</span></span>
  </Link>;
}

function PublicNav() {
  return <header className="public-nav">
    <Brand />
    <nav className="public-links" aria-label="Citizen navigation">
      <Link href="/track-report" data-testid="link-track-report">Track a report</Link>
      <Link href="/my-reports" data-testid="link-my-reports">My reports</Link>
      <Link href="/login" className="btn btn-outline" data-testid="link-login">Sign in</Link>
    </nav>
  </header>;
}

function PublicFooter() {
  return <footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span><span>For urgent danger, contact local emergency services.</span></footer>;
}

function Loading({ label = 'Loading live information' }: { label?: string }) {
  return <div className="loading-state" data-testid="status-loading"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>{label}</span></div>;
}
function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return <div className="error-state" data-testid="status-error"><XCircle size={28} color="hsl(var(--destructive))" style={{ margin: '0 auto 10px' }} /><strong>Live information is unavailable</strong><span>Try again in a moment.</span>{onRetry && <div><button className="btn btn-outline" style={{ marginTop: 15 }} onClick={onRetry} data-testid="button-retry"><RefreshCw size={14} /> Retry</button></div>}</div>;
}

function Home() {
  const alerts = useListPublicAlerts();
  const reports = useListPublicReports();
  const health = useHealthCheck();
  const visibleReports = reports.data?.slice(0, 12) ?? [];
  return <div className="app-shell">
    <PublicNav />
    <main className="page-wrap">
      <section className="hero">
        <div>
          <div className="eyebrow">A clearer signal for a safer city</div>
          <h1>See a blocked drain? <em>Make it visible.</em></h1>
          <p className="hero-copy">DrainWatch connects Hyderabad residents to the teams keeping streets moving. Send a precise report in under a minute, then follow what happens next.</p>
          <div className="actions">
            <Link href="/report" className="btn btn-primary" data-testid="link-report-hazard"><Send size={15} /> Report a hazard</Link>
            <Link href="/track-report" className="btn btn-outline" data-testid="link-track-home"><Search size={15} /> Track a report</Link>
          </div>
        </div>
        <div className="hero-panel" aria-label="Live Hyderabad incident overview">
          <div className="hero-map">
            <OfficerMap reports={visibleReports} height={320} />
          </div>
          <div className="hero-panel-foot"><span className="live">Signal active across Hyderabad</span><span>{reports.isLoading ? 'Syncing' : `${visibleReports.length || '—'} recent reports`}</span></div>
        </div>
      </section>
      <section className="alert-strip" aria-label="Public safety alerts">
        <strong><Bell size={14} style={{ verticalAlign: 'middle', marginRight: 7 }} /> Public alerts</strong>
        {alerts.isLoading && <span className="alert-chip">Checking current advisories…</span>}
        {alerts.isError && <span className="alert-chip">Advisories temporarily unavailable.</span>}
        {alerts.data?.length === 0 && <span className="alert-chip">No active advisories.</span>}
        {alerts.data?.slice(0, 3).map((alert) => <span className="alert-chip" key={alert.id}><strong>{alert.title}</strong> · {alert.message}</span>)}
      </section>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">One useful civic loop</div><h2>From signal to action.</h2></div><p className="section-intro">Every report adds context to the city’s shared picture. Location, hazard type and your description help response teams prioritize the right street.</p></div>
        <div className="feature-grid">
          <div className="info-card"><div className="icon-box"><Navigation size={17} /></div><h3>Pin the real place</h3><p>Use your location or name a nearby landmark. Officers see the report on Hyderabad’s actual street map.</p></div>
          <div className="info-card"><div className="icon-box"><ShieldCheck size={17} /></div><h3>Know the status</h3><p>Reported, verified, assigned, in progress or resolved. No black box.</p></div>
          <div className="info-card"><div className="icon-box"><Waves size={17} /></div><h3>Stay safer</h3><p>Public advisories surface here when rainfall or conditions change.</p></div>
        </div>
      </section>
       <section className="section">
        <div className="section-heading"><div><div className="eyebrow">Network pulse</div><h2>What the city is seeing.</h2></div><div className="actions" style={{ marginTop: 0 }}><span className="demo-tag">Demo data active</span><span className="demo-tag">{health.data?.status || 'Live'} connection</span></div></div>
        {reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : <div className="status-board">
          <div className="metric"><div className="metric-number">{visibleReports.length}</div><div className="metric-label">Visible reports</div></div>
          <div className="metric"><div className="metric-number">{visibleReports.filter((r) => r.severity === 'critical' || r.severity === 'high').length}</div><div className="metric-label">High attention</div></div>
          <div className="metric"><div className="metric-number">{visibleReports.filter((r) => r.status === 'resolved').length}</div><div className="metric-label">Resolved in view</div></div>
          <div className="metric"><div className="metric-number">24/7</div><div className="metric-label">Report intake</div></div>
        </div>}
      </section>
      <PublicFooter />
    </main>
  </div>;
}

function LoginPage() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <div className="auth-page">
    <div className="auth-art"><Brand /><div><div className="eyebrow" style={{ color: 'hsl(var(--sidebar-primary))' }}>DrainWatch access</div><h1>One signal. The right workspace.</h1><p>Use your DrainWatch credentials. The server opens the citizen portal or municipal operations desk for your account.</p></div><div className="auth-quote">“The most useful report is the one a response team can act on.”<br /><br />— DrainWatch response principle</div></div>
    <div className="auth-form-wrap"><form className="auth-form" onSubmit={(event) => { event.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: (session) => { localStorage.setItem('drainwatch-session', JSON.stringify(session)); setLocation(session.role === 'officer' ? '/officer/dashboard' : '/my-reports'); } }); }}><div className="eyebrow">Welcome back</div><h2>Sign in to DrainWatch</h2><p>Your credentials determine which workspace opens.</p>{login.isError && <div className="auth-error" data-testid="status-login-error">We could not sign you in. Check your email and password, then try again.</div>}<div className="form-group"><label htmlFor="login-email">Email address</label><input id="login-email" className="field" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-login-email" /></div><div className="form-group"><label htmlFor="login-password">Password</label><input id="login-password" className="field" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="input-login-password" /></div><button className="btn btn-primary" style={{ width: '100%', marginTop: 7 }} disabled={login.isPending} data-testid="button-login">{login.isPending ? 'Signing in…' : 'Continue'} <ArrowRight size={15} /></button><div className="auth-switch">Citizen and officer accounts use this same secure sign-in.</div></form></div>
  </div>;
}

function CitizenLogin() {
  const [, setLocation] = useLocation();
  const login = useCitizenLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <div className="auth-page">
    <div className="auth-art"><Brand /><div><div className="eyebrow" style={{ color: 'hsl(var(--sidebar-primary))' }}>Citizen portal</div><h1>Your report should never disappear into the dark.</h1><p>Sign in to submit reports, save your places and follow progress from first signal to resolution.</p></div><div className="auth-quote">“The most useful report is the one a response team can act on.”<br /><br />— DrainWatch response principle</div></div>
     <div className="auth-form-wrap"><form className="auth-form" onSubmit={(event) => { event.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: (session) => { localStorage.setItem('drainwatch-session', JSON.stringify(session)); setLocation('/my-reports'); } }); }}><div className="eyebrow">Welcome back</div><h2>Citizen sign in</h2><p>Use your registered email to see your reports and updates.</p>{login.isError && <div className="auth-error" data-testid="status-login-error">We could not sign you in. Check your details and try again.</div>}<div className="form-group"><label htmlFor="citizen-email">Email address</label><input id="citizen-email" className="field" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-citizen-email" /></div><div className="form-group"><label htmlFor="citizen-password">Password</label><input id="citizen-password" className="field" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="input-citizen-password" /></div><button className="btn btn-primary" style={{ width: '100%', marginTop: 7 }} disabled={login.isPending} data-testid="button-citizen-login">{login.isPending ? 'Signing in…' : 'Sign in to my reports'} <ArrowRight size={15} /></button><div className="auth-switch">Need the municipal workspace? <Link href="/officer/login" data-testid="link-officer-login">Officer sign in</Link></div></form></div>
  </div>;
}

function ReportForm() {
  const [, setLocation] = useLocation();
  const createReport = useCreateCitizenReport();
  const session = useMemo(storedSession, []);
  const [hazard, setHazard] = useState('blocked_drain');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('17.3850');
  const [longitude, setLongitude] = useState('78.4867');
  if (session.role !== 'citizen') {
    return <div className="app-shell"><PublicNav /><main className="page-wrap"><div className="empty" style={{ maxWidth: 600, margin: '100px auto' }}><ShieldCheck size={29} style={{ margin: '0 auto 10px', color: 'hsl(var(--primary))' }} /><strong>Sign in to submit a report</strong><span>Your report will be attached to your private citizen account so you can track it later.</span><div><Link href="/login" className="btn btn-primary" style={{ marginTop: 17 }} data-testid="link-report-sign-in">Sign in</Link></div></div><PublicFooter /></main></div>;
  }
  return <div className="app-shell"><PublicNav /><main className="page-wrap"><div className="form-shell" style={{ paddingTop: 46 }}><div className="content-head"><div><div className="eyebrow">Citizen report</div><h2>Give the street a signal.</h2><p>Tell us what is happening and where. No perfect wording required.</p></div><span className="demo-tag">Response-ready intake</span></div><div className="form-card"><form onSubmit={(event) => { event.preventDefault(); createReport.mutate({ data: { hazard_type: hazard as never, description, location_name: locationName, latitude: Number(latitude), longitude: Number(longitude) } }, { onSuccess: (report) => { setLocation(`/track-report?id=${report.id}`); } }); }}><div className="form-grid"><div className="form-group full"><label>What are you seeing?</label><div className="radio-grid">{[['blocked_drain', 'Blocked drain'], ['waterlogging', 'Waterlogging'], ['open_manhole', 'Open manhole'], ['sewage_overflow', 'Sewage overflow'], ['damaged_road', 'Damaged road'], ['other', 'Other']].map(([value, label]) => <label className="radio-option" key={value}><input type="radio" name="hazard" value={value} checked={hazard === value} onChange={() => setHazard(value)} />{label}</label>)}</div></div><div className="form-group full"><label htmlFor="report-description">What should the response team know?</label><textarea id="report-description" className="field" minLength={10} placeholder="For example: water is knee-deep outside the pharmacy entrance…" value={description} onChange={(e) => setDescription(e.target.value)} required data-testid="input-report-description" /><span className="help">A specific detail helps teams verify the location faster.</span></div><div className="form-group full"><label htmlFor="report-location">Location or nearby landmark</label><input id="report-location" className="field" minLength={2} placeholder="Road, landmark, colony or junction" value={locationName} onChange={(e) => setLocationName(e.target.value)} required data-testid="input-report-location" /></div><div className="form-group"><label htmlFor="report-latitude">Latitude</label><input id="report-latitude" className="field" type="number" step="any" min="16" max="18" value={latitude} onChange={(e) => setLatitude(e.target.value)} required data-testid="input-report-latitude" /></div><div className="form-group"><label htmlFor="report-longitude">Longitude</label><input id="report-longitude" className="field" type="number" step="any" min="77" max="79" value={longitude} onChange={(e) => setLongitude(e.target.value)} required data-testid="input-report-longitude" /></div></div>{createReport.isError && <div className="auth-error" style={{ marginTop: 20 }} data-testid="status-report-error">This report could not be sent. Please check the location and try again.</div>}<div className="notice" style={{ marginTop: 22 }}><Info size={16} /><span>Reports may be marked as demo data when the municipal server is in demonstration mode.</span></div><div className="actions" style={{ justifyContent: 'flex-end' }}><Link href="/" className="btn btn-outline" data-testid="link-cancel-report">Cancel</Link><button className="btn btn-primary" type="submit" disabled={createReport.isPending} data-testid="button-submit-report">{createReport.isPending ? 'Sending report…' : 'Send report'} <Send size={15} /></button></div></form></div></div><PublicFooter /></main></div>;
}

function CitizenReports() {
  const reports = useListCitizenReports();
  const session = useMemo(storedSession, []);
  if (session.role !== 'citizen') {
    return <div className="app-shell"><PublicNav /><main className="page-wrap"><div className="empty" style={{ maxWidth: 600, margin: '100px auto' }}><ClipboardList size={29} style={{ margin: '0 auto 10px', color: 'hsl(var(--primary))' }} /><strong>Sign in to view your reports</strong><span>Your report history is private to your citizen account.</span><div><Link href="/login" className="btn btn-primary" style={{ marginTop: 17 }}>Sign in</Link></div></div><PublicFooter /></main></div>;
  }
  return <div className="app-shell"><PublicNav /><main className="page-wrap"><div className="content-head" style={{ paddingTop: 47 }}><div><div className="eyebrow">Citizen portal</div><h2>My reports</h2><p>A simple record of every signal you have sent.</p></div><Link href="/report" className="btn btn-primary" data-testid="link-new-report"><Send size={15} /> New report</Link></div>{reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : reports.data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Report</th><th>Location</th><th>Status</th><th>Sent</th><th /></tr></thead><tbody>{reports.data.map((report) => <tr key={report.id} data-testid={`row-citizen-report-${report.id}`}><td><span className="report-id">{shortId(report.id)}</span><div className="report-kind">{hazardName(report.hazard_type)}</div></td><td><span className="report-location">{report.location_name}</span></td><td><span className={`pill ${report.status}`}>{hazardName(report.status)}</span>{report.is_demo && <span className="demo-tag" style={{ marginLeft: 6 }}>Demo</span>}</td><td>{fmt(report.created_at)}</td><td><Link href={`/track-report?id=${report.id}`} className="btn btn-outline" style={{ minHeight: 32, padding: '0 10px' }} data-testid={`link-track-report-${report.id}`}>Track <ArrowRight size={13} /></Link></td></tr>)}</tbody></table></div> : <div className="empty"><ClipboardList size={29} style={{ margin: '0 auto 10px', color: 'hsl(var(--primary))' }} /><strong>No reports yet</strong><span>When you send a report, its progress will stay here.</span><div><Link href="/report" className="btn btn-primary" style={{ marginTop: 17 }} data-testid="link-empty-new-report">Send your first report</Link></div></div>}<PublicFooter /></main></div>;
}

function TrackReport() {
  const params = new URLSearchParams(window.location.search);
  const [id, setId] = useState(params.get('id') || '');
  const [lookup, setLookup] = useState(params.get('id') || '');
  const report = useGetCitizenReport(lookup, { query: { enabled: Boolean(lookup), queryKey: getGetCitizenReportQueryKey(lookup) } });
  const statusSteps = ['reported', 'verified', 'assigned', 'in_progress', 'resolved'];
  const index = report.data ? statusSteps.indexOf(report.data.status) : -1;
  return <div className="app-shell"><PublicNav /><main className="page-wrap"><div className="track-box"><div className="eyebrow">Public tracking</div><h2 style={{ fontSize: 'clamp(35px, 6vw, 57px)', letterSpacing: '-.07em', margin: '13px 0 10px' }}>Where is the signal now?</h2><p className="section-intro">Enter the report ID from your confirmation. You can also open any report from My reports.</p><form className="track-search" onSubmit={(e) => { e.preventDefault(); setLookup(id.trim()); }}><input className="field" placeholder="Report ID" value={id} onChange={(e) => setId(e.target.value)} data-testid="input-track-id" /><button className="btn btn-primary" type="submit" data-testid="button-track-report"><Search size={15} /> Find report</button></form>{lookup && report.isLoading && <Loading label="Finding that report" />}{lookup && report.isError && <ErrorState onRetry={() => report.refetch()} />}{report.data && <div className="track-result"><div className="detail-card"><div className="detail-hero"><div><div className="eyebrow">{shortId(report.data.id)}</div><h2>{report.data.location_name}</h2></div><span className={`pill ${report.data.status}`}>{hazardName(report.data.status)}</span></div><p className="description">{report.data.description}</p><div style={{ margin: '30px 0 20px' }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'hsl(var(--muted-foreground))' }}><span>Received {fmt(report.data.created_at)}</span><span>{index >= 0 ? `${index + 1} of ${statusSteps.length}` : 'Reviewing'}</span></div><div className="risk-meter" style={{ marginTop: 8 }}><span style={{ width: `${Math.max(8, ((index + 1) / statusSteps.length) * 100)}%` }} /></div></div><div className="timeline">{statusSteps.map((step, stepIndex) => <div className="timeline-item" key={step}><strong style={{ color: stepIndex <= index ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))' }}>{hazardName(step)}</strong><span>{stepIndex < index ? 'Completed' : stepIndex === index ? 'Current status' : 'Awaiting update'}</span></div>)}</div></div><div className="notice" style={{ marginTop: 12 }}><ShieldCheck size={16} /><span>Thank you for making this location visible. Updates are based on municipal review.</span></div></div>}</div><PublicFooter /></main></div>;
}

 function OfficerLogin() {
  const [, setLocation] = useLocation();
  const login = useOfficerLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <div className="auth-page"><div className="auth-art"><Brand officer /><div><div className="eyebrow" style={{ color: 'hsl(var(--sidebar-primary))' }}>Municipal operations</div><h1>Calm decisions for streets under pressure.</h1><p>A map-first incident desk for Hyderabad response teams. Prioritize by evidence, coordinate clearly, close the loop.</p></div><div className="auth-quote">Response teams see the same signal residents can track — with the operational context to act on it.</div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={(e) => { e.preventDefault(); login.mutate({ data: { email, password } }, { onSuccess: (session) => { localStorage.setItem('drainwatch-session', JSON.stringify(session)); setLocation('/officer/dashboard'); } }); }}><div className="eyebrow">Restricted workspace</div><h2>Officer sign in</h2><p>Use your municipal credentials to enter the response desk.</p>{login.isError && <div className="auth-error">Sign in failed. Confirm your credentials or contact your administrator.</div>}<div className="form-group"><label htmlFor="officer-email">Work email</label><input id="officer-email" className="field" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="input-officer-email" /></div><div className="form-group"><label htmlFor="officer-password">Password</label><input id="officer-password" className="field" autoComplete="current-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="input-officer-password" /></div><button className="btn btn-primary" style={{ width: '100%', marginTop: 7 }} disabled={login.isPending} data-testid="button-officer-login">{login.isPending ? 'Opening desk…' : 'Enter incident desk'} <ArrowRight size={15} /></button><div className="auth-switch">Citizen access? <Link href="/citizen/login" data-testid="link-citizen-login-alt">Sign in as a citizen</Link></div></form></div></div>;
}

const officerNav = [
  { href: '/officer/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/officer/map', label: 'Live map', icon: Map },
  { href: '/officer/reports', label: 'Report queue', icon: ClipboardList },
  { href: '/officer/news-intelligence', label: 'News intelligence', icon: BookOpen },
  { href: '/officer/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/officer/assignments', label: 'Assignments', icon: Users },
];
const officerNavBottom = [
  { href: '/officer/audit-logs', label: 'Audit trail', icon: FileClock },
  { href: '/officer/settings', label: 'Settings', icon: Settings },
];

function OfficerShell({ children, title }: { children: React.ReactNode; title: string }) {
  const [location, setLocation] = useLocation();
  const session = useMemo(storedSession, []);
  useEffect(() => {
    if (session.role !== 'officer') setLocation('/login');
  }, [session.role, setLocation]);
  if (session.role !== 'officer') return <Loading label="Checking officer access" />;
  return <div className="portal"><aside className="sidebar"><Brand officer /><div className="sidebar-section">Response desk</div><nav>{officerNav.map(({ href, label, icon: Icon }) => <Link href={href} className={`side-link ${location === href ? 'active' : ''}`} key={href} data-testid={`link-officer-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={16} /><span>{label}</span></Link>)}</nav><div className="side-bottom">{officerNavBottom.map(({ href, label, icon: Icon }) => <Link href={href} className={`side-link ${location === href ? 'active' : ''}`} key={href} data-testid={`link-officer-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={16} /><span>{label}</span></Link>)}<button className="side-link" style={{ border: 0, background: 'transparent', width: '100%', cursor: 'pointer' }} onClick={() => { localStorage.removeItem('drainwatch-session'); setLocation('/login'); }} data-testid="button-officer-logout"><LogOut size={16} /><span>Sign out</span></button></div></aside><div className="portal-main"><header className="portal-top"><h1>{title}</h1><div className="top-meta"><span className="live">Systems online</span><span>{session.name || 'Response officer'}</span><span className="avatar">{initials(session.name)}</span></div></header><main className="portal-content">{children}</main></div></div>;
}

function OfficerMap({ reports, height = 450 }: { reports: Report[]; height?: number }) {
  return <div className="leaflet-map" style={{ height }} data-testid="map-hyderabad"><MapContainer center={HYDERABAD} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{reports.map((report) => { const markerColor = report.risk_score >= 75 ? '#b83d32' : report.risk_score >= 50 ? '#d77924' : report.risk_score >= 25 ? '#c19a17' : '#087f73'; return <CircleMarker key={report.id} center={[report.latitude, report.longitude]} radius={report.risk_score >= 75 ? 10 : 7} pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: .8, weight: 2 }}><Popup><strong>{report.location_name}</strong><br />{hazardName(report.hazard_type)} · {hazardName(report.status)}<br />Risk {report.risk_score}/100 · {report.risk_level}<br /><small>{report.is_demo ? 'Demo report' : 'Citizen report'}</small></Popup></CircleMarker>; })}</MapContainer></div>;
}

function StatCards({ stats }: { stats?: DashboardStats }) {
  const values = stats ? [[stats.active_reports, 'Active reports', 'Needs attention'], [stats.critical_reports, 'Critical now', 'Priority queue'], [stats.verified_today, 'Verified today', 'Evidence checked'], [stats.resolved_today, 'Resolved today', 'Closed loop']] : [[0, 'Active reports', 'Loading'], [0, 'Critical now', 'Loading'], [0, 'Verified today', 'Loading'], [0, 'Resolved today', 'Loading']];
  return <div className="dash-grid">{values.map(([value, label, foot]) => <div className="stat-card" key={label as string}><div className="stat-value">{stats ? value : <div className="skeleton" style={{ width: 55 }} />}</div><div className="stat-label">{label}</div><div className="stat-foot"><span>{foot}</span><Activity size={13} /></div></div>)}</div>;
}

function ActivityCard({ activity }: { activity: ActivityItem[] | undefined }) {
  return <div className="map-card"><div className="card-head"><h3>Recent activity</h3><Link href="/officer/audit-logs" style={{ color: 'hsl(var(--primary))', fontSize: 11 }} data-testid="link-view-audit">View audit trail <ArrowRight size={12} style={{ verticalAlign: 'middle' }} /></Link></div>{activity?.length ? <div className="activity-list">{activity.slice(0, 5).map((item) => <div className="activity" key={item.id}><span className={`activity-mark ${item.severity === 'critical' ? 'critical' : ''}`} /><div><div className="activity-text">{item.text}</div><div className="activity-time">{fmt(item.created_at)} · {hazardName(item.status)}</div></div></div>)}</div> : <div className="empty">No recent activity available.</div>}</div>;
}

function Dashboard() {
  const stats = useGetOfficerDashboard();
  const reports = useListOfficerReports();
  const activity = useListOfficerActivity();
  const weather = useGetOfficerWeather();
  return <OfficerShell title="Operational overview"><div className="content-head"><div><div className="overline">Tuesday · Hyderabad response network</div><h2>Good morning. Here is the city.</h2><p>Prioritize what needs a response before the next rainfall window.</p></div>{stats.data?.is_demo && <span className="demo-tag">Demo data active</span>}</div>{stats.isError ? <ErrorState onRetry={() => stats.refetch()} /> : <StatCards stats={stats.data} />}<div className="dashboard-grid"><div className="map-card"><div className="card-head"><div><h3>Incident map</h3><span>Hyderabad · live report coordinates</span></div><Link className="btn btn-outline" style={{ minHeight: 32, padding: '0 10px' }} href="/officer/map" data-testid="link-open-map">Open full map <ArrowRight size={13} /></Link></div>{reports.isLoading ? <Loading label="Loading incident map" /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : <OfficerMap reports={reports.data || []} height={445} />}</div><div className="side-stack"><div className="map-card"><div className="card-head"><h3>Rainfall context</h3><CloudRain size={16} color="hsl(var(--primary))" /></div><div className="weather">{weather.isLoading ? <Loading /> : weather.data?.status === 'unavailable' ? <div className="empty"><strong>Weather unavailable</strong><span>Risk scoring continues with available signals.</span></div> : <><div className="weather-status"><div><div className="overline">Current status</div><div className="weather-number">{weather.data?.rainfall_mm ?? '—'}<small style={{ fontSize: 13, letterSpacing: 0 }}> mm</small></div></div><span className="pill available">{weather.data?.status || 'Available'}</span></div><div className="weather-detail"><span>{weather.data?.source || 'Municipal weather feed'}</span><span>{fmt(weather.data?.observed_at)}</span></div></>}</div></div><ActivityCard activity={activity.data} /></div></div></OfficerShell>;
}

function OfficerMapPage() {
  const reports = useListOfficerReports();
  const [severity, setSeverity] = useState('');
  const filtered = reports.data?.filter((report) => !severity || report.severity === severity) || [];
  return <OfficerShell title="Live incident map"><div className="content-head"><div><div className="overline">Geographic operations</div><h2>See every signal in place.</h2><p>Map markers use the coordinates submitted with each authorized report.</p></div><div className="filters"><select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)} data-testid="select-map-severity"><option value="">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><span className="demo-tag">{filtered.length} mapped</span></div></div>{reports.isLoading ? <Loading label="Loading Hyderabad map" /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : <div className="map-card"><div className="card-head"><h3>Hyderabad · OpenStreetMap</h3><span>Click a marker for report context</span></div><OfficerMap reports={filtered} height={Math.min(650, Math.max(440, window.innerHeight - 230))} /></div>}</OfficerShell>;
}

function OfficerReports() {
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const reports = useListOfficerReports({ status: status || undefined, severity: severity ? severity as never : undefined });
  return <OfficerShell title="Report queue"><div className="content-head"><div><div className="overline">Authorized reports</div><h2>Work the queue.</h2><p>Filter by workflow state or severity, then open the operational record.</p></div><span className="demo-tag">{reports.data?.length ?? '—'} records</span></div><div className="filters"><select className="select" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="select-report-status"><option value="">All statuses</option><option value="reported">Reported</option><option value="verified">Verified</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select><select className="select" value={severity} onChange={(e) => setSeverity(e.target.value)} data-testid="select-report-severity"><option value="">All severity</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select><button className="btn btn-outline" onClick={() => reports.refetch()} data-testid="button-refresh-reports"><RefreshCw size={14} /> Refresh</button></div>{reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : reports.data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Report</th><th>Location</th><th>Risk</th><th>Status</th><th>Source</th><th>Updated</th><th /></tr></thead><tbody>{reports.data.map((report) => <tr key={report.id} data-testid={`row-officer-report-${report.id}`}><td><span className="report-id">{shortId(report.id)}</span><div className="report-kind">{hazardName(report.hazard_type)}</div></td><td><span className="report-location">{report.location_name}</span><div className="report-kind">{report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</div></td><td><span className={`pill ${report.risk_level}`}>{report.risk_score} · {report.risk_level}</span></td><td><span className={`pill ${report.status}`}>{hazardName(report.status)}</span></td><td>{report.source}{report.is_demo && <span className="demo-tag" style={{ marginLeft: 5 }}>Demo</span>}</td><td>{fmt(report.updated_at)}</td><td><Link href={`/officer/reports/${report.id}`} className="btn btn-outline" style={{ minHeight: 32, padding: '0 9px' }} data-testid={`link-officer-report-${report.id}`}>Open <ArrowRight size={12} /></Link></td></tr>)}</tbody></table></div> : <div className="empty"><ListFilter size={28} style={{ margin: '0 auto 10px' }} /><strong>Nothing in this view</strong><span>Try changing the workflow filters.</span></div>}</OfficerShell>;
}

function OfficerReportDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const report = useGetOfficerReport(id, { query: { enabled: Boolean(id), queryKey: getGetOfficerReportQueryKey(id) } });
  const update = useUpdateOfficerReportStatus();
  const queryClient = useQueryClient();
  const statusOptions = ['reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected'];
  return <OfficerShell title="Operational report"><div className="content-head"><div><Link href="/officer/reports" className="overline" data-testid="link-back-report-queue"><ArrowLeft size={12} style={{ verticalAlign: 'middle' }} /> Back to queue</Link><h2 style={{ marginTop: 10 }}>{report.data ? report.data.location_name : 'Report detail'}</h2><p>{report.data ? `${shortId(report.data.id)} · received ${fmt(report.data.created_at)}` : 'Loading operational record'}</p></div>{report.data?.is_demo && <span className="demo-tag">Demo data</span>}</div>{report.isLoading ? <Loading /> : report.isError ? <ErrorState onRetry={() => report.refetch()} /> : report.data ? <div className="detail-grid"><div className="detail-card"><div className="detail-hero"><div><div className="eyebrow">{hazardName(report.data.hazard_type)}</div><h2>{report.data.location_name}</h2></div><span className={`pill ${report.data.severity}`}>{report.data.severity} severity</span></div><p className="description">{report.data.description}</p><div className="detail-list" style={{ marginTop: 28 }}><div><dt>Coordinates</dt><dd>{report.data.latitude.toFixed(5)}, {report.data.longitude.toFixed(5)}</dd></div><div><dt>Verification</dt><dd>{report.data.verification_status}</dd></div><div><dt>Source</dt><dd>{report.data.source}</dd></div><div><dt>Risk level</dt><dd>{report.data.risk_level} · {report.data.risk_score}/100</dd></div></div><div style={{ marginTop: 28 }}><div className="risk-row"><span>Risk score</span><strong>{report.data.risk_score}/100</strong></div><div className="risk-meter"><span style={{ width: `${report.data.risk_score}%` }} /></div></div><div className="actions" style={{ marginTop: 30 }}><select className="select" defaultValue={report.data.status} disabled={update.isPending} onChange={(e) => { update.mutate({ id, data: { status: e.target.value as ReportStatus } }, { onSuccess: (next) => { queryClient.setQueryData(getGetOfficerReportQueryKey(id), next); queryClient.invalidateQueries({ queryKey: getListOfficerReportsQueryKey() }); } }); }} data-testid="select-detail-status">{statusOptions.map((status) => <option value={status} key={status}>{hazardName(status)}</option>)}</select>{update.isPending && <span className="help">Saving status…</span>}{update.isError && <span className="auth-error" style={{ margin: 0 }}>Update failed</span>}</div></div><div className="side-stack"><div className="map-card"><div className="card-head"><h3>Location evidence</h3><Navigation size={15} color="hsl(var(--primary))" /></div><OfficerMap reports={[report.data]} height={270} /></div><div className="detail-card"><h3>Risk components</h3>{Object.entries(report.data.risk_components).map(([key, value]) => <div key={key}><div className="risk-row"><span>{hazardName(key)}</span><strong>{value}</strong></div><div className="risk-meter"><span style={{ width: `${Math.min(100, Number(value))}%` }} /></div></div>)}</div></div></div> : null}</OfficerShell>;
}

function NewsIntelligence() {
  const reports = useListPublicReports();
  const alerts = useListPublicAlerts();
  const newsReports = reports.data?.filter((report) => report.source === 'news') || [];
  return <OfficerShell title="News intelligence"><div className="content-head"><div><div className="overline">External signal layer</div><h2>Context beyond the queue.</h2><p>Public safety alerts and news-sourced reports help explain emerging patterns.</p></div><BookOpen size={22} color="hsl(var(--primary))" /></div><div className="simple-grid"><div className="detail-card"><h3>Public alerts</h3>{alerts.isLoading ? <Loading /> : alerts.isError ? <ErrorState onRetry={() => alerts.refetch()} /> : alerts.data?.length ? alerts.data.map((alert) => <div className="assignment-card" key={alert.id}><div className="assignment-top"><strong>{alert.title}</strong><span className={`pill ${alert.severity}`}>{alert.severity}</span></div><p>{alert.message}</p><span className="help">Issued {fmt(alert.issued_at)}</span></div>) : <div className="empty">No public alerts currently issued.</div>}</div><div className="detail-card"><h3>Publicly visible incident signals</h3>{reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : newsReports.length ? newsReports.map((report) => <div className="assignment-card" key={report.id}><div className="assignment-top"><strong>{report.location_name}</strong><span className={`pill ${report.severity}`}>{report.severity}</span></div><p>{report.description}</p><span className="help">{hazardName(report.hazard_type)} · {fmt(report.created_at)}</span></div>) : <div className="empty">No news-sourced signals in the current feed.</div>}</div></div></OfficerShell>;
}

function Analytics() {
  const reports = useListOfficerReports();
  const stats = useGetOfficerDashboard();
  const counts = ['reported', 'verified', 'assigned', 'in_progress', 'resolved'].map((status) => reports.data?.filter((report) => report.status === status).length || 0);
  const max = Math.max(...counts, 1);
  return <OfficerShell title="Analytics"><div className="content-head"><div><div className="overline">Operational patterns</div><h2>Measure the response, not just the volume.</h2><p>Current authorized reports grouped by workflow state and risk.</p></div>{stats.data?.is_demo && <span className="demo-tag">Demo data active</span>}</div>{reports.isLoading || stats.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : <div className="simple-grid"><div className="detail-card"><h3>Workflow distribution</h3><div className="chart-bars">{counts.map((count, index) => <div className="bar-wrap" key={['Reported', 'Verified', 'Assigned', 'In progress', 'Resolved'][index]}><div className="bar" style={{ height: `${Math.max(7, (count / max) * 100)}%` }} title={`${count} reports`} /><span className="bar-label">{['New', 'Check', 'Assign', 'Work', 'Done'][index]}</span></div>)}</div><div className="detail-list" style={{ marginTop: 20 }}>{counts.map((count, index) => <div key={index}><dt>{['Reported', 'Verified', 'Assigned', 'In progress', 'Resolved'][index]}</dt><dd>{count} reports</dd></div>)}</div></div><div className="detail-card"><h3>Coverage snapshot</h3><div className="metric" style={{ marginBottom: 10 }}><div className="metric-number">{stats.data?.total_reports ?? reports.data?.length}</div><div className="metric-label">Total reports in system</div></div><div className="metric" style={{ marginBottom: 10 }}><div className="metric-number">{reports.data?.filter((r) => r.risk_level === 'critical').length || 0}</div><div className="metric-label">Critical risk records</div></div><div className="metric"><div className="metric-number">{reports.data?.filter((r) => r.verification_status === 'verified').length || 0}</div><div className="metric-label">Verified evidence</div></div></div></div>}</OfficerShell>;
}

function Assignments() {
  const reports = useListOfficerReports({ status: 'assigned' });
  return <OfficerShell title="Assignments"><div className="content-head"><div><div className="overline">Dispatch workflow</div><h2>Make ownership visible.</h2><p>Assigned records waiting for field progress updates.</p></div><span className="demo-tag">{reports.data?.length ?? '—'} assigned</span></div>{reports.isLoading ? <Loading /> : reports.isError ? <ErrorState onRetry={() => reports.refetch()} /> : reports.data?.length ? <div>{reports.data.map((report) => <div className="assignment-card" key={report.id}><div className="assignment-top"><div><strong>{report.location_name}</strong><div className="report-kind">{shortId(report.id)} · {hazardName(report.hazard_type)}</div></div><span className={`pill ${report.severity}`}>{report.severity}</span></div><p>{report.description}</p><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="help">Assigned {fmt(report.updated_at)} · {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span><Link href={`/officer/reports/${report.id}`} className="btn btn-outline" style={{ minHeight: 33, padding: '0 11px' }} data-testid={`link-assignment-${report.id}`}>Open record <ArrowRight size={13} /></Link></div></div>)}</div> : <div className="empty"><Users size={28} style={{ margin: '0 auto 10px' }} /><strong>No assignments waiting</strong><span>The assigned queue is clear.</span></div>}</OfficerShell>;
}

function AuditLogs() {
  const logs = useListOfficerAuditLogs();
  return <OfficerShell title="Audit trail"><div className="content-head"><div><div className="overline">Accountability record</div><h2>Every change has a trace.</h2><p>Immutable activity history for authorized operational actions.</p></div><FileClock size={22} color="hsl(var(--primary))" /></div>{logs.isLoading ? <Loading /> : logs.isError ? <ErrorState onRetry={() => logs.refetch()} /> : logs.data?.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Report</th></tr></thead><tbody>{logs.data.map((log) => <tr key={log.id} data-testid={`row-audit-${log.id}`}><td>{fmt(log.created_at)}</td><td><span className="report-location">{log.action}</span></td><td>{log.actor}</td><td><span className="report-id">{shortId(log.report_id)}</span></td></tr>)}</tbody></table></div> : <div className="empty"><FileClock size={28} style={{ margin: '0 auto 10px' }} /><strong>No audit events yet</strong><span>Actions taken in the desk will appear here.</span></div>}</OfficerShell>;
}

function SettingsPage() {
  const health = useHealthCheck();
  const [alerts, setAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  return <OfficerShell title="Settings"><div className="content-head"><div><div className="overline">Workspace controls</div><h2>A quieter desk, tuned to the work.</h2><p>Manage local preferences for this officer workspace.</p></div><Settings size={22} color="hsl(var(--primary))" /></div><div className="detail-card" style={{ maxWidth: 760 }}><div className="setting-row"><div><strong>Incident alerts</strong><span>Surface priority changes in the response desk.</span></div><button className={`switch ${alerts ? 'on' : ''}`} onClick={() => setAlerts(!alerts)} aria-label="Toggle incident alerts" data-testid="button-toggle-alerts" /></div><div className="setting-row"><div><strong>Automatic refresh</strong><span>Keep queue and map data current while the desk is open.</span></div><button className={`switch ${autoRefresh ? 'on' : ''}`} onClick={() => setAutoRefresh(!autoRefresh)} aria-label="Toggle automatic refresh" data-testid="button-toggle-refresh" /></div><div className="setting-row"><div><strong>API connection</strong><span>Health endpoint status for this workspace.</span></div><span className={`pill ${health.data?.status === 'ok' ? 'available' : ''}`}>{health.isLoading ? 'Checking' : health.data?.status || 'Unavailable'}</span></div><div className="setting-row"><div><strong>Data environment</strong><span>Reports marked demo are deterministic backend fixtures.</span></div><span className="demo-tag">Visible demo labels</span></div></div></OfficerShell>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/" component={Home} /><Route path="/report" component={ReportForm} /><Route path="/my-reports" component={CitizenReports} /><Route path="/track-report" component={TrackReport} /><Route path="/login" component={LoginPage} /><Route path="/citizen/login" component={LoginPage} /><Route path="/officer/login" component={LoginPage} />
    <Route path="/officer/dashboard" component={Dashboard} /><Route path="/officer/map" component={OfficerMapPage} /><Route path="/officer/reports/:id" component={OfficerReportDetail} /><Route path="/officer/reports" component={OfficerReports} /><Route path="/officer/news-intelligence" component={NewsIntelligence} /><Route path="/officer/analytics" component={Analytics} /><Route path="/officer/assignments" component={Assignments} /><Route path="/officer/audit-logs" component={AuditLogs} /><Route path="/officer/settings" component={SettingsPage} />
    <Route component={NotFound} />
  </Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;