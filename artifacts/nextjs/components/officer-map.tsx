'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { hazardName } from '@/lib/utils';
import type { Report } from '@workspace/api-client-react';

const HYDERABAD: [number, number] = [17.385, 78.4867];

export default function OfficerMap({
  reports,
  height = 450,
}: {
  reports: Report[];
  height?: number;
}) {
  return (
    <div className="leaflet-map" style={{ height }} data-testid="map-hyderabad">
      <MapContainer
        center={HYDERABAD}
        zoom={11}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map((report) => {
          const markerColor =
            report.risk_score >= 75
              ? '#b83d32'
              : report.risk_score >= 50
                ? '#d77924'
                : report.risk_score >= 25
                  ? '#c19a17'
                  : '#087f73';
          const isReal = !report.is_demo;
          return (
            <CircleMarker
              key={report.id}
              center={[report.latitude, report.longitude]}
              radius={isReal ? 11 : report.risk_score >= 75 ? 9 : 7}
              pathOptions={{
                color: isReal ? '#087f73' : markerColor,
                fillColor: markerColor,
                fillOpacity: isReal ? 0.95 : 0.8,
                weight: isReal ? 3.5 : 2,
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      background: isReal ? '#dcfce7' : '#f1f5f9',
                      color: isReal ? '#15803d' : '#64748b',
                    }}>
                      {isReal ? '● Real Citizen Report' : 'Demo Baseline'}
                    </span>
                  </div>
                  <strong style={{ fontSize: 13 }}>{report.location_name}</strong>
                  <div style={{ margin: '4px 0', fontSize: 12, color: '#334155' }}>
                    {hazardName(report.hazard_type)} · <span style={{ textTransform: 'capitalize' }}>{hazardName(report.status)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Risk {report.risk_score}/100 · {report.risk_level}
                  </div>
                  <div style={{ marginTop: 6, borderTop: '1px solid #e2e8f0', paddingTop: 4 }}>
                    <a href={`/track-report?id=${report.id}`} style={{ color: '#087f73', fontWeight: 600, fontSize: 11, textDecoration: 'underline' }}>
                      Track status &rarr;
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
