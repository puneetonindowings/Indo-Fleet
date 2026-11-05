/**
 * IndoFleet Dynamic Geocoding & Routing Service
 * Provides real-world address geocoding (Nominatim / Google) and road routing (OSRM)
 * with robust address normalization, dynamic route recalculation, and high-performance caching.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMins: number;
  coordinates: [number, number][]; // [lng, lat] GeoJSON format
}

const geocodeCache = new Map<string, { result: GeocodeResult | null; timestamp: number }>();
const routeCache = new Map<string, { result: RouteResult | null; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function resolveKnownLocation(rawAddress: string): GeocodeResult | null {
  if (!rawAddress || typeof rawAddress !== 'string') return null;
  const lower = rawAddress.toLowerCase();

  // Noida & Greater Noida sectors
  const sectorMatch = lower.match(/(?:sec(?:tor)?\.?|s\-)\s*([0-9]{1,3})/i);
  if (sectorMatch && sectorMatch[1]) {
    const secNum = parseInt(sectorMatch[1], 10);
    const knownSectors: Record<number, [number, number]> = {
      148: [28.4779, 77.4815],
      149: [28.4705, 77.4912],
      150: [28.4552, 77.4988],
      144: [28.4912, 77.4320],
      143: [28.4985, 77.4241],
      142: [28.5028, 77.4172],
      137: [28.5132, 77.4046],
      135: [28.5080, 77.4010],
      128: [28.5283, 77.3753],
      126: [28.5412, 77.3389],
      125: [28.5460, 77.3320],
      18:  [28.5708, 77.3260],
      16:  [28.5672, 77.3211],
      15:  [28.5835, 77.3140],
      62:  [28.6280, 77.3750],
      63:  [28.6234, 77.3824],
      60:  [28.6037, 77.3661],
      59:  [28.5990, 77.3620],
      50:  [28.5720, 77.3640],
      51:  [28.5810, 77.3660],
      52:  [28.5910, 77.3690],
      75:  [28.5760, 77.3820],
      76:  [28.5690, 77.3860],
      78:  [28.5600, 77.3910],
      93:  [28.5250, 77.3820],
      104: [28.5410, 77.3620],
      110: [28.5320, 77.3710],
      120: [28.5920, 77.3990],
      121: [28.5980, 77.4050],
      122: [28.6040, 77.4110],
    };
    if (knownSectors[secNum]) {
      return {
        lat: knownSectors[secNum][0],
        lng: knownSectors[secNum][1],
        displayName: `Sector ${secNum}, Noida, Uttar Pradesh, India`
      };
    }
    // Formula approximation for high sectors in Noida/Greater Noida Express corridor
    if (secNum >= 130 && secNum <= 168) {
      const lat = Number((28.5200 - (secNum - 130) * 0.0022).toFixed(6));
      const lng = Number((77.4000 + (secNum - 130) * 0.0031).toFixed(6));
      return {
        lat,
        lng,
        displayName: `Sector ${secNum}, Noida Express Corridor, Uttar Pradesh, India`
      };
    }
  }

  // Major NCR hubs & landmarks
  if (lower.includes('pari chowk') || lower.includes('knowledge park')) {
    return { lat: 28.4744, lng: 77.5040, displayName: 'Pari Chowk, Greater Noida, India' };
  }
  if (lower.includes('connaught') || lower.includes(' cp ')) {
    return { lat: 28.6315, lng: 77.2167, displayName: 'Connaught Place, New Delhi, India' };
  }
  if (lower.includes('cyber city') || lower.includes('gurgaon') || lower.includes('gurugram')) {
    return { lat: 28.4950, lng: 77.0890, displayName: 'Cyber City, Gurugram, India' };
  }
  if (lower.includes('film city')) {
    return { lat: 28.5672, lng: 77.3211, displayName: 'Film City, Sector 16A, Noida, India' };
  }
  if (lower.includes('indofleet') || lower.includes('indowings')) {
    return { lat: 28.6037, lng: 77.3661, displayName: 'IndoFleet Manufacturing & Dispatch Center, Sector 60, Noida, India' };
  }

  return null;
}

/**
 * Normalizes user-entered address strings by removing phone numbers, recipient names,
 * and apartment prefix noise that confuse geocoders.
 */
function cleanAddressCandidates(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const noPhone = trimmed
    .replace(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g, '')
    .replace(/\b\d{10}\b/g, '')
    .trim();

  const tokens = noPhone.split(',').map((s) => s.trim()).filter(Boolean);

  const candidates: string[] = [];

  candidates.push(noPhone);

  if (tokens.length >= 2) {
    candidates.push(tokens.slice(1).join(', '));
  }

  if (tokens.length >= 3) {
    candidates.push(tokens.slice(-3).join(', '));
  }

  if (tokens.length >= 2) {
    candidates.push(tokens.slice(-2).join(', '));
  }

  const pinMatch = trimmed.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    candidates.push(pinMatch[1]);
  }

  return Array.from(new Set(candidates.filter((c) => c && c.length >= 3)));
}

