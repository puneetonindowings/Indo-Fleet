/**
 * IndoFleet Dynamic Geocoding & Routing Service
 * Provides real-world address geocoding (Nominatim / Google) and road routing (OSRM)
 * with robust address normalization and high-performance caching.
 */

interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface RouteResult {
  distanceKm: number;
  durationMins: number;
  coordinates: [number, number][]; // [lng, lat] GeoJSON format
}

// In-memory LRU-like cache for geocoding
const geocodeCache = new Map<string, { result: GeocodeResult | null; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Normalizes user-entered address strings by removing phone numbers, recipient names,
 * and apartment prefix noise that confuse geocoders.
 */
function cleanAddressCandidates(raw: string): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Remove phone numbers (+91-XXXXX or 10-digit Indian numbers)
  const noPhone = trimmed
    .replace(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/g, '')
    .replace(/\b\d{10}\b/g, '')
    .trim();

  // Strip obvious recipient prefixes like "Name, Phone, Full Address"
  const tokens = noPhone.split(',').map((s) => s.trim()).filter(Boolean);

  const candidates: string[] = [];

  // Candidate 1: Full cleaned string
  candidates.push(noPhone);

  // Candidate 2: If multiple tokens, try without first token (often recipient name or flat number)
  if (tokens.length >= 2) {
    candidates.push(tokens.slice(1).join(', '));
  }

  // Candidate 3: Last 3 tokens (e.g., "Sector 74, Noida, 201301" or "Indiranagar, Bangalore, Karnataka")
  if (tokens.length >= 3) {
    candidates.push(tokens.slice(-3).join(', '));
  }

  // Candidate 4: Last 2 tokens (e.g., "Noida, 201301" or "Bangalore, Karnataka")
  if (tokens.length >= 2) {
    candidates.push(tokens.slice(-2).join(', '));
  }

  // Candidate 5: Pincode or City alone if present
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
  const cacheKey = rawAddress.trim().toLowerCase();

  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  const candidates = cleanAddressCandidates(rawAddress);
  if (candidates.length === 0) return null;

  // 1. If Google Maps API Key is configured, try Google Geocoding first
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

  // 2. OpenStreetMap Nominatim Geocoding (Global, no API key required)
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
      // Continue to next candidate
    }
  }

  geocodeCache.set(cacheKey, { result: null, timestamp: Date.now() });
  return null;
}

/**
 * Calculates road-by-road route using OSRM.
 */
export async function getRoadRoute(
  pickupCoords: [number, number], // [lng, lat]
  dropCoords: [number, number]    // [lng, lat]
): Promise<RouteResult | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${pickupCoords[0]},${pickupCoords[1]};${dropCoords[0]},${dropCoords[1]}?overview=full&geometries=geojson`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.routes?.[0]?.geometry?.coordinates?.length) {
      return {
        distanceKm: Number((data.routes[0].distance / 1000).toFixed(1)),
        durationMins: Math.round(data.routes[0].duration / 60),
        coordinates: data.routes[0].geometry.coordinates as [number, number][]
      };
    }
  } catch (err) {
    console.warn('[Routing] OSRM fetch failed:', err);
  }
  return null;
}
