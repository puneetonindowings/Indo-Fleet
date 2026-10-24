import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Navigation, ZoomIn, ZoomOut, Layers, Truck, MapPin, Building2, Clock, Route as RouteIcon, Eye, EyeOff, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

interface CustomerOrderLiveMapProps {
  order: any;
  className?: string;
}

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

function haversineDistMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function distToSegmentMeters(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const dAB = haversineDistMeters(aLat, aLng, bLat, bLng);
  if (dAB === 0) return haversineDistMeters(pLat, pLng, aLat, aLng);

  const midLat = ((aLat + bLat) / 2 * Math.PI) / 180;
  const kx = Math.cos(midLat);
  const ax = aLng * kx, ay = aLat;
  const bx = bLng * kx, by = bLat;
  const px = pLng * kx, py = pLat;

  const dx = bx - ax;
  const dy = by - ay;
  const denom = dx * dx + dy * dy;
  if (denom === 0) return haversineDistMeters(pLat, pLng, aLat, aLng);

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / denom));
  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return haversineDistMeters(pLat, pLng, projLat, projLng);
}

function minDistanceToPolylineMeters(
  point: [number, number],
  polyline: [number, number][]
): number {
  if (!polyline || polyline.length < 2) return 0;
  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distToSegmentMeters(
      point[1],
      point[0],
      polyline[i][1],
      polyline[i][0],
      polyline[i + 1][1],
      polyline[i + 1][0]
    );
    if (d < minDist) minDist = d;
  }
  return minDist;
}

