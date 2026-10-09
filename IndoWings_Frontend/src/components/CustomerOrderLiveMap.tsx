import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, ZoomIn, ZoomOut } from 'lucide-react';

if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

const MAPTILER_KEY = (import.meta as any).env?.VITE_MAPTILER_KEY as string | undefined;

interface CustomerOrderLiveMapProps {
  order: any;
  className?: string;
}

export const CustomerOrderLiveMap: React.FC<CustomerOrderLiveMapProps> = ({ order, className = 'h-80' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const [, setMapReady] = useState(false);

  // Derive Coordinates
  const pickupCoords: [number, number] = React.useMemo(() => {
    if (Number.isFinite(order?.pickup_lng) && Number.isFinite(order?.pickup_lat)) {
      return [Number(order.pickup_lng), Number(order.pickup_lat)];
    }
    return [77.3718, 28.6280]; // Default Noida Plant Base
  }, [order?.pickup_lng, order?.pickup_lat]);

  const dropCoords: [number, number] = React.useMemo(() => {
    const lng = order?.drop_lng ?? order?.destination_lng;
    const lat = order?.drop_lat ?? order?.destination_lat;
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      return [Number(lng), Number(lat)];
    }
    return [77.3910, 28.5355]; // Default Drop Destination
  }, [order?.drop_lng, order?.drop_lat, order?.destination_lng, order?.destination_lat]);

  const isCancelled = React.useMemo(() => {
    return ['cancelled', 'failed'].includes(order?.status);
  }, [order?.status]);

  const isDelivered = React.useMemo(() => {
    return order?.status === 'delivered';
  }, [order?.status]);

  const isOnHold = React.useMemo(() => {
    return ['on-hold', 'rescheduled'].includes(order?.status);
  }, [order?.status]);

  const isPending = React.useMemo(() => {
    return order?.status === 'pending';
  }, [order?.status]);

  const isActiveInFlight = React.useMemo(() => {
    return ['in-flight', 'in-transit', 'taking-off', 'approaching', 'out-for-delivery', 'assigned'].includes(order?.status);
  }, [order?.status]);

  const currentDroneCoords: [number, number] = React.useMemo(() => {
    if (isDelivered) return dropCoords;
    if (isCancelled || isPending) return pickupCoords;

    const loc = order?.last_known_location || order?.current_location_coords || order?.live_location;
    if (typeof loc === 'object' && loc !== null && Number.isFinite(loc.lng) && Number.isFinite(loc.lat)) {
      return [Number(loc.lng), Number(loc.lat)];
    }
    if (Number.isFinite(order?.current_lng) && Number.isFinite(order?.current_lat)) {
      return [Number(order.current_lng), Number(order.current_lat)];
    }
    if (Number.isFinite(order?.pilot_lng) && Number.isFinite(order?.pilot_lat)) {
      return [Number(order.pilot_lng), Number(order.pilot_lat)];
    }

    if (isActiveInFlight || isOnHold) {
      const progress = order?.status === 'approaching' ? 0.85 : order?.status === 'taking-off' ? 0.15 : 0.55;
      return [
        pickupCoords[0] + (dropCoords[0] - pickupCoords[0]) * progress,
        pickupCoords[1] + (dropCoords[1] - pickupCoords[1]) * progress
      ];
    }
    return pickupCoords;
  }, [order?.last_known_location, order?.current_location_coords, order?.live_location, order?.current_lng, order?.current_lat, order?.pilot_lng, order?.pilot_lat, order?.status, isCancelled, isDelivered, isOnHold, isPending, isActiveInFlight, pickupCoords, dropCoords]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const mapStyle = MAPTILER_KEY
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`
      : {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles-layer',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        };

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle as any,
      center: currentDroneCoords,
      zoom: 12
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      setMapReady(true);

      const routeCoordinates = [pickupCoords, currentDroneCoords, dropCoords];

      map.addSource('transit-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });

      const routeColor = isCancelled ? '#e11d48' : isDelivered ? '#10b981' : isOnHold ? '#f59e0b' : '#5a00b8';

      // Route Glow Outline Layer
      map.addLayer({
        id: 'transit-route-glow',
        type: 'line',
        source: 'transit-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': routeColor,
          'line-width': 6,
          'line-opacity': isCancelled ? 0.15 : 0.25
        }
      });

      // Main Route Line
      map.addLayer({
        id: 'transit-route-line',
        type: 'line',
        source: 'transit-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': routeColor,
          'line-width': 3.5,
          'line-dasharray': isCancelled ? [4, 4] : [2, 1.5]
        }
      });

      // 1. Pickup Marker (Origin)
      const pickupEl = document.createElement('div');
      pickupEl.className = 'flex flex-col items-center cursor-pointer';
      pickupEl.innerHTML = `
        <div style="background: #10b981; color: white; padding: 6px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(16,185,129,0.4); border: 2px solid white;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <span style="font-size: 10px; font-weight: 800; background: white; color: #065f46; padding: 2px 6px; border-radius: 6px; margin-top: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; white-space: nowrap;">Dispatch Hub</span>
      `;
      new maplibregl.Marker({ element: pickupEl })
        .setLngLat(pickupCoords)
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(`<strong>Dispatch Hub</strong><br/>${order?.pickup_address || 'IndoFleet Plant, Sector 62'}`))
        .addTo(map);

      // 2. Delivery Vehicle / Drone Marker
      const droneEl = document.createElement('div');
      droneEl.className = 'relative flex items-center justify-center cursor-pointer';

      const pingHtml = isActiveInFlight
        ? `<div style="position: absolute; width: 42px; height: 42px; border-radius: 9999px; background: rgba(90,0,184,0.2); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
        : '';

      const markerBg = isCancelled ? '#e11d48' : isDelivered ? '#10b981' : isOnHold ? '#f59e0b' : isPending ? '#64748b' : '#5a00b8';
      const markerText = isCancelled ? 'Cancelled' : isDelivered ? 'Delivered' : isOnHold ? 'Paused' : isPending ? 'Pending' : 'In Transit';

      droneEl.innerHTML = `
        ${pingHtml}
        <div style="position: relative; width: 34px; height: 34px; background: ${markerBg}; color: white; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,0.3); border: 2.5px solid white;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        </div>
        <span style="position: absolute; bottom: -20px; font-size: 10px; font-weight: 800; background: #0f172a; color: #f8fafc; padding: 2px 7px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.2); white-space: nowrap;">
          ${markerText}
        </span>
      `;
      new maplibregl.Marker({ element: droneEl })
        .setLngLat(currentDroneCoords)
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<strong>Order #${order?.order_number || order?.id}</strong><br/>Status: <strong>${markerText}</strong><br/>Partner: ${order?.pilot_assigned || order?.delivery_partner_name || 'Assigned Partner'}`
          )
        )
        .addTo(map);

      // 3. Drop Marker (Destination)
      const dropEl = document.createElement('div');
      dropEl.className = 'flex flex-col items-center cursor-pointer';
      dropEl.innerHTML = `
        <div style="background: #e11d48; color: white; padding: 6px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(225,29,72,0.4); border: 2px solid white;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        </div>
        <span style="font-size: 10px; font-weight: 800; background: white; color: #881337; padding: 2px 6px; border-radius: 6px; margin-top: 2px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; white-space: nowrap;">Delivery Point</span>
      `;
      new maplibregl.Marker({ element: dropEl })
        .setLngLat(dropCoords)
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(`<strong>Delivery Point</strong><br/>${order?.destination_address || order?.drop_address || 'Customer Destination'}`))
        .addTo(map);

      // Fit bounds to include pickup, drone, and destination
      const bounds = new maplibregl.LngLatBounds(pickupCoords, pickupCoords);
      bounds.extend(currentDroneCoords);
      bounds.extend(dropCoords);
      map.fitBounds(bounds, { padding: 48, maxZoom: 14 });
    });

    return () => {
      map.remove();
    };
  }, [order?.id, pickupCoords, dropCoords, currentDroneCoords, isCancelled, isDelivered, isOnHold, isPending, isActiveInFlight]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo({
      center: currentDroneCoords,
      zoom: 13,
      essential: true
    });
  };

  const handleZoomIn = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.zoomOut();
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 group h-full w-full min-h-[400px]">
      {/* Interactive Clean Map Canvas */}
      <div ref={mapContainer} className={`w-full min-h-[400px] ${className}`} />

      {/* Clean Floating Map Control Buttons */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleRecenter}
          className="p-3 rounded-2xl bg-white/95 hover:bg-white text-slate-700 hover:text-[#5a00b8] shadow-lg border border-slate-200 transition-all cursor-pointer"
          title="Recenter Map"
        >
          <Navigation className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-3 rounded-2xl bg-white/95 hover:bg-white text-slate-700 shadow-lg border border-slate-200 transition-all cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-3 rounded-2xl bg-white/95 hover:bg-white text-slate-700 shadow-lg border border-slate-200 transition-all cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
