'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet';

// Fix Leaflet default icon in Next.js
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:32px;height:40px;display:flex;align-items:flex-end;justify-content:center;
    filter:drop-shadow(0 2px 6px rgba(0,0,0,.35));
    cursor:grab;
  ">
    <svg viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:32px;height:40px">
      <path d="M16 0C8.27 0 2 6.27 2 14c0 9.9 14 26 14 26s14-16.1 14-26C30 6.27 23.73 0 16 0z" fill="hsl(172,82%,31%)"/>
      <circle cx="16" cy="14" r="6" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 40],
  iconAnchor: [16, 40],
});

function PinHandler({ onPin }: { onPin: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPin(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface MapPickerProps {
  lat: number;
  lng: number;
  onPin: (lat: number, lng: number) => void;
}

export default function MapPicker({ lat, lng, onPin }: MapPickerProps) {
  const [markerPos, setMarkerPos] = useState<[number, number]>([lat, lng]);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);

  // Fly to new GPS position when parent lat/lng changes
  useEffect(() => {
    setMarkerPos([lat, lng]);
    mapRef.current?.flyTo([lat, lng], 17, { duration: 1 });
  }, [lat, lng]);

  function handlePin(newLat: number, newLng: number) {
    setMarkerPos([newLat, newLng]);
    onPin(newLat, newLng);
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      style={{ height: 280, width: '100%', borderRadius: 12, cursor: 'crosshair' }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PinHandler onPin={handlePin} />
      <Marker
        position={markerPos}
        icon={pinIcon}
        draggable
        ref={markerRef}
        eventHandlers={{
          dragend() {
            const pos = markerRef.current?.getLatLng();
            if (pos) handlePin(pos.lat, pos.lng);
          },
        }}
      />
    </MapContainer>
  );
}
