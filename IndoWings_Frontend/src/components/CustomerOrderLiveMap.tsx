import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, ZoomIn, ZoomOut, Layers, Truck, MapPin, Building2, Clock, Route as RouteIcon } from 'lucide-react';

if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

interface CustomerOrderLiveMapProps {
  order: any;
  className?: string;
}

// Google Maps Raster Tile Styles (Zero card, Zero key required - Direct Google Tile Engine)
const GOOGLE_ROADMAP_STYLE = {
  version: 8 as const,
  sources: {
    'google-roadmap': {
      type: 'raster' as const,
      tiles: [
        'https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
      ],
      tileSize: 256,
      attribution: '&copy; Google Maps'
    }
  },
  layers: [
    {
      id: 'google-roadmap-layer',
      type: 'raster' as const,
      source: 'google-roadmap',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const GOOGLE_SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    'google-satellite': {
      type: 'raster' as const,
      tiles: [
        'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
      ],
      tileSize: 256,
      attribution: '&copy; Google Maps Satellite'
    }
  },
  layers: [
    {
      id: 'google-satellite-layer',
      type: 'raster' as const,
      source: 'google-satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

export const CustomerOrderLiveMap: React.FC<CustomerOrderLiveMapProps> = ({ order, className = 'h-96' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const hubMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [roadInfo, setRoadInfo] = useState<{ distanceKm: number | null; durationMins: number | null }>({
    distanceKm: null,
    durationMins: null
  });

  // 1. Strict Coordinate Validation (No fake/hardcoded Noida fallback)
  const hasValidPickup = Boolean(
    Number.isFinite(order?.pickup_lng) &&
    Number.isFinite(order?.pickup_lat) &&
    (Number(order.pickup_lng) !== 0 || Number(order.pickup_lat) !== 0)
  );

  const rawDropLng = order?.drop_lng ?? order?.destination_lng;
  const rawDropLat = order?.drop_lat ?? order?.destination_lat;
  const hasValidDrop = Boolean(
    Number.isFinite(rawDropLng) &&
    Number.isFinite(rawDropLat) &&
    (Number(rawDropLng) !== 0 || Number(rawDropLat) !== 0)
  );

  const pickupCoords: [number, number] | null = useMemo(() => {
    if (hasValidPickup) {
      return [Number(order.pickup_lng), Number(order.pickup_lat)];
    }
    return null;
  }, [hasValidPickup, order?.pickup_lng, order?.pickup_lat]);

  const dropCoords: [number, number] | null = useMemo(() => {
    if (hasValidDrop) {
      return [Number(rawDropLng), Number(rawDropLat)];
    }
    return null;
  }, [hasValidDrop, rawDropLng, rawDropLat]);

  const isCancelled = ['cancelled', 'failed'].includes(order?.status);
  const isDelivered = order?.status === 'delivered';
  const isOnHold = ['on-hold', 'rescheduled'].includes(order?.status);
  const isPending = order?.status === 'pending';
  const isActiveInFlight = ['in-flight', 'in-transit', 'taking-off', 'approaching', 'out-for-delivery', 'assigned'].includes(order?.status);

  // Helper to extract live coordinates robustly across formats (numbers, objects, comma-separated strings)
  const extractVehicleCoords = (o: any): [number, number] | null => {
    if (!o) return null;
    const cLng = Number(o.current_lng ?? o.pilot_lng ?? o.longitude);
    const cLat = Number(o.current_lat ?? o.pilot_lat ?? o.latitude);
    if (Number.isFinite(cLng) && Number.isFinite(cLat) && (cLng !== 0 || cLat !== 0)) {
      return [cLng, cLat];
    }
    const loc = o.last_known_location || o.current_location_coords || o.live_location;
    if (loc && typeof loc === 'object') {
      const lng = Number(loc.lng ?? loc.longitude);
      const lat = Number(loc.lat ?? loc.latitude);
      if (Number.isFinite(lng) && Number.isFinite(lat) && (lng !== 0 || lat !== 0)) {
        return [lng, lat];
      }
    }
    if (typeof loc === 'string') {
      const parts = loc.split(',').map((s: string) => parseFloat(s.trim()));
      if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
        let lat = parts[0];
        let lng = parts[1];
        if (lat > 60 && lng < 40) {
          const tmp = lat; lat = lng; lng = tmp;
        }
        return [lng, lat];
      }
    }
    return null;
  };

  const hasRealLiveGps = useMemo(() => {
    return Boolean(extractVehicleCoords(order));
  }, [order]);

  const currentVehicleCoords: [number, number] | null = useMemo(() => {
    if (isDelivered && dropCoords) return dropCoords;
    if ((isCancelled || isPending) && pickupCoords) return pickupCoords;

    const extracted = extractVehicleCoords(order);
    if (extracted) {
      return extracted;
    }
    return pickupCoords;
  }, [order, isCancelled, isDelivered, isPending, pickupCoords, dropCoords]);

  // 2. Fetch Real Road-by-Road Route from OSRM
  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!pickupCoords || !dropCoords) {
      setRoadCoordinates([]);
      return;
    }

    let cancelled = false;
    const fetchRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoords[0]},${pickupCoords[1]};${dropCoords[0]},${dropCoords[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM service unavailable');
        const data = await res.json();
        if (cancelled) return;

        if (data?.routes?.[0]?.geometry?.coordinates?.length) {
          const coords = data.routes[0].geometry.coordinates as [number, number][];
          setRoadCoordinates(coords);
          const distanceKm = Number((data.routes[0].distance / 1000).toFixed(1));
          const durationMins = Math.round(data.routes[0].duration / 60);
          setRoadInfo({ distanceKm, durationMins });
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[Routing] Using fallback trajectory:', err);
          setRoadCoordinates([pickupCoords, dropCoords]);
        }
      }
    };

    fetchRoadRoute();
    return () => {
      cancelled = true;
    };
  }, [pickupCoords, dropCoords]);

  // 3. Initialize Google Map Instance (Only on mount or mapType change)
  useEffect(() => {
    if (!mapContainer.current || !pickupCoords || !dropCoords || !currentVehicleCoords) return;

    const activeStyle = mapType === 'satellite' ? GOOGLE_SATELLITE_STYLE : GOOGLE_ROADMAP_STYLE;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: activeStyle,
      center: currentVehicleCoords,
      zoom: 12,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      // Add Turn-by-Turn Road Route Source
      if (!map.getSource('road-route')) {
        map.addSource('road-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: roadCoordinates
            }
          }
        });

        const routeColor = isCancelled ? '#e11d48' : isDelivered ? '#10b981' : isOnHold ? '#f59e0b' : '#2563eb';

        // Road Route Glow / Outline (Casing)
        map.addLayer({
          id: 'road-route-glow',
          type: 'line',
          source: 'road-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': routeColor,
            'line-width': 7,
            'line-opacity': 0.3
          }
        });

        // Main Road Driving Polyline
        map.addLayer({
          id: 'road-route-line',
          type: 'line',
          source: 'road-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': routeColor,
            'line-width': 4,
            'line-opacity': 0.95
          }
        });
      }

      // 1. Origin Hub Marker
      const hubEl = document.createElement('div');
      hubEl.className = 'flex flex-col items-center cursor-pointer';
      hubEl.innerHTML = `
        <div style="background: #059669; color: white; padding: 7px; border-radius: 50%; box-shadow: 0 4px 14px rgba(5,150,105,0.45); border: 2.5px solid white;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M9 3l3-2 3 2v4H9V3z"/></svg>
        </div>
        <span style="font-size: 10px; font-weight: 800; background: #0f172a; color: #34d399; padding: 2px 7px; border-radius: 6px; margin-top: 3px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15); white-space: nowrap;">
          Dispatch Hub
        </span>
      `;
      hubMarkerRef.current = new maplibregl.Marker({ element: hubEl })
        .setLngLat(pickupCoords)
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(`<strong>IndoFleet Hub</strong><br/>${order?.pickup_address || 'Sector 62, Noida Operations Plant'}`))
        .addTo(map);

      // 2. Customer Destination Marker
      const dropEl = document.createElement('div');
      dropEl.className = 'flex flex-col items-center cursor-pointer';
      dropEl.innerHTML = `
        <div style="background: #e11d48; color: white; padding: 7px; border-radius: 50%; box-shadow: 0 4px 14px rgba(225,29,72,0.45); border: 2.5px solid white;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <span style="font-size: 10px; font-weight: 800; background: #0f172a; color: #fda4af; padding: 2px 7px; border-radius: 6px; margin-top: 3px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15); white-space: nowrap;">
          Customer Drop
        </span>
      `;
      dropMarkerRef.current = new maplibregl.Marker({ element: dropEl })
        .setLngLat(dropCoords)
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(`<strong>Customer Drop Point</strong><br/>${order?.destination_address || order?.drop_address || 'Delivery Address'}`))
        .addTo(map);

      // 3. Delivery Vehicle Marker (Mini Truck / Carrier)
      const vehicleEl = document.createElement('div');
      vehicleEl.className = 'relative flex items-center justify-center cursor-pointer transition-transform duration-700 ease-out';
      const markerBg = isCancelled ? '#e11d48' : isDelivered ? '#10b981' : isOnHold ? '#f59e0b' : isPending ? '#64748b' : '#2563eb';
      const markerLabel = isCancelled ? 'Cancelled' : isDelivered ? 'Delivered' : isOnHold ? 'On Hold' : isPending ? 'At Hub' : 'In Transit';

      vehicleEl.innerHTML = `
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(37,99,235,0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 36px; height: 36px; background: ${markerBg}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,0.35); border: 2.5px solid white;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
        </div>
        <span style="position: absolute; bottom: -20px; font-size: 10px; font-weight: 800; background: #0f172a; color: #f8fafc; padding: 2px 8px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); white-space: nowrap;">
          ${markerLabel}
        </span>
      `;
      vehicleMarkerRef.current = new maplibregl.Marker({ element: vehicleEl })
        .setLngLat(currentVehicleCoords)
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<strong>Delivery Vehicle</strong><br/>Order #${order?.order_number || order?.id}<br/>Driver: ${order?.pilot_assigned || 'IndoFleet Pilot'}`))
        .addTo(map);

      // Fit bounds tightly around the route
      const bounds = new maplibregl.LngLatBounds(pickupCoords, pickupCoords);
      roadCoordinates.forEach(pt => bounds.extend(pt));
      bounds.extend(currentVehicleCoords);
      bounds.extend(dropCoords);
      map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    });

    return () => {
      hubMarkerRef.current?.remove();
      dropMarkerRef.current?.remove();
      vehicleMarkerRef.current?.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapType]);

  // 4. Smoothly Update Route Polyline when road coordinates are fetched
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('road-route') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: roadCoordinates
        }
      });
    }

    if (hubMarkerRef.current && pickupCoords) hubMarkerRef.current.setLngLat(pickupCoords);
    if (dropMarkerRef.current && dropCoords) dropMarkerRef.current.setLngLat(dropCoords);
  }, [roadCoordinates, pickupCoords, dropCoords]);

  // 5. Smoothly Move Vehicle Marker as GPS Position Updates
  useEffect(() => {
    if (vehicleMarkerRef.current && currentVehicleCoords) {
      vehicleMarkerRef.current.setLngLat(currentVehicleCoords);
    }
  }, [currentVehicleCoords]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current || !currentVehicleCoords) return;
    mapInstanceRef.current.flyTo({
      center: currentVehicleCoords,
      zoom: 14,
      essential: true
    });
  };

  const handleToggleMapType = () => {
    setMapType(prev => (prev === 'roadmap' ? 'satellite' : 'roadmap'));
  };

  if (!hasValidPickup || !hasValidDrop || !pickupCoords || !dropCoords || !currentVehicleCoords) {
    return (
      <div className={`relative rounded-3xl overflow-hidden border border-slate-800 shadow-lg bg-slate-900 flex flex-col items-center justify-center p-8 text-center min-h-[360px] w-full ${className}`}>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg">
          <MapPin className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white tracking-wide">Live Route Pending Geolocation</h3>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md leading-relaxed">
          This order does not have verified GPS coordinates configured yet. Turn-by-turn road tracking and live map telemetry will activate once pickup &amp; delivery coordinates are initialized.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono">
            Origin: {order?.pickup_address || 'Dispatch Hub Pending'}
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono">
            Drop: {order?.destination_address || order?.drop_address || 'Delivery Address Pending'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-slate-900 group w-full ${className}`}>
      {/* Interactive Google Map Canvas */}
      <div ref={mapContainer} className="w-full h-full min-h-[360px]" />

      {/* Top Left: Live Status & Google Maps Badge */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold backdrop-blur border border-slate-700 shadow-md">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Google Maps Live Tracking</span>
        </div>
        {isActiveInFlight && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur shadow-md ${
            hasRealLiveGps
              ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-950/90 text-amber-300 border border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hasRealLiveGps ? 'bg-emerald-400' : 'bg-amber-400'} animate-ping`} />
            <span>{hasRealLiveGps ? 'GPS Uplink Active' : 'Approaching Route'}</span>
          </div>
        )}
      </div>

      {/* Top Right: Layer Switcher & Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={handleToggleMapType}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-md border border-slate-200 transition-all cursor-pointer backdrop-blur"
          title="Switch Google Maps Style"
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>{mapType === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
        </button>

        <div className="flex flex-col rounded-xl overflow-hidden bg-white/95 shadow-md border border-slate-200 backdrop-blur">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2.5 hover:bg-slate-100 text-slate-700 border-b border-slate-100 transition-all cursor-pointer flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2.5 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleRecenter}
          className="p-2.5 rounded-xl bg-white/95 hover:bg-white text-blue-600 shadow-md border border-slate-200 transition-all cursor-pointer backdrop-blur flex items-center justify-center"
          title="Recenter on Vehicle"
        >
          <Navigation className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Floating Delivery HUD: Real Road Distance & ETA */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3.5 text-white shadow-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Road Delivery Route</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold">
                  {order?.order_number ? `#${order.order_number}` : 'Active Delivery'}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200 truncate max-w-[240px] sm:max-w-md">
                {order?.destination_address || order?.drop_address || 'Customer Destination'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-300 border-t sm:border-t-0 sm:border-l border-slate-700/80 pt-2 sm:pt-0 sm:pl-4">
            {roadInfo.distanceKm !== null && (
              <div className="flex items-center gap-1.5">
                <RouteIcon className="w-3.5 h-3.5 text-blue-400" />
                <span><strong className="text-white text-sm">{roadInfo.distanceKm}</strong> km road</span>
              </div>
            )}
            {roadInfo.durationMins !== null && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span><strong className="text-white text-sm">~{roadInfo.durationMins}</strong> mins drive</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
