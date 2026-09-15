import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', textAlign: 'center', fontFamily: 'var(--app-font-sans, sans-serif)', padding: '20px' }}>
      <div>
        <div style={{ fontSize: 11, fontFamily: 'var(--app-font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.1em', color: 'hsl(172 82% 31%)', marginBottom: 12 }}>404</div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 56px)', letterSpacing: '-.07em', margin: '0 0 14px' }}>Page not found.</h1>
        <p style={{ color: 'hsl(196 20% 42%)', fontSize: 14, marginBottom: 28 }}>The page you are looking for does not exist or has moved.</p>
        <Link href="/" className="btn btn-primary">Return home</Link>
      </div>
    </div>
  );
}
