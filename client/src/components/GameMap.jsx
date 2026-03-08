import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MARKER_COLORS = {
  primary: '#dc2626',
  crime_scene: '#ef4444',
  suspect_trail: '#d97706',
  medical: '#e67e22',
  investigation: '#3b82f6',
  conspiracy: '#7c3aed',
  aftermath: '#64748b',
  escape_route: '#ef4444',
  suspect_link: '#d97706',
  origin: '#3b82f6',
  scene_detail: '#71717a',
  route: '#2563eb',
};

function createCircleOptions(type, isPrimary) {
  const color = MARKER_COLORS[type] || '#d97706';
  return {
    radius: isPrimary ? 10 : 7,
    fillColor: color,
    fillOpacity: 0.9,
    color: 'rgba(255,255,255,0.4)',
    weight: 2,
  };
}

export default function GameMap({ locations, unlockedLocationIds, onLocationClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Initialize map
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [32.7789, -96.8083],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
      className: 'map-tiles-brighter',
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Update markers when unlocked locations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove old markers
    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!unlockedLocationIds.includes(id)) {
        map.removeLayer(marker);
        delete markersRef.current[id];
      }
    }

    // Add new markers
    for (const locId of unlockedLocationIds) {
      if (markersRef.current[locId]) continue;

      const loc = locations.find(l => l.id === locId);
      if (!loc) continue;

      const isPrimary = loc.type === 'primary';
      const opts = createCircleOptions(loc.type, isPrimary);
      const marker = L.circleMarker(loc.coords, opts)
        .addTo(map)
        .on('click', () => onLocationClick(loc.id));

      marker.bindTooltip(loc.name, {
        className: 'map-label',
        direction: 'top',
        offset: [0, -14],
        permanent: true,
      });

      markersRef.current[locId] = marker;
    }
  }, [locations, unlockedLocationIds, onLocationClick]);

  return <div ref={mapRef} className="absolute inset-0 z-0" />;
}