export const CustomerOrderLiveMap: React.FC<CustomerOrderLiveMapProps> = ({ order, className = 'h-[460px] sm:h-[540px]' }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const hubMarkerRef = useRef<maplibregl.Marker | null>(null);
  const dropMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [isHudExpanded, setIsHudExpanded] = useState(false);
  const [showHud, setShowHud] = useState(true);
  const [roadInfo, setRoadInfo] = useState<{ distanceKm: number | null; durationMins: number | null }>({
    distanceKm: null,
    durationMins: null
  });

  const rawPickupLng = Number(order?.pickup_lng ?? order?.pickup_location?.longitude ?? order?.pickup_location?.lng);
  const rawPickupLat = Number(order?.pickup_lat ?? order?.pickup_location?.latitude ?? order?.pickup_location?.lat);
  const pickupLng = Number.isFinite(rawPickupLng) && rawPickupLng !== 0 ? rawPickupLng : 77.3661;
  const pickupLat = Number.isFinite(rawPickupLat) && rawPickupLat !== 0 ? rawPickupLat : 28.6037;
  const hasValidPickup = true;

  const rawDropLng = Number(
    order?.drop_lng ??
    order?.destination_lng ??
    order?.delivery_lng ??
    order?.destination_location?.longitude ??
    order?.destination_location?.lng
  );
  const rawDropLat = Number(
    order?.drop_lat ??
    order?.destination_lat ??
    order?.delivery_lat ??
    order?.destination_location?.latitude ??
    order?.destination_location?.lat
  );
  const hasDirectDrop = Number.isFinite(rawDropLng) && Number.isFinite(rawDropLat) && (rawDropLng !== 0 || rawDropLat !== 0);

  const pickupCoords: [number, number] = useMemo(() => {
    return [pickupLng, pickupLat];
  }, [pickupLng, pickupLat]);

  const [asyncDropCoords, setAsyncDropCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (hasDirectDrop) {
      setAsyncDropCoords([rawDropLng, rawDropLat]);
      return;
    }

    const rawAddress = String(order?.drop_address || order?.destination_address || order?.delivery_address || '').trim();
    if (!rawAddress) return;

    let cancelled = false;
    const resolveLocation = async () => {
      const cacheKey = `geo:${rawAddress.toLowerCase()}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.lng) && !cancelled) {
            setAsyncDropCoords([parsed.lng, parsed.lat]);
            return;
          }
        } catch (e) {}
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/delivery/geocode?address=${encodeURIComponent(rawAddress)}`);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
            sessionStorage.setItem(cacheKey, JSON.stringify({ lat: data.lat, lng: data.lng }));
            setAsyncDropCoords([data.lng, data.lat]);
            return;
          }
        }
      } catch (e) {}

      try {
        const cleaned = rawAddress
          .replace(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g, '')
          .replace(/^[^,]+,\s*/, '')
          .trim();
        const queries = [rawAddress, cleaned, cleaned.split(',').slice(-2).join(',').trim()];
        for (const q of queries) {
          if (!q || q.length < 3) continue;
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
          const nRes = await fetch(url, {
            headers: { 'User-Agent': 'IndoFleet-Platform/1.0', 'Accept': 'application/json' }
          });
          if (nRes.ok) {
            const nData = await nRes.json();
            if (!cancelled && Array.isArray(nData) && nData[0]?.lat && nData[0]?.lon) {
              const lat = parseFloat(nData[0].lat);
              const lng = parseFloat(nData[0].lon);
              sessionStorage.setItem(cacheKey, JSON.stringify({ lat, lng }));
              setAsyncDropCoords([lng, lat]);
              return;
            }
          }
        }
      } catch (nomErr) {}
    };

    resolveLocation();
    return () => { cancelled = true; };
  }, [hasDirectDrop, rawDropLng, rawDropLat, order?.drop_address, order?.destination_address, order?.delivery_address]);

  const dropCoords: [number, number] | null = useMemo(() => {
    if (hasDirectDrop) {
      return [rawDropLng, rawDropLat];
    }
    return asyncDropCoords;
  }, [hasDirectDrop, rawDropLng, rawDropLat, asyncDropCoords]);

  const hasValidDrop = Boolean(dropCoords);

  const isCancelled = ['cancelled', 'failed'].includes(order?.status);
  const isDelivered = order?.status === 'delivered';
  const isOnHold = ['on-hold', 'rescheduled'].includes(order?.status);
  const isPending = order?.status === 'pending';
  const isActiveInFlight = ['in-flight', 'in-transit', 'taking-off', 'approaching', 'out-for-delivery', 'assigned'].includes(order?.status);

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

  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][]>([]);
  const [plannedBaseCoordinates, setPlannedBaseCoordinates] = useState<[number, number][]>([]);

  const isOffRoute = useMemo(() => {
    if (order?.is_off_route === true || order?.route_status === 'deviated') return true;
    if (currentVehicleCoords && plannedBaseCoordinates.length >= 2 && isActiveInFlight) {
      const d = minDistanceToPolylineMeters(currentVehicleCoords, plannedBaseCoordinates);
      return d > 150;
    }
    return false;
  }, [order?.is_off_route, order?.route_status, currentVehicleCoords, plannedBaseCoordinates, isActiveInFlight]);

  const deviationMeters = useMemo(() => {
    if (order?.route_deviation_meters) return Number(order.route_deviation_meters);
    if (currentVehicleCoords && plannedBaseCoordinates.length >= 2) {
      return Math.round(minDistanceToPolylineMeters(currentVehicleCoords, plannedBaseCoordinates));
    }
    return 0;
  }, [order?.route_deviation_meters, currentVehicleCoords, plannedBaseCoordinates]);

  useEffect(() => {
    if (!pickupCoords || !dropCoords) {
      setPlannedBaseCoordinates([]);
      return;
    }

    if (Array.isArray(order?.planned_route_coords) && order.planned_route_coords.length >= 2) {
      setPlannedBaseCoordinates(order.planned_route_coords);
      return;
    }

    let cancelled = false;
    const fetchBaseRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoords[0]},${pickupCoords[1]};${dropCoords[0]},${dropCoords[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM service unavailable');
        const data = await res.json();
        if (cancelled) return;

        if (data?.routes?.[0]?.geometry?.coordinates?.length) {
          const coords = data.routes[0].geometry.coordinates as [number, number][];
          setPlannedBaseCoordinates(coords);
          if (!order?.current_route_coords) {
            setRoadCoordinates(coords);
            const distanceKm = Number((data.routes[0].distance / 1000).toFixed(1));
            const durationMins = Math.round(data.routes[0].duration / 60);
            setRoadInfo({ distanceKm, durationMins });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setPlannedBaseCoordinates([pickupCoords, dropCoords]);
        }
      }
    };

    fetchBaseRoute();
    return () => { cancelled = true; };
  }, [pickupCoords, dropCoords, order?.planned_route_coords]);

  useEffect(() => {
    if (Array.isArray(order?.current_route_coords) && order.current_route_coords.length >= 2) {
      setRoadCoordinates(order.current_route_coords);
      if (order?.recalculated_distance_km != null) {
        setRoadInfo({
          distanceKm: Number(order.recalculated_distance_km),
          durationMins: Number(order.recalculated_duration_mins ?? Math.round(order.recalculated_distance_km * 2.5))
        });
      }
      return;
    }

    if (!dropCoords) return;

    if (isOffRoute && currentVehicleCoords) {
      let cancelled = false;
      const fetchReroutedPath = async () => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${currentVehicleCoords[0]},${currentVehicleCoords[1]};${dropCoords[0]},${dropCoords[1]}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('OSRM rerouting unavailable');
          const data = await res.json();
          if (cancelled) return;

          if (data?.routes?.[0]?.geometry?.coordinates?.length) {
            const coords = data.routes[0].geometry.coordinates as [number, number][] ;
            setRoadCoordinates(coords);
            const distanceKm = Number((data.routes[0].distance / 1000).toFixed(1));
            const durationMins = Math.round(data.routes[0].duration / 60);
            setRoadInfo({ distanceKm, durationMins });
          }
        } catch (err) {
          if (!cancelled && currentVehicleCoords && dropCoords) {
            setRoadCoordinates([currentVehicleCoords, dropCoords]);
          }
        }
      };

      fetchReroutedPath();
      return () => { cancelled = true; };
    } else if (plannedBaseCoordinates.length >= 2) {
      setRoadCoordinates(plannedBaseCoordinates);
    }
  }, [isOffRoute, currentVehicleCoords, dropCoords, order?.current_route_coords, plannedBaseCoordinates]);

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
      if (!map.getSource('road-route')) {
        map.addSource('road-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: roadCoordinates.length >= 2 ? roadCoordinates : [pickupCoords, dropCoords]
            }
          }
        });

        const routeColor = isCancelled ? '#e11d48' : isDelivered ? '#10b981' : isOnHold ? '#f59e0b' : isOffRoute ? '#ea580c' : '#2563eb';

        map.addLayer({
          id: 'road-route-glow',
          type: 'line',
          source: 'road-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': routeColor,
            'line-width': isOffRoute ? 12 : 9,
            'line-opacity': 0.35,
            'line-blur': 3
          }
        });

        map.addLayer({
          id: 'road-route-line',
          type: 'line',
          source: 'road-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': routeColor,
            'line-width': isOffRoute ? 6 : 5,
            'line-opacity': 0.95
          }
        });
      }

      const hubEl = document.createElement('div');
      hubEl.className = 'flex flex-col items-center cursor-pointer';
      hubEl.innerHTML = `
        <div style="background: #2563eb; color: white; padding: 7px; border-radius: 50%; box-shadow: 0 4px 14px rgba(37,99,235,0.45); border: 2.5px solid white;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
        </div>
        <span style="font-size: 10px; font-weight: 800; background: #0f172a; color: #93c5fd; padding: 2px 7px; border-radius: 6px; margin-top: 3px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15); white-space: nowrap;">
          IndoFleet Hub
        </span>
      `;
      hubMarkerRef.current = new maplibregl.Marker({ element: hubEl })
        .setLngLat(pickupCoords)
        .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(`<strong>IndoFleet Hub</strong><br/>${order?.pickup_address || 'Sector 62, Noida Operations Plant'}`))
        .addTo(map);

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

      const vehicleEl = document.createElement('div');
      vehicleEl.className = 'relative flex items-center justify-center cursor-pointer transition-transform duration-700 ease-out';
      const markerBg = isCancelled ? '#e11d48' : isDelivered ? '#10b981' : isOnHold ? '#f59e0b' : isOffRoute ? '#ea580c' : isPending ? '#64748b' : '#2563eb';
      const markerLabel = isCancelled ? 'Cancelled' : isDelivered ? 'Delivered' : isOnHold ? 'On Hold' : isOffRoute ? 'Diverted' : isPending ? 'At Hub' : 'In Transit';

      vehicleEl.innerHTML = `
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: ${isOffRoute ? 'rgba(234,88,12,0.3)' : 'rgba(37,99,235,0.25)'}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 36px; height: 36px; background: ${markerBg}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,0.35); border: 2.5px solid white;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
        </div>
        <span style="position: absolute; bottom: -20px; font-size: 10px; font-weight: 800; background: #0f172a; color: #f8fafc; padding: 2px 8px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.15); white-space: nowrap;">
          ${markerLabel}
        </span>
      `;
      vehicleMarkerRef.current = new maplibregl.Marker({ element: vehicleEl })
        .setLngLat(currentVehicleCoords)
        .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(`<strong>Delivery Vehicle</strong><br/>Order #${order?.order_number || order?.id}<br/>Driver: ${order?.pilot_assigned || 'IndoFleet Pilot'}${isOffRoute ? '<br/><span style=\"color:#ea580c;font-weight:bold;\">⚠️ Off-Route Diverted</span>' : ''}`))
        .addTo(map);

      const bounds = new maplibregl.LngLatBounds(pickupCoords, pickupCoords);
      roadCoordinates.forEach(pt => bounds.extend(pt));
      bounds.extend(currentVehicleCoords);
      bounds.extend(dropCoords);
      map.fitBounds(bounds, { padding: { top: 55, bottom: 65, left: 35, right: 35 }, maxZoom: 14 });
    });

    return () => {
      hubMarkerRef.current?.remove();
      dropMarkerRef.current?.remove();
      vehicleMarkerRef.current?.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mapType]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('road-route') as maplibregl.GeoJSONSource;
    if (source && roadCoordinates.length >= 2) {
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: roadCoordinates
        }
      });

      const routeColor = isCancelled ? '#e11d48' : isDelivered ? '#10b981' : isOnHold ? '#f59e0b' : isOffRoute ? '#ea580c' : '#2563eb';
      if (map.getLayer('road-route-line')) {
        map.setPaintProperty('road-route-line', 'line-color', routeColor);
        map.setPaintProperty('road-route-glow', 'line-color', routeColor);
      }
    }

    if (hubMarkerRef.current && pickupCoords) hubMarkerRef.current.setLngLat(pickupCoords);
    if (dropMarkerRef.current && dropCoords) dropMarkerRef.current.setLngLat(dropCoords);

    if (pickupCoords && dropCoords && roadCoordinates.length >= 2) {
      const bounds = new maplibregl.LngLatBounds(pickupCoords, pickupCoords);
      roadCoordinates.forEach(pt => bounds.extend(pt));
      bounds.extend(dropCoords);
      map.fitBounds(bounds, { padding: { top: 55, bottom: 65, left: 35, right: 35 }, maxZoom: 14 });
    }
  }, [roadCoordinates, pickupCoords, dropCoords, isOffRoute, isCancelled, isDelivered, isOnHold]);

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
      <div className={`relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center ${className}`}>
        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-blue-400 mb-3 animate-pulse">
          <Truck className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-200 mb-1">
          {isCancelled ? 'Delivery Cancelled' : 'Preparing Real-Time Trajectory'}
        </h4>
        <p className="text-xs text-slate-400 max-w-sm">
          {isCancelled
            ? 'This flight consignment was cancelled. GPS trajectory logging is permanently closed.'
            : 'Resolving destination geocodes and establishing live road routing connection...'}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner bg-slate-100 ${className}`}>
      <div ref={mapContainer} className="w-full h-full" />

      {isOffRoute && (
        <div className="absolute top-3 left-3 right-14 z-20 pointer-events-auto animate-fadeIn">
          <div className="bg-amber-600/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-amber-400/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="p-1.5 bg-black/20 rounded-lg shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-200 animate-bounce" />
              </span>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-100 flex items-center gap-1.5">
                  <span>Route Diverted</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>Dynamically Redirected</span>
                </div>
                <p className="text-xs font-bold text-white truncate">
                  Courier turned off planned road corridor ({deviationMeters}m off). Route dynamically recalculated to drop point.
                </p>
              </div>
            </div>
            <div className="hidden sm:block text-right shrink-0 bg-black/25 px-2.5 py-1 rounded-lg border border-white/20">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-200 block">Status</span>
              <span className="text-xs font-mono font-bold text-white">Rerouted</span>
            </div>
          </div>
        </div>
      )}

      {showHud && (
        <div className={`absolute ${isOffRoute ? 'top-16' : 'top-3'} left-3 z-10 flex flex-col gap-1.5 pointer-events-auto transition-all max-w-[calc(100%-80px)]`}>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-800 text-[11px] font-bold shadow-md border border-slate-200/90 truncate">
            <span className={`w-2 h-2 rounded-full ${isOffRoute ? 'bg-amber-500 animate-ping' : hasRealLiveGps ? 'bg-emerald-500 animate-ping' : 'bg-blue-600 animate-pulse'} shrink-0`} />
            <span className="truncate">{isOffRoute ? 'Diverted & Recalculating' : hasRealLiveGps ? 'Live GPS Uplink' : 'Live Road Route'}</span>
            {roadInfo.durationMins !== null && (
              <span className="text-slate-500 font-semibold shrink-0">· ~{roadInfo.durationMins}m ETA</span>
            )}
            {isOffRoute && (
              <span className="text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded text-[10px] font-black shrink-0">
                +{Math.max(2, Math.round(deviationMeters / 100))}m delay
              </span>
            )}
          </div>
        </div>
      )}

      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => setShowHud(prev => !prev)}
          className="p-2 rounded-xl bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200/90 transition-all cursor-pointer backdrop-blur flex items-center justify-center"
          title={showHud ? 'Hide Info Card (Clean Full Map View)' : 'Show Info Card'}
        >
          {showHud ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-[#5a00b8]" />}
        </button>

        <button
          type="button"
          onClick={handleToggleMapType}
          className="p-2 rounded-xl bg-white/95 hover:bg-white text-slate-700 shadow-md border border-slate-200/90 transition-all cursor-pointer backdrop-blur flex items-center justify-center"
          title={mapType === 'roadmap' ? 'Switch to Satellite View' : 'Switch to Roadmap'}
        >
          <Layers className="w-4 h-4 text-blue-600" />
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          className="p-2 rounded-xl bg-white/95 hover:bg-white text-blue-600 shadow-md border border-slate-200/90 transition-all cursor-pointer backdrop-blur flex items-center justify-center"
          title="Recenter on Vehicle"
        >
          <Navigation className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex flex-col rounded-xl overflow-hidden bg-white/95 shadow-md border border-slate-200/90 backdrop-blur">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="p-2 hover:bg-slate-100 text-slate-700 border-b border-slate-100 transition-all cursor-pointer flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="p-2 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showHud && (
        <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl p-2.5 sm:p-3 text-slate-900 transition-all">
            {!isHudExpanded ? (
              <div
                className="flex items-center justify-between gap-2 cursor-pointer"
                onClick={() => setIsHudExpanded(true)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-xl ${isOffRoute ? 'bg-amber-100 border border-amber-200 text-amber-700' : 'bg-blue-50 border border-blue-100 text-blue-600'} flex items-center justify-center shrink-0`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {order?.destination_address || order?.drop_address || 'Delivery Destination'}
                      </p>
                      {isOffRoute && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500 text-white shrink-0">
                          REROUTED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-0.5">
                      <span>{order?.order_number ? `#${order.order_number}` : 'Active Delivery'}</span>
                      {order?.customer_name && <span>· {order.customer_name}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {roadInfo.distanceKm !== null && (
                    <span className={`px-2 py-1 rounded-lg font-black text-[11px] border ${isOffRoute ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                      {roadInfo.distanceKm} km
                    </span>
                  )}
                  {roadInfo.durationMins !== null && (
                    <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black text-[11px] border border-emerald-100">
                      ~{roadInfo.durationMins}m
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsHudExpanded(true);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="View Full Delivery Address & Stats"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${isOffRoute ? 'bg-amber-100 border border-amber-200 text-amber-700' : 'bg-blue-50 border border-blue-100 text-blue-600'} flex items-center justify-center`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Road Delivery Route</span>
                        {isOffRoute && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white">
                            OFF-ROUTE AUTO-REROUTED
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        {order?.order_number ? `#${order.order_number}` : 'Active Delivery'}
                        {order?.customer_name && <span className="font-normal text-slate-500 ml-1.5">({order.customer_name})</span>}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHudExpanded(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Collapse to Mini Bar (See More Map)"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Destination Address</span>
                  <p className="font-medium text-slate-800 line-clamp-2 leading-relaxed">
                    {order?.destination_address || order?.drop_address || 'Customer Destination Pending'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-3">
                    {roadInfo.distanceKm !== null && (
                      <div className={`flex items-center gap-1.5 font-bold ${isOffRoute ? 'text-amber-700' : 'text-blue-700'}`}>
                        <RouteIcon className={`w-3.5 h-3.5 ${isOffRoute ? 'text-amber-600' : 'text-blue-600'}`} />
                        <span>{roadInfo.distanceKm} km {isOffRoute ? 'redirected' : 'road'}</span>
                      </div>
                    )}
                    {roadInfo.durationMins !== null && (
                      <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>~{roadInfo.durationMins} mins drive</span>
                      </div>
                    )}
                    {isOffRoute && (
                      <span className="text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-black">
                        ⚠️ Deviation: {deviationMeters}m
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsHudExpanded(false)}
                    className="text-[11px] font-bold text-[#5a00b8] hover:underline cursor-pointer"
                  >
                    Collapse Map View &uarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
