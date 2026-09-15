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
          return (
            <CircleMarker
              key={report.id}
              center={[report.latitude, report.longitude]}
              radius={report.risk_score >= 75 ? 10 : 7}
              pathOptions={{
                color: markerColor,
                fillColor: markerColor,
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{report.location_name}</strong>
                <br />
                {hazardName(report.hazard_type)} · {hazardName(report.status)}
                <br />
                Risk {report.risk_score}/100 · {report.risk_level}
                <br />
                <small>{report.is_demo ? 'Demo report' : 'Citizen report'}</small>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