/**
 * Geocodes an address string to real world latitude and longitude.
 */
export async function geocodeAddress(rawAddress: string): Promise<GeocodeResult | null> {
  if (!rawAddress || typeof rawAddress !== 'string') return null;

  const known = resolveKnownLocation(rawAddress);
  if (known) return known;

  const cacheKey = rawAddress.trim().toLowerCase();

  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const candidates = cleanAddressCandidates(rawAddress);
  if (candidates.length === 0) return null;

  const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (googleKey) {
    for (const q of candidates) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${googleKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'OK' && data.results && data.results[0]?.geometry?.location) {
            const loc = data.results[0].geometry.location;
            const result: GeocodeResult = {
              lat: Number(loc.lat),
              lng: Number(loc.lng),
              displayName: data.results[0].formatted_address || q
            };
            geocodeCache.set(cacheKey, { result, timestamp: Date.now() });
            return result;
          }
        }
      } catch (gErr) {
        console.warn('[Geocoding] Google geocode failed, trying OpenStreetMap:', gErr);
        break;
      }
    }
  }

  for (const q of candidates) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'IndoFleet-Logistics-Platform/1.0 (connect@indowings.com)',
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
          const result: GeocodeResult = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name || q
          };
          geocodeCache.set(cacheKey, { result, timestamp: Date.now() });
          return result;
        }
      }
    } catch (nomErr) {
    }
  }

  geocodeCache.set(cacheKey, { result: null, timestamp: Date.now() });
  return null;
}

/**
 * Calculates road-by-road route using OSRM.
 */
export function generateFallbackRoute(pickup: [number, number], drop: [number, number]): RouteResult {
  const steps = 12;
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const curve = Math.sin(t * Math.PI) * 0.0018;
    const lng = pickup[0] + (drop[0] - pickup[0]) * t + curve;
    const lat = pickup[1] + (drop[1] - pickup[1]) * t + curve * 0.5;
    coords.push([Number(lng.toFixed(6)), Number(lat.toFixed(6))]);
  }
  const distKm = Number((haversineDistMeters(pickup[1], pickup[0], drop[1], drop[0]) / 1000 * 1.25).toFixed(1));
  const durMins = Math.max(5, Math.round((distKm / 35) * 60));
  return {
    distanceKm: distKm,
    durationMins: durMins,
    coordinates: coords
  };
}

export async function getRoadRoute(
  pickupCoords: [number, number], // [lng, lat]
  dropCoords: [number, number]    // [lng, lat]
): Promise<RouteResult | null> {
  const cacheKey = `${pickupCoords[0].toFixed(4)},${pickupCoords[1].toFixed(4)}->${dropCoords[0].toFixed(4)},${dropCoords[1].toFixed(4)}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS && cached.result) {
    return cached.result;
  }

  const endpoints = [
    `https://router.project-osrm.org/route/v1/driving/${pickupCoords[0]},${pickupCoords[1]};${dropCoords[0]},${dropCoords[1]}?overview=full&geometries=geojson`,
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${pickupCoords[0]},${pickupCoords[1]};${dropCoords[0]},${dropCoords[1]}?overview=full&geometries=geojson`
  ];

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'IndoFleetLogistics/1.0' },
        signal: controller.signal
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.routes?.[0]?.geometry?.coordinates?.length) {
          const result: RouteResult = {
            distanceKm: Number((data.routes[0].distance / 1000).toFixed(1)),
            durationMins: Math.round(data.routes[0].duration / 60),
            coordinates: data.routes[0].geometry.coordinates as [number, number][]
          };
          routeCache.set(cacheKey, { result, timestamp: Date.now() });
          return result;
        }
      }
    } catch {
      // Try next mirror
    }
  }

  const fallback = generateFallbackRoute(pickupCoords, dropCoords);
  routeCache.set(cacheKey, { result: fallback, timestamp: Date.now() });
  return fallback;
}

export function haversineDistMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function distToSegmentMeters(
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

export function minDistanceToPolylineMeters(
  point: [number, number], // [lng, lat]
  polyline: [number, number][] // [lng, lat][]
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

export interface RouteDeviationCheck {
  isOffRoute: boolean;
  deviationMeters: number;
}

export function checkRouteDeviation(
  currentCoords: [number, number], // [lng, lat]
  plannedCoordinates: [number, number][], // [lng, lat][]
  thresholdMeters: number = 150
): RouteDeviationCheck {
  if (!plannedCoordinates || plannedCoordinates.length < 2) {
    return { isOffRoute: false, deviationMeters: 0 };
  }
  const deviationMeters = Math.round(minDistanceToPolylineMeters(currentCoords, plannedCoordinates));
  return {
    isOffRoute: deviationMeters > thresholdMeters,
    deviationMeters
  };
}
