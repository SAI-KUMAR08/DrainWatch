'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useCreateCitizenReport } from '@workspace/api-client-react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Send, Info, LogOut, User, MapPin, Crosshair, Camera, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';
import { storedSession } from '@/lib/utils';

// Leaflet map picker — loaded client-side only
const MapPicker = dynamic(() => import('./map-picker'), { ssr: false, loading: () => <div className="map-picker-loading"><Loader2 size={22} className="spin" /><span>Loading map…</span></div> });

// ── Image compression helper ───────────────────────────────────────────────
async function compressImage(file: File, maxKb = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      const MAX = 1200;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.82;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > maxKb * 1024 * 1.37 && quality > 0.3) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      URL.revokeObjectURL(url);
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Reverse geocode via Nominatim ──────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    const a = data.address ?? {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.suburb || a.neighbourhood || a.city_district,
      a.city || a.town || a.village,
    ].filter(Boolean);
    return parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || '';
  } catch {
    return '';
  }
}

type LocMode = 'idle' | 'loading' | 'gps' | 'map' | 'manual';

export default function ReportPage() {
  const router = useRouter();
  const createReport = useCreateCitizenReport();
  const [session, setSession] = useState<ReturnType<typeof storedSession>>({});
  const [mounted, setMounted] = useState(false);

  // Form state
  const [hazard, setHazard] = useState('blocked_drain');
  const [description, setDescription] = useState('');

  // Location state
  const [locMode, setLocMode] = useState<LocMode>('idle');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  // Photo state
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSession(storedSession());
    setMounted(true);
  }, []);

  function signOut() {
    localStorage.removeItem('drainwatch-session');
    setSession({});
    router.push('/');
  }

  // ── GPS location ───────────────────────────────────────────────────────
  function useGPS() {
    setGpsError('');
    setLocMode('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setLocMode('gps');
        setGeocoding(true);
        const name = await reverseGeocode(lat, lng);
        setLocationName(name);
        setGeocoding(false);
      },
      (err) => {
        setLocMode('idle');
        setGpsError(
          err.code === 1
            ? 'Location access denied. Please allow location in your browser settings.'
            : 'Unable to get your location. Try the map option instead.',
        );
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  // ── Map pin callback ───────────────────────────────────────────────────
  const onMapPin = useCallback(async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocMode('map');
    setGeocoding(true);
    const name = await reverseGeocode(lat, lng);
    setLocationName(name);
    setGeocoding(false);
  }, []);

  // ── Photo handling ─────────────────────────────────────────────────────
  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    setPhotoLoading(true);
    try {
      const compressed = await compressImage(file);
      setPhotoDataUrl(compressed);
    } finally {
      setPhotoLoading(false);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (latitude === null || longitude === null) return;
    createReport.mutate(
      {
        data: {
          hazard_type: hazard as never,
          description,
          location_name: locationName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          latitude,
          longitude,
          photo_url: photoDataUrl ?? undefined,
        } as never,
      },
      { onSuccess: (report) => { router.push(`/track-report?id=${report.id}`); } },
    );
  }

  function NavBar() {
    return (
      <header className="public-nav">
        <Link href="/" className="brand"><span className="brand-mark" /><span><span className="brand-word">DrainWatch</span><span className="brand-sub">Hyderabad civic safety</span></span></Link>
        <nav className="public-links">
          <Link href="/track-report">Track a report</Link>
          <Link href="/my-reports">My reports</Link>
          {mounted && session.token ? (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'hsl(var(--muted-foreground))' }}>
                <User size={14} />{session.name || session.email || 'Citizen'}
              </span>
              <button className="btn btn-outline" onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : mounted ? (
            <>
              <Link href="/register" className="btn btn-outline">Register</Link>
              <Link href="/login" className="btn btn-primary">Sign in</Link>
            </>
          ) : null}
        </nav>
      </header>
    );
  }

  if (mounted && session.role !== 'citizen') {
    return (
      <div className="app-shell">
        <NavBar />
        <main className="page-wrap">
          <div className="empty" style={{ maxWidth: 600, margin: '100px auto' }}>
            <ShieldCheck size={29} style={{ margin: '0 auto 10px', color: 'hsl(var(--primary))' }} />
            <strong>Sign in to submit a report</strong>
            <span>Your report will be attached to your private citizen account so you can track it later.</span>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 17 }}>
              <Link href="/register" className="btn btn-outline">Register</Link>
              <Link href="/login" className="btn btn-primary" data-testid="link-report-sign-in">Sign in</Link>
            </div>
          </div>
          <footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span></footer>
        </main>
      </div>
    );
  }

  const locationSet = latitude !== null && longitude !== null;

  return (
    <div className="app-shell">
      <NavBar />
      <main className="page-wrap">
        <div className="form-shell" style={{ paddingTop: 46 }}>
          <div className="content-head">
            <div><div className="eyebrow">Citizen report</div><h2>Give the street a signal.</h2><p>Tell us what is happening and where. No perfect wording required.</p></div>
            <span className="demo-tag">Response-ready intake</span>
          </div>

          <form onSubmit={handleSubmit}>
            {/* ── Hazard type ─────────────────────────────────────── */}
            <div className="form-card" style={{ marginBottom: 14 }}>
              <h3 className="form-section-title">What are you seeing?</h3>
              <div className="radio-grid">
                {[
                  ['blocked_drain', '🚧', 'Blocked drain'],
                  ['waterlogging', '🌊', 'Waterlogging'],
                  ['open_manhole', '⚠️', 'Open manhole'],
                  ['sewage_overflow', '💧', 'Sewage overflow'],
                  ['damaged_road', '🛣️', 'Damaged road'],
                  ['other', '📍', 'Other hazard'],
                ].map(([value, icon, label]) => (
                  <label className="radio-option" key={value}>
                    <input type="radio" name="hazard" value={value} checked={hazard === value} onChange={() => setHazard(value)} />
                    <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* ── Location ────────────────────────────────────────── */}
            <div className="form-card" style={{ marginBottom: 14 }}>
              <h3 className="form-section-title">Where is it?</h3>

              {/* Action buttons */}
              <div className="loc-actions">
                <button
                  type="button"
                  className={`loc-btn${locMode === 'gps' ? ' loc-btn-active' : ''}`}
                  onClick={useGPS}
                  disabled={locMode === 'loading'}
                  data-testid="button-use-gps"
                >
                  {locMode === 'loading' ? <Loader2 size={16} className="spin" /> : <Crosshair size={16} />}
                  Use my location
                </button>
                <button
                  type="button"
                  className={`loc-btn${locMode === 'map' ? ' loc-btn-active' : ''}`}
                  onClick={() => setLocMode('map')}
                  data-testid="button-pin-map"
                >
                  <MapPin size={16} />
                  Pin on map
                </button>
              </div>

              {gpsError && <div className="auth-error" style={{ marginTop: 10 }}>{gpsError}</div>}

              {/* Map — shown when map mode selected or after GPS success */}
              {(locMode === 'map' || locMode === 'gps') && (
                <div className="map-picker-wrap" style={{ marginTop: 14 }}>
                  <MapPicker
                    lat={latitude ?? 17.3850}
                    lng={longitude ?? 78.4867}
                    onPin={onMapPin}
                  />
                  <p className="help" style={{ marginTop: 7 }}>
                    {locMode === 'map' ? 'Click or drag the pin to the exact hazard location.' : 'Your GPS location is pinned. Drag to adjust.'}
                  </p>
                </div>
              )}

              {/* Location name — shown once coords are set */}
              {locationSet && (
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label htmlFor="report-location" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Location name
                    {geocoding && <Loader2 size={12} className="spin" style={{ color: 'hsl(var(--muted-foreground))' }} />}
                    {!geocoding && locationName && <CheckCircle2 size={12} style={{ color: 'hsl(var(--primary))' }} />}
                  </label>
                  <input
                    id="report-location"
                    className="field"
                    placeholder="Auto-detected from map — edit if needed"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    data-testid="input-report-location"
                  />
                  <span className="help">
                    Detected: {latitude?.toFixed(5)}, {longitude?.toFixed(5)}
                  </span>
                </div>
              )}

              {!locationSet && locMode === 'idle' && (
                <div className="loc-placeholder">
                  <MapPin size={22} style={{ color: 'hsl(var(--primary))' }} />
                  <span>Use your GPS or pin on the map to set the exact spot</span>
                </div>
              )}
            </div>

            {/* ── Description ─────────────────────────────────────── */}
            <div className="form-card" style={{ marginBottom: 14 }}>
              <h3 className="form-section-title">Describe the hazard</h3>
              <div className="form-group">
                <textarea
                  id="report-description"
                  className="field"
                  minLength={3}
                  placeholder="E.g. water is knee-deep outside the pharmacy entrance, drain cover missing since Monday…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  data-testid="input-report-description"
                />
                <span className="help">Minimum 3 characters. A specific detail helps teams verify the location faster.</span>
              </div>
            </div>

            {/* ── Photo ───────────────────────────────────────────── */}
            <div className="form-card" style={{ marginBottom: 20 }}>
              <h3 className="form-section-title">Add a photo <span style={{ fontWeight: 400, color: 'hsl(var(--muted-foreground))' }}>(optional)</span></h3>

              {photoDataUrl ? (
                <div className="photo-preview-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoDataUrl} alt="Hazard preview" className="photo-preview" />
                  <button
                    type="button"
                    className="photo-remove"
                    onClick={() => { setPhotoDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; if (cameraInputRef.current) cameraInputRef.current.value = ''; }}
                    aria-label="Remove photo"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div
                  className={`photo-drop${dragOver ? ' drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  data-testid="photo-drop-zone"
                >
                  {photoLoading ? (
                    <><Loader2 size={24} className="spin" /><span>Compressing image…</span></>
                  ) : (
                    <>
                      <Upload size={24} style={{ color: 'hsl(var(--primary))' }} />
                      <span>Drag & drop a photo here, or</span>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button type="button" className="btn btn-outline" style={{ minHeight: 34, fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>
                          <Upload size={13} /> Choose file
                        </button>
                        <button type="button" className="btn btn-outline" style={{ minHeight: 34, fontSize: 12 }} onClick={() => cameraInputRef.current?.click()}>
                          <Camera size={13} /> Take photo
                        </button>
                      </div>
                      <span className="help" style={{ marginTop: 4 }}>JPG, PNG, HEIC · compressed automatically</span>
                    </>
                  )}
                </div>
              )}

              {/* Hidden file inputs */}
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileInput} data-testid="input-photo-file" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileInput} data-testid="input-photo-camera" />
            </div>

            {/* ── Submit ──────────────────────────────────────────── */}
            {createReport.isError && (
              <div className="auth-error" style={{ marginBottom: 14 }} data-testid="status-report-error">
                {(() => {
                  const err = createReport.error as any;
                  const serverError = err?.response?.data?.error || err?.response?.data?.message || err?.message;
                  if (serverError && typeof serverError === 'string') {
                    try {
                      const parsed = JSON.parse(serverError);
                      if (Array.isArray(parsed)) {
                        return parsed.map((p: any) => p.message || p.path?.join('.')).join('; ');
                      }
                    } catch {}
                    return serverError;
                  }
                  return 'This report could not be sent. Please check the details and try again.';
                })()}
              </div>
            )}

            {!locationSet && (
              <p className="help" style={{ marginBottom: 14, color: 'hsl(var(--muted-foreground))' }}>
                📍 Please pin your location on the map or click &quot;Use my location&quot; above to submit.
              </p>
            )}

            <div className="actions" style={{ justifyContent: 'flex-end' }}>
              <Link href="/" className="btn btn-outline" data-testid="link-cancel-report">Cancel</Link>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={createReport.isPending || !locationSet || description.trim().length < 3}
                data-testid="button-submit-report"
              >
                {createReport.isPending ? 'Sending report…' : 'Send report'} <Send size={15} />
              </button>
            </div>
          </form>
        </div>
        <footer className="footer"><span>DrainWatch · Hyderabad civic safety network</span><span>For urgent danger, contact local emergency services.</span></footer>
      </main>
    </div>
  );
}
