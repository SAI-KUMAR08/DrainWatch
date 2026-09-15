'use client';

import { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Map, ClipboardList, BookOpen, BarChart3,
  Users, FileClock, Settings, LogOut,
} from 'lucide-react';
import { initials, storedSession } from '@/lib/utils';

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

function Loading({ label = 'Loading live information' }: { label?: string }) {
  return <div className="loading-state"><div className="skeleton" style={{ width: 130, margin: '0 auto 10px' }} /><span>{label}</span></div>;
}

export default function OfficerShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useMemo(storedSession, []);

  useEffect(() => {
    if (session.role !== 'officer') router.push('/login');
  }, [session.role, router]);

  if (session.role !== 'officer') return <Loading label="Checking officer access" />;

  return (
    <div className="portal">
      <aside className="sidebar">
        <Link href="/officer/dashboard" className="brand">
          <span className="brand-mark" />
          <span><span className="brand-word">DrainWatch</span><span className="brand-sub">Municipal incident desk</span></span>
        </Link>
        <div className="sidebar-section">Response desk</div>
        <nav>
          {officerNav.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              className={`side-link ${pathname === href ? 'active' : ''}`}
              key={href}
              data-testid={`link-officer-${label.toLowerCase().replaceAll(' ', '-')}`}
            >
              <Icon size={16} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="side-bottom">
          {officerNavBottom.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              className={`side-link ${pathname === href ? 'active' : ''}`}
              key={href}
              data-testid={`link-officer-${label.toLowerCase().replaceAll(' ', '-')}`}
            >
              <Icon size={16} /><span>{label}</span>
            </Link>
          ))}
          <button
            className="side-link"
            style={{ border: 0, background: 'transparent', width: '100%', cursor: 'pointer' }}
            onClick={() => { localStorage.removeItem('drainwatch-session'); router.push('/login'); }}
            data-testid="button-officer-logout"
          >
            <LogOut size={16} /><span>Sign out</span>
          </button>
        </div>
      </aside>
      <div className="portal-main">
        <header className="portal-top">
          <h1>{title}</h1>
          <div className="top-meta">
            <span className="live">Systems online</span>
            <span>{session.name || 'Response officer'}</span>
            <span className="avatar">{initials(session.name)}</span>
          </div>
        </header>
        <main className="portal-content">{children}</main>
      </div>
    </div>
  );
}
