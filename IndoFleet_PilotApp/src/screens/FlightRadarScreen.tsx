import { WebView } from 'react-native-webview';
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  Rect,
  Text as SvgText,
  Path,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import {
  Gauge,
  Compass,
  BatteryCharging,
  Radio,
  MapPin,
  CheckCircle,
  ExternalLink,
  Navigation,
  ArrowLeft,
  Shield,
  Package,
  ChevronRight,
  PauseCircle,
  Maximize2,
  Minimize2,
  LocateFixed,
  Layers,
  QrCode,
  ShieldCheck,
  Camera,
  Building2,
} from 'lucide-react-native';
import { DeliveryOrder, TelemetryStats } from '../types';
import { getRoutingApiUrl } from '../config';

interface FlightRadarScreenProps {
  order: DeliveryOrder | null;
  allOrders?: DeliveryOrder[];
  orderInspectedDrones?: Record<string, string[]>;
  orderHubInspectedDrones?: Record<string, string[]>;
  onSelectOrder?: (order: DeliveryOrder) => void;
  isTracking: boolean;
  telemetry: TelemetryStats;
  currentCoords: { latitude: number; longitude: number } | null;
  onBackToDashboard: () => void;
  onCompletePod: (order: DeliveryOrder) => void;
  onOpenSortieDrones?: (order: DeliveryOrder, stage?: 'hub_pickup' | 'customer_delivery') => void;
  onStopTracking: () => void;
  onRefreshLocation?: () => void;
  onUpdateLocation?: (coords: { latitude: number; longitude: number }) => void;
}

/* ───────────────────────── Design tokens ───────────────────────── */
const C = {
  brand: '#5A00B8',
  brandDeep: '#3B0080',
  brandSoft: '#F3E8FF',
  brandLine: '#DDD6FE',
  ink: '#0F172A',
  body: '#475569',
  muted: '#94A3B8',
  line: '#E2E8F0',
  hairline: '#F1F5F9',
  bg: '#F6F4FB',
  card: '#FFFFFF',
  ok: '#059669',
  okSoft: '#ECFDF5',
  okLine: '#A7F3D0',
  warn: '#D97706',
  warnSoft: '#FFFBEB',
  warnLine: '#FDE68A',
  danger: '#DC2626',
  night: '#0F172A',
  nightLine: '#1E293B',
};

const R = { sm: 8, md: 12, lg: 18, xl: 22, pill: 999 };

const cardShadow = {
  shadowColor: '#1E1B4B',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
};

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/</g, '\\u003c')
    .replace(/[\r\n]+/g, ' ');

const cardinal = (deg: number) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/* ───────────────────────── Small building blocks ───────────────────────── */
const MeterCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  caption: string;
  pct: number;
  tone?: string;
}> = ({ icon, label, value, unit, caption, pct, tone = C.brand }) => (
  <View style={styles.meterCard}>
    <View style={styles.meterHead}>
      <View style={[styles.meterIcon, { backgroundColor: `${tone}14` }]}>{icon}</View>
      <Text style={styles.meterLabel}>{label}</Text>
    </View>
    <View style={styles.meterValueRow}>
      <Text style={styles.meterValue}>{value}</Text>
      {unit ? <Text style={styles.meterUnit}>{unit}</Text> : null}
    </View>
    <View style={styles.meterTrack}>
      <View style={[styles.meterFill, { width: `${clamp(pct, 0, 100)}%`, backgroundColor: tone }]} />
    </View>
    <Text style={styles.meterCaption}>{caption}</Text>
  </View>
);

/* ───────────────────────── Screen ───────────────────────── */
export const FlightRadarScreen: React.FC<FlightRadarScreenProps> = ({
  order,
  allOrders = [],
  orderInspectedDrones = {},
  orderHubInspectedDrones = {},
  onSelectOrder,
  isTracking,
  telemetry,
  currentCoords,
  onBackToDashboard,
  onCompletePod,
  onOpenSortieDrones,
  onStopTracking,
  onRefreshLocation,
  onUpdateLocation,
}) => {
  const [viewMode, setViewMode] = useState<'map' | 'hud'>('map');
  const [mapZoom] = useState<number>(15);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [fullscreen, setFullscreen] = useState(false);

  // Exit fullscreen map on Android hardware back button
  useEffect(() => {
    if (!fullscreen) return;
    const onBackPress = () => {
      setFullscreen(false);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [fullscreen]);
  const [isLocating, setIsLocating] = useState(false);
  const [totalRoadDistanceKm, setTotalRoadDistanceKm] = useState<number | null>(null);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);
  const [roadDurationMin, setRoadDurationMin] = useState<number | null>(null);

  // Active target order: use selected order, or find first active order from allOrders
  const activeOrder = useMemo(() => {
    if (order) return order;
    return (
      allOrders.find((o) => ['in-flight', 'taking-off', 'out-for-delivery', 'assigned', 'pending'].includes(o.status)) ||
      allOrders[0] ||
      null
    );
  }, [order, allOrders]);

  // Dispatch hub: order pickup coordinates, falling back to Sector 60 Base Hub ONLY if order base is missing
  const baseHub = useMemo(() => {
    const target = activeOrder || order;
    const pLat = target?.pickup_location?.latitude ?? target?.pickup_lat;
    const pLng = target?.pickup_location?.longitude ?? target?.pickup_lng;
    if (
      typeof pLat === 'number' && Number.isFinite(pLat) &&
      typeof pLng === 'number' && Number.isFinite(pLng) &&
      (pLat !== 0 || pLng !== 0)
    ) {
      return { latitude: pLat, longitude: pLng, name: target?.pickup_address || 'Order Dispatch Hub' };
    }
    // Fallback: A-21, Block A, Sector 60, Noida, UP (Central Base Hub)
    return {
      latitude: 28.6037,
      longitude: 77.3661,
      name: 'A-21, Block A, Sector 60, Noida, UP (Central Base Hub)',
    };
  }, [activeOrder, order]);

  const hasLiveGpsFix = Boolean(
    isTracking &&
      currentCoords &&
      Number.isFinite(currentCoords.latitude) &&
      Number.isFinite(currentCoords.longitude) &&
      (currentCoords.latitude !== 0 || currentCoords.longitude !== 0)
  );

  const pilotLat: number = hasLiveGpsFix ? currentCoords!.latitude : baseHub?.latitude ?? 28.6037;
  const pilotLng: number = hasLiveGpsFix ? currentCoords!.longitude : baseHub?.longitude ?? 77.3661;

  // Intelligent Noida / Delhi NCR Sector Resolver from Address String
  const resolveAddressCoords = (addressStr?: string): { latitude: number; longitude: number } | null => {
    if (!addressStr || typeof addressStr !== 'string') return null;
    const lower = addressStr.toLowerCase();

    // Sector 148, Noida / Expressway (Near Gold's Gym / Metro)
    if (lower.includes('148')) return { latitude: 28.4779, longitude: 77.4815 };
    // Sector 142 / Advant Navis
    if (lower.includes('142')) return { latitude: 28.5028, longitude: 77.4172 };
    // Sector 137 / Felix Hospital / Paras Tierea
    if (lower.includes('137')) return { latitude: 28.5132, longitude: 77.4046 };
    // Sector 128 / Jaypee Wish Town
    if (lower.includes('128')) return { latitude: 28.5283, longitude: 77.3753 };
    // Sector 62 / Electronic City
    if (lower.includes('62')) return { latitude: 28.6280, longitude: 77.3750 };
    // Sector 63
    if (lower.includes('63')) return { latitude: 28.6234, longitude: 77.3824 };
    // Sector 60 Central Hub
    if (lower.includes('60')) return { latitude: 28.6037, longitude: 77.3661 };
    // Sector 18 / Atta Market / DLF Mall of India
    if (lower.includes('18')) return { latitude: 28.5708, longitude: 77.3260 };
    // Sector 16 / Film City
    if (lower.includes('16') || lower.includes('film city')) return { latitude: 28.5672, longitude: 77.3211 };
    // Greater Noida / Pari Chowk / Knowledge Park
    if (lower.includes('pari chowk') || lower.includes('greater noida')) return { latitude: 28.4744, longitude: 77.5040 };
    // Connaught Place / Central Delhi
    if (lower.includes('connaught') || lower.includes('cp')) return { latitude: 28.6315, longitude: 77.2167 };
    // Gurgaon / Cyber City
    if (lower.includes('cyber city') || lower.includes('gurgaon') || lower.includes('gurugram')) return { latitude: 28.4950, longitude: 77.0890 };

    const secMatch = lower.match(/sector\s*([0-9]{1,3})/);
    if (secMatch && secMatch[1]) {
      const num = parseInt(secMatch[1], 10);
      if (num >= 130) {
        return { latitude: 28.5000 - ((num - 130) * 0.002), longitude: 77.4100 + ((num - 130) * 0.0035) };
      }
    }
    return null;
  };

  // Determine Target Drop Location coordinates (with intelligent address parsing)
  const targetLat: number = useMemo(() => {
    const target = activeOrder || order;
    const lat = target?.destination_location?.latitude ?? target?.delivery_lat ?? target?.drop_lat;
    if (typeof lat === 'number' && Number.isFinite(lat) && lat !== 0) {
      return lat;
    }
    const resolved = resolveAddressCoords(target?.drop_address || target?.delivery_address);
    if (resolved) return resolved.latitude;
    return 28.6280; // Sector 62, Noida default
  }, [activeOrder, order]);

  const targetLng: number = useMemo(() => {
    const target = activeOrder || order;
    const lng = target?.destination_location?.longitude ?? target?.delivery_lng ?? target?.drop_lng;
    if (typeof lng === 'number' && Number.isFinite(lng) && lng !== 0) {
      return lng;
    }
    const resolved = resolveAddressCoords(target?.drop_address || target?.delivery_address);
    if (resolved) return resolved.longitude;
    return 77.3750; // Sector 62, Noida default
  }, [activeOrder, order]);

  const hasTargetCoords = true;

  // Listen to GPS updates and road route metrics from Web Leaflet iframe
  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWindowMessage = (e: MessageEvent) => {
        if (e.data && e.data.type === 'GPS_FIX' && e.data.coords) {
          if (onUpdateLocation) {
            onUpdateLocation(e.data.coords);
          }
        }
        if (e.data && e.data.type === 'ROUTE_DETAILS') {
          if (typeof e.data.distanceKm === 'number') {
            setRoadDistanceKm(e.data.distanceKm);
          }
          if (typeof e.data.durationMin === 'number') {
            setRoadDurationMin(e.data.durationMin);
          }
        }
      };
      window.addEventListener('message', handleWindowMessage);
      return () => window.removeEventListener('message', handleWindowMessage);
    }
  }, [onUpdateLocation]);

  const handleRecenterLocation = () => {
    setIsLocating(true);
    setTimeout(() => setIsLocating(false), 2000);

    // 1. Web browser direct GPS query
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          if (pos && pos.coords) {
            const coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            if (onUpdateLocation) onUpdateLocation(coords);

            // Notify iframe map to fly smoothly to current coords
            if (typeof document !== 'undefined') {
              const iframes = document.querySelectorAll('iframe');
              iframes.forEach((ifr) => {
                ifr.contentWindow?.postMessage({ type: 'RECENTER_MAP', coords }, '*');
              });
            }
          }
        },
        (err) => {
          setIsLocating(false);
          console.warn('Geolocation query warning:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    // 2. Trigger parent refresh
    if (onRefreshLocation) {
      onRefreshLocation();
    }
  };

  const calculateDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const Rk = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return Number((Rk * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
  };

  // Fetch Total Road Distance from Hub to Customer Drop
  React.useEffect(() => {
    if (baseHub && targetLat != null && targetLng != null) {
      const hubRoutingUrl = `${getRoutingApiUrl().replace(/\/+$/, '')}/route/v1/driving/${baseHub.longitude},${baseHub.latitude};${targetLng},${targetLat}?overview=false`;
      fetch(hubRoutingUrl)
        .then((r) => r.json())
        .then((d) => {
          if (d && d.routes && d.routes[0]) {
            const dist = parseFloat((d.routes[0].distance / 1000).toFixed(1));
            setTotalRoadDistanceKm(dist);
          }
        })
        .catch(() => {});
    }
  }, [baseHub, targetLat, targetLng]);

  // Fetch Remaining Road Distance from Pilot's current position to Customer Drop
  React.useEffect(() => {
    if (pilotLat != null && pilotLng != null && targetLat != null && targetLng != null) {
      const routingUrl = `${getRoutingApiUrl().replace(/\/+$/, '')}/route/v1/driving/${pilotLng},${pilotLat};${targetLng},${targetLat}?overview=false`;
      fetch(routingUrl)
        .then((r) => r.json())
        .then((d) => {
          if (d && d.routes && d.routes[0]) {
            const dist = parseFloat((d.routes[0].distance / 1000).toFixed(1));
            const dur = Math.max(1, Math.round(d.routes[0].duration / 60));
            setRoadDistanceKm(dist);
            setRoadDurationMin(dur);
          }
        })
        .catch(() => {});
    }
  }, [pilotLat, pilotLng, targetLat, targetLng]);

  // Total trip distance: Use total road route from Hub to Drop (e.g. 4.3 km)
  const totalTripDist = useMemo(() => {
    if (totalRoadDistanceKm != null && Number.isFinite(totalRoadDistanceKm)) {
      return totalRoadDistanceKm;
    }
    if (roadDistanceKm != null && Number.isFinite(roadDistanceKm)) {
      return roadDistanceKm;
    }
    if (baseHub && hasTargetCoords) {
      const crowDist = calculateDist(baseHub.latitude, baseHub.longitude, targetLat, targetLng);
      return Number((crowDist * 1.4).toFixed(1));
    }
    return 4.3;
  }, [totalRoadDistanceKm, roadDistanceKm, baseHub, targetLat, targetLng, hasTargetCoords]);

  // Remaining / Rest distance from pilot's live location to Drop-off point (Cannot exceed totalTripDist)
  const remainingDist = useMemo(() => {
    let currentRemaining: number;
    if (roadDistanceKm != null && Number.isFinite(roadDistanceKm)) {
      currentRemaining = roadDistanceKm;
    } else if (pilotLat != null && pilotLng != null && hasTargetCoords) {
      const crowDist = calculateDist(pilotLat, pilotLng, targetLat, targetLng);
      currentRemaining = Number((crowDist * 1.4).toFixed(1));
    } else {
      currentRemaining = totalTripDist;
    }
    return Number(Math.min(currentRemaining, totalTripDist).toFixed(1));
  }, [roadDistanceKm, pilotLat, pilotLng, targetLat, targetLng, hasTargetCoords, totalTripDist]);

  const displayTotal = totalTripDist.toFixed(1);
  const displayRemaining = remainingDist.toFixed(1);

  const handleOpenGoogleMaps = () => {
    const target = activeOrder || order;
    const rawAddress = target?.drop_address || target?.delivery_address || 'Delivery Destination';
    const address = encodeURIComponent(rawAddress);
    const destCoords = `${targetLat},${targetLng}`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destCoords}&travelmode=driving`;
    const appNavUrl = `google.navigation:q=${destCoords}&mode=d`;
    const geoUrl = `geo:${destCoords}?q=${destCoords}(${address})`;

    // 1. Web Environment (Desktop & Mobile Browser in React Native Web)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const w = window.open(webUrl, '_blank', 'noopener,noreferrer');
      if (!w || w.closed || typeof w.closed === 'undefined') {
        window.location.href = webUrl;
      }
      return;
    }

    // 2. Native Mobile (Turn-by-turn navigation in Google Maps app)
    Linking.canOpenURL(appNavUrl)
      .then((canOpen) => {
        if (canOpen) return Linking.openURL(appNavUrl);
        return Linking.openURL(webUrl);
      })
      .catch(() => {
        Linking.openURL(webUrl).catch(() => {
          Linking.openURL(geoUrl).catch(() => {
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${destCoords}`);
          });
        });
      });
  };

  const handleStopAlert = () => {
    Alert.alert('Pause live GPS?', 'Customers will stop seeing your live location until you resume.', [
      { text: 'Keep sharing', style: 'cancel' },
      { text: 'Pause GPS', style: 'destructive', onPress: onStopTracking },
    ]);
  };

  /* ───────── Google Maps-Style Web Map (Leaflet in iframe) ───────── */
  const webMapHtml = useMemo(() => {
    // Render Google maps HTML on both Web and Native Android
    // if (Platform.OS !== 'web') return '';

    const hasPilot = pilotLat != null && pilotLng != null;
    const hasTarget = hasTargetCoords;

    // Default Sector 60 Noida Hub coordinates (Used only if live GPS & target are unavailable)
    const defaultLat = 28.6037;
    const defaultLng = 77.3661;
    const centerLat = hasPilot && hasTarget ? (pilotLat! + targetLat!) / 2 : hasPilot ? pilotLat! : hasTarget ? targetLat! : defaultLat;
    const centerLng = hasPilot && hasTarget ? (pilotLng! + targetLng!) / 2 : hasPilot ? pilotLng! : hasTarget ? targetLng! : defaultLng;

    const tileUrl =
      mapType === 'satellite'
        ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    const pill = (bg: string, text: string) =>
      `<div class="gmap-pill" style="background:${bg};">${text}</div>`;

    let markers = '';

    if (baseHub) {
      markers += `
        L.marker([${baseHub.latitude}, ${baseHub.longitude}], {
          icon: L.divIcon({ className: '', html: '${esc(pill('#0284C7', 'Hub'))}', iconSize: [60, 26], iconAnchor: [30, 13] })
        }).addTo(map).bindPopup("<b>Hub</b>");`;
    }

    if (hasPilot) {
      markers += `
        pilotMarker = L.marker([${pilotLat}, ${pilotLng}], {
          icon: createPilotIcon()
        }).addTo(map).bindPopup("<b>Your Location (Live GPS)</b><br>${telemetry.speedKmh} km/h • Active Courier Fix");`;
    }

    const targetOrder = activeOrder || order;

    if (hasTarget) {
      const homeMarkerHtml = '<div style="background:#DC2626;color:#FFF;width:34px;height:34px;border-radius:17px;border:2.5px solid #FFFFFF;display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 3px 10px rgba(0,0,0,0.35);">🏠</div>';
      markers += `
        L.marker([${targetLat}, ${targetLng}], {
          icon: L.divIcon({ className: '', html: '${esc(homeMarkerHtml)}', iconSize: [34, 34], iconAnchor: [17, 17] })
        }).addTo(map).bindPopup("<b>Home 🏠</b><br>${esc(targetOrder?.drop_address || targetOrder?.delivery_address || 'Delivery point')}");`;

      if (hasPilot) {
        markers += `
          function drawFallbackLine() {
            var fl = L.polyline([[${pilotLat}, ${pilotLng}], [${targetLat}, ${targetLng}]], {
              color: '#1A73E8',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.95
            }).addTo(map);
            map.fitBounds(fl.getBounds(), { padding: [55, 55] });
          }

          fetch('${getRoutingApiUrl().replace(/\/+$/, '')}/route/v1/driving/${pilotLng},${pilotLat};${targetLng},${targetLat}?overview=full&geometries=geojson')
            .then(function(r) { return r.json(); })
            .then(function(d) {
              if (d && d.routes && d.routes[0] && d.routes[0].geometry) {
                var coords = d.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
                // Outer white casing for high visibility
                L.polyline(coords, { color: '#FFFFFF', weight: 8, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }).addTo(map);
                // Inner Google Blue navigation road polyline
                var navRoute = L.polyline(coords, { color: '#1A73E8', weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }).addTo(map);
                map.fitBounds(navRoute.getBounds(), { padding: [55, 55] });

                var distKm = (d.routes[0].distance / 1000).toFixed(1);
                var durMin = Math.max(1, Math.round(d.routes[0].duration / 60));
                try {
                  var payload = { type: 'ROUTE_DETAILS', distanceKm: parseFloat(distKm), durationMin: durMin };
                  if (window.parent && window.parent.postMessage) {
                    window.parent.postMessage(payload, '*');
                  }
                  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
                  }
                } catch(e) {}
              } else {
                drawFallbackLine();
              }
            })
            .catch(drawFallbackLine);`;
      }
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #map {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
      background: #0F172A;
    }
    
    @keyframes gmap-pulse {
      0% { transform: scale(0.6); opacity: 0.95; }
      70% { transform: scale(2.0); opacity: 0; }
      100% { transform: scale(2.4); opacity: 0; }
    }
    .gmap-pilot-marker {
      position: relative;
      width: 24px;
      height: 24px;
    }
    .gmap-pulse-ring {
      position: absolute;
      inset: -14px;
      border-radius: 50%;
      background: rgba(26, 115, 232, 0.45);
      animation: gmap-pulse 2s cubic-bezier(0.2, 0.6, 0.35, 1) infinite;
      pointer-events: none;
    }
    .gmap-core-dot {
      position: absolute;
      inset: 0;
      background: #1A73E8;
      border-radius: 50%;
      border: 3.5px solid #FFFFFF;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }
    .gmap-pill {
      color: #FFF;
      padding: 5px 12px;
      border-radius: 999px;
      font: 800 11px -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      white-space: nowrap;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      border: 2px solid #FFF;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .leaflet-popup-content-wrapper {
      background: #0F172A;
      color: #F8FAFC;
      border-radius: 12px;
      border: 1px solid #334155;
      box-shadow: 0 6px 16px rgba(0,0,0,0.4);
      font-size: 12px;
      font-weight: 600;
    }
    .leaflet-popup-tip { background: #0F172A; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, preferCanvas: true }).setView([${centerLat}, ${centerLng}], ${mapZoom});
    L.tileLayer('${tileUrl}', { maxZoom: 19 }).addTo(map);

    function forceMapInvalidate() {
      if (map) {
        try { map.invalidateSize(true); } catch(e) {}
      }
    }

    // Force Leaflet recalculation for Android WebView containers
    forceMapInvalidate();
    setTimeout(forceMapInvalidate, 80);
    setTimeout(forceMapInvalidate, 250);
    setTimeout(forceMapInvalidate, 600);
    setTimeout(forceMapInvalidate, 1200);

    window.addEventListener('load', function() {
      forceMapInvalidate();
      setTimeout(forceMapInvalidate, 150);
      setTimeout(forceMapInvalidate, 500);
    });

    window.addEventListener('resize', forceMapInvalidate);

    if (typeof ResizeObserver !== 'undefined') {
      try {
        var ro = new ResizeObserver(function() {
          forceMapInvalidate();
        });
        ro.observe(document.getElementById('map'));
      } catch(e) {}
    }

    var pilotMarker = null;

    function createPilotIcon() {
      return L.divIcon({
        className: '',
        html: '<div class="gmap-pilot-marker"><div class="gmap-pulse-ring"></div><div class="gmap-core-dot"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    }

    ${markers}

    function locateUser() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(pos) {
          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;
          if (pilotMarker) {
            pilotMarker.setLatLng([lat, lng]);
          } else {
            pilotMarker = L.marker([lat, lng], { icon: createPilotIcon() }).addTo(map);
          }
          if (${!hasTarget}) {
            map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
          }
          try {
            window.parent.postMessage({ type: 'GPS_FIX', coords: { latitude: lat, longitude: lng } }, '*');
          } catch(e) {}
        }, function(err) {
          console.warn('Leaflet geolocation error', err);
        }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      }
    }

    if (${!hasLiveGpsFix}) {
      locateUser();
    }

    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'RECENTER_MAP') {
        if (e.data.coords) {
          if (pilotMarker) {
            pilotMarker.setLatLng([e.data.coords.latitude, e.data.coords.longitude]);
          } else {
            pilotMarker = L.marker([e.data.coords.latitude, e.data.coords.longitude], { icon: createPilotIcon() }).addTo(map);
          }
          map.flyTo([e.data.coords.latitude, e.data.coords.longitude], 16, { animate: true, duration: 1 });
        } else {
          locateUser();
        }
      }
    });
  </script>
</body>
</html>`;
  }, [pilotLat, pilotLng, targetLat, targetLng, hasTargetCoords, mapType, mapZoom, telemetry.speedKmh, order, baseHub, hasLiveGpsFix]);

  /* ───────── Native radar (SVG) ───────── */
  const renderTacticalRadarSvg = (full = false) => {
    const size = 320;
    const c = size / 2;

    let tx = c + 55;
    let ty = c - 65;
    if (hasTargetCoords && pilotLat != null && pilotLng != null) {
      const scale = 2400;
      tx = clamp(c + (targetLng! - pilotLng) * scale, 30, size - 30);
      ty = clamp(c - (targetLat! - pilotLat) * scale, 30, size - 30);
    }

    const heading = telemetry.headingDeg || 0;
    const rad = (heading * Math.PI) / 180;
    // 60° sweep wedge behind heading
    const a1 = ((heading - 30 - 90) * Math.PI) / 180;
    const a2 = ((heading + 30 - 90) * Math.PI) / 180;
    const wr = 130;
    const wedge = `M ${c} ${c} L ${c + wr * Math.cos(a1)} ${c + wr * Math.sin(a1)} A ${wr} ${wr} 0 0 1 ${c + wr * Math.cos(a2)} ${c + wr * Math.sin(a2)} Z`;

    return (
      <View style={full ? styles.radarWrapFull : styles.radarWrap}>
        <Svg width={full ? '100%' : size} height={full ? '100%' : size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id="radarGlow" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#A855F7" stopOpacity="0.22" />
              <Stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="wedgeFill" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#A855F7" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#A855F7" stopOpacity="0.02" />
            </RadialGradient>
          </Defs>

          <Rect x="0" y="0" width={size} height={size} rx="18" fill={C.night} />
          <Circle cx={c} cy={c} r="145" fill="url(#radarGlow)" />
          <Circle cx={c} cy={c} r="130" stroke="#334155" strokeWidth="1" strokeDasharray="3,5" fill="none" />
          <Circle cx={c} cy={c} r="88" stroke="#334155" strokeWidth="1" fill="none" />
          <Circle cx={c} cy={c} r="44" stroke="#334155" strokeWidth="1" fill="none" />
          <Line x1="14" y1={c} x2={size - 14} y2={c} stroke={C.nightLine} strokeWidth="1" />
          <Line x1={c} y1="14" x2={c} y2={size - 14} stroke={C.nightLine} strokeWidth="1" />

          <Path d={wedge} fill="url(#wedgeFill)" />

          <SvgText x={c + 6} y={c - 47} fill="#64748B" fontSize="9" fontWeight="bold">1.5 km</SvgText>
          <SvgText x={c + 6} y={c - 91} fill="#64748B" fontSize="9" fontWeight="bold">3 km</SvgText>
          <SvgText x={c + 6} y={c - 133} fill="#64748B" fontSize="9" fontWeight="bold">5 km</SvgText>
          <SvgText x={c} y="12" fill="#CBD5E1" fontSize="10" fontWeight="bold" textAnchor="middle">N</SvgText>

          {hasTargetCoords && (
            <>
              <Line x1={c} y1={c} x2={tx} y2={ty} stroke="#C084FC" strokeWidth="2.5" strokeDasharray="6,5" />
              <Circle cx={tx} cy={ty} r="15" stroke="#F87171" strokeWidth="1.5" strokeOpacity="0.5" fill="none" />
              <Circle cx={tx} cy={ty} r="8" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
              <SvgText x={tx} y={ty - 20} fill="#FCA5A5" fontSize="10" fontWeight="bold" textAnchor="middle">
                Drop #{order?.order_number?.slice(-4) || '----'}
              </SvgText>
            </>
          )}

          {baseHub && (
            <>
              <Circle cx={c - 60} cy={c + 50} r="7" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
              <SvgText x={c - 60} y={c + 68} fill="#6EE7B7" fontSize="9" fontWeight="bold" textAnchor="middle">Hub</SvgText>
            </>
          )}

          <Circle cx={c} cy={c} r="17" fill="#7C3AED" fillOpacity="0.28" />
          <Circle cx={c} cy={c} r="7" fill={C.brand} stroke="#FFFFFF" strokeWidth="2.5" />
          <Line
            x1={c}
            y1={c}
            x2={c + 22 * Math.sin(rad)}
            y2={c - 22 * Math.cos(rad)}
            stroke="#DDD6FE"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Svg>

        <View style={styles.radarBadge}>
          <View style={[styles.radarBadgeDot, { backgroundColor: hasTargetCoords ? '#C084FC' : C.ok }]} />
          <Text style={styles.radarBadgeText}>{hasTargetCoords ? 'En Route to Delivery' : 'GPS Location Ready'}</Text>
        </View>
      </View>
    );
  };

  const speedPct = (telemetry.speedKmh / 120) * 100;
  const altPct = (telemetry.altitudeM / 500) * 100;
  const lowBattery = telemetry.batteryPct < 25;

  const renderMapBody = (full: boolean) =>
    Platform.OS === 'web' ? (
      <iframe
        title="IndoFleet live navigation map"
        srcDoc={webMapHtml}
        style={{
          width: '100%',
          height: full ? '100%' : 260,
          border: 'none',
          display: 'block',
          backgroundColor: '#0F172A',
        }}
      />
    ) : (
      <View style={[styles.mapContainer, full ? styles.mapContainerFull : styles.mapContainerSmall]}>
        <WebView
          originWhitelist={['*']}
          source={{ html: webMapHtml }}
          style={{ width: '100%', height: '100%', backgroundColor: '#0F172A' }}
          containerStyle={{ width: '100%', height: '100%' }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={false}
          scrollEnabled={false}
          nestedScrollEnabled={true}
          androidLayerType="hardware"
          mixedContentMode="always"
          overScrollMode="never"
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'ROUTE_DETAILS') {
                if (typeof data.distanceKm === 'number') setRoadDistanceKm(data.distanceKm);
                if (typeof data.durationMin === 'number') setRoadDurationMin(data.durationMin);
              }
            } catch {}
          }}
        />
      </View>
    );

  const renderMapToggle = () => (
    <View style={styles.mapToggle}>
      {(['street', 'satellite'] as const).map((t) => {
        const active = mapType === t;
        return (
          <TouchableOpacity
            key={t}
            style={[styles.mapToggleBtn, active && styles.mapToggleBtnActive]}
            onPress={() => setMapType(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.mapToggleText, active && styles.mapToggleTextActive]}>
              {t === 'street' ? 'Street' : 'Satellite'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  /* Fullscreen: only the map between the app header and bottom nav */
  if (fullscreen && viewMode === 'map') {
    return (
      <View style={styles.container}>
        <View style={styles.fsWrap}>
          {renderMapBody(true)}
          {renderMapToggle()}
          <TouchableOpacity style={styles.fsBtn} onPress={() => setFullscreen(false)} activeOpacity={0.85}>
            <Minimize2 size={18} color={C.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.myLocationBtn, isLocating && styles.myLocationBtnActive]}
            onPress={handleRecenterLocation}
            activeOpacity={0.85}
          >
            <LocateFixed size={20} color={isLocating ? '#059669' : '#1A73E8'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ───────── Render ───────── */
  return (
    <View style={styles.container}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBackToDashboard} activeOpacity={0.7}>
            <ArrowLeft size={16} color={C.ink} />
            <Text style={styles.backBtnText}>Home</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Navigation size={13} color="#5A00B8" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#5A00B8' }}>Road GPS Navigation</Text>
          </View>
        </View>

        {/* Destination / overview */}
        {order ? (
          <View style={styles.destCard}>
            <View style={styles.destTop}>
              <View style={styles.destTag}>
                <Shield size={13} color={C.brandDeep} />
                <Text style={styles.destTagText}>Active Delivery</Text>
              </View>
              <View style={styles.orderChip}>
                <Text style={styles.orderChipText}>#{order.order_number}</Text>
              </View>
            </View>

            <Text style={styles.destName} numberOfLines={1}>{order.customer_name}</Text>

            <View style={styles.destAddressRow}>
              <View style={styles.pinWrap}>
                <MapPin size={14} color={C.danger} />
              </View>
              <Text style={styles.destAddress} numberOfLines={2}>
                {order.drop_address || order.delivery_address || 'Delivery Address'}
              </Text>
            </View>

            {/* Real Route Distance & Rest Distance Display outside the map */}
            <View style={styles.distanceStatsRow}>
              <View style={styles.distanceStatItem}>
                <Text style={styles.distanceStatLabel}>TOTAL DISTANCE</Text>
                <Text style={styles.distanceStatValue}>{displayTotal} km</Text>
              </View>

              <View style={styles.distanceStatDivider} />

              <View style={styles.distanceStatItem}>
                <Text style={styles.distanceStatLabel}>REST DISTANCE</Text>
                <Text style={[styles.distanceStatValue, { color: '#059669' }]}>{displayRemaining} km</Text>
              </View>

              <View style={styles.distanceStatDivider} />

              <View style={styles.distanceStatItem}>
                <Text style={styles.distanceStatLabel}>EST. TIME</Text>
                <Text style={[styles.distanceStatValue, { color: '#2563EB' }]}>
                  {roadDurationMin != null ? `${roadDurationMin} min` : `${Math.max(1, Math.round(remainingDist * 2.5))} min`}
                </Text>
              </View>
            </View>

            <View style={styles.destFooter}>
              <View style={styles.distPill}>
                <Navigation size={13} color="#059669" />
                <Text style={[styles.distText, { color: '#065F46' }]}>
                  {displayRemaining} km remaining to Home 🏠
                </Text>
              </View>
              <TouchableOpacity style={styles.linkBtn} onPress={handleOpenGoogleMaps} activeOpacity={0.8}>
                <ExternalLink size={13} color={C.brandDeep} />
                <Text style={styles.linkBtnText}>Google Maps</Text>
              </TouchableOpacity>
            </View>
          </View>
          ) : (
            <View style={styles.destCard}>
            <View style={styles.destTop}>
              <View style={styles.destTag}>
                <View style={styles.liveDot} />
                <Text style={styles.destTagText}>Road Delivery Standby</Text>
              </View>
              <View style={styles.orderChip}>
                <Text style={styles.orderChipText}>
                  {allOrders.length} {allOrders.length === 1 ? 'Delivery' : 'Deliveries'} assigned
                </Text>
              </View>
            </View>
            <Text style={styles.destName}>No Active Delivery Selected</Text>
            <Text style={styles.areaSub}>Your GPS location is active. Select an assigned delivery below to see the road driving route to the customer location.</Text>
          </View>
        )}

        {/* Map view */}
        {viewMode === 'map' && (
          <View style={styles.mapCard}>
            <View style={styles.mapHeader}>
              <View style={styles.mapTitleRow}>
                <Radio size={15} color={C.brand} />
                <Text style={styles.mapTitle}>{order ? 'Driving Route' : 'Live Map'}</Text>
              </View>
              <TouchableOpacity
                onPress={onRefreshLocation}
                activeOpacity={0.7}
                style={[styles.gpsBadge, hasLiveGpsFix ? styles.gpsOk : styles.gpsWait]}
              >
                <View style={[styles.gpsDot, { backgroundColor: hasLiveGpsFix ? C.ok : C.warn }]} />
                <Text style={[styles.gpsText, { color: hasLiveGpsFix ? '#065F46' : '#92400E' }]}>
                  {hasLiveGpsFix ? 'GPS locked' : 'Tap to Lock GPS'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.mapFrame}>
              {renderMapBody(false)}
              {renderMapToggle()}
              <TouchableOpacity style={styles.fsBtn} onPress={() => setFullscreen(true)} activeOpacity={0.85}>
                <Maximize2 size={17} color={C.ink} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.myLocationBtn, isLocating && styles.myLocationBtnActive]}
                onPress={handleRecenterLocation}
                activeOpacity={0.85}
              >
                <LocateFixed size={20} color={isLocating ? '#059669' : '#1A73E8'} />
              </TouchableOpacity>
            </View>

            <View style={styles.statStrip}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Location</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {currentCoords
                    ? `${currentCoords.latitude.toFixed(4)}, ${currentCoords.longitude.toFixed(4)}`
                    : 'Finding…'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Heading</Text>
                <Text style={styles.statValue}>
                  {telemetry.headingDeg || 0}° {cardinal(telemetry.headingDeg || 0)}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Live sharing</Text>
                <Text style={[styles.statValue, { color: isTracking ? C.ok : C.danger }]}>
                  {isTracking ? 'On' : 'Paused'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Assigned Deliveries */}
        {!order && allOrders.length > 0 && (
          <View style={styles.listCard}>
            <View style={styles.listHeader}>
              <Package size={16} color={C.brand} />
              <Text style={styles.listTitle}>Assigned Deliveries</Text>
            </View>

            {allOrders.map((ord) => {
              const destL = ord.destination_location?.latitude ?? ord.delivery_lat ?? ord.drop_lat ?? null;
              const destG = ord.destination_location?.longitude ?? ord.delivery_lng ?? ord.drop_lng ?? null;
              const dist =
                pilotLat !== null && pilotLng !== null && destL !== null && destG !== null &&
                Number.isFinite(destL) && Number.isFinite(destG)
                  ? calculateDist(pilotLat, pilotLng, destL, destG)
                  : null;

              return (
                <TouchableOpacity
                  key={ord.id}
                  style={styles.listItem}
                  onPress={() => onSelectOrder && onSelectOrder(ord)}
                  activeOpacity={0.75}
                >
                  <View style={styles.listAvatar}>
                    <Text style={styles.listAvatarText}>{(ord.customer_name || '?').trim().charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.listBody}>
                    <View style={styles.listNameRow}>
                      <Text style={styles.listName} numberOfLines={1}>{ord.customer_name}</Text>
                      <Text style={styles.listOrderNo}>Order #{ord.order_number}</Text>
                    </View>
                    <Text style={styles.listAddress} numberOfLines={1}>
                      Address: {ord.drop_address || ord.delivery_address || 'Customer Location'}
                    </Text>
                  </View>
                  <View style={styles.listRight}>
                    <Text style={[styles.listDist, dist === null && { color: C.muted }]}>
                      {dist !== null ? `${dist.toFixed(1)} km` : 'No GPS'}
                    </Text>
                    <ChevronRight size={16} color={C.muted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Actions */}
        {(order || activeOrder) && (() => {
          const currentOrd = (order || activeOrder)!;
          const totalDroneCount = Math.max(
            currentOrd.units_count || 1,
            (currentOrd.reserved_inventory_ids || []).length,
            (currentOrd.items || []).length,
            1
          );

          const isHubStage =
            currentOrd.status === 'assigned' ||
            currentOrd.status === 'pending_acceptance' ||
            currentOrd.pilot_acceptance_status === 'pending_acceptance' ||
            (currentOrd.status as string) === 'waiting_otp_accept';

          const inspectedList = Array.from(new Set([
            ...(isHubStage
                ? [...(orderHubInspectedDrones?.[currentOrd.id] || []), ...(currentOrd.hub_inspected_drone_ids || [])]
                : [...(orderInspectedDrones?.[currentOrd.id] || []), ...(currentOrd.inspected_drone_ids || [])])
          ]));
          const isAllInspected = inspectedList.length >= totalDroneCount;

          return (
            <View style={styles.actions}>
              {/* Airframe Inspection Summary Card (Clear Hub Pre-Acceptance vs Customer Handover) */}
              <View style={styles.sortieSummaryCard}>
                <View style={styles.sortieSummaryHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                    {isHubStage ? (
                      <Building2 size={16} color="#4F46E5" />
                    ) : (
                      <ShieldCheck size={16} color="#059669" />
                    )}
                    <Text style={styles.sortieSummaryTitle} numberOfLines={1}>
                      {isHubStage ? 'Hub Pre-Acceptance' : 'Customer Handover'} ({inspectedList.length}/{totalDroneCount})
                    </Text>
                  </View>
                  <View style={[styles.sortieBadge, isAllInspected ? styles.sortieBadgeReady : styles.sortieBadgePending]}>
                    <Text style={[styles.sortieBadgeText, isAllInspected ? styles.sortieBadgeTextReady : styles.sortieBadgeTextPending]} numberOfLines={1}>
                      {isAllInspected
                        ? (isHubStage ? 'Hub Verified ✓' : 'Handover Ready ✓')
                        : (isHubStage ? 'Hub Inspection Required' : 'Inspection Pending')}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.openSortieBtn}
                  onPress={() => (onOpenSortieDrones ? onOpenSortieDrones(currentOrd, isHubStage ? 'hub_pickup' : 'customer_delivery') : onCompletePod(currentOrd))}
                  activeOpacity={0.85}
                >
                  <Camera size={15} color="#FFFFFF" />
                  <Text style={styles.openSortieBtnText} numberOfLines={1}>
                    {isAllInspected
                      ? (isHubStage ? 'View Hub Inspected Drones' : 'View Inspected Drones & POD')
                      : (isHubStage
                          ? `Inspect Drones at Hub (${inspectedList.length}/${totalDroneCount})`
                          : `Verify for Handover (${inspectedList.length}/${totalDroneCount})`)}
                  </Text>
                  <ChevronRight size={15} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {(!isHubStage && isAllInspected) && (
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#059669' }]} onPress={() => onCompletePod(currentOrd)} activeOpacity={0.85}>
                  <CheckCircle size={19} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>
                    Complete Handover & POD
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenGoogleMaps} activeOpacity={0.85}>
                <ExternalLink size={16} color={C.brandDeep} />
                <Text style={styles.secondaryBtnText}>Open Driving Route (Google Maps)</Text>
              </TouchableOpacity>

              {isTracking && (
                <TouchableOpacity style={styles.ghostBtn} onPress={handleStopAlert} activeOpacity={0.7}>
                  <PauseCircle size={15} color={C.body} />
                  <Text style={styles.ghostBtnText}>Pause Location Sharing</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
      </ScrollView>
    </View>
  );
};

/* ───────────────────────── Styles ───────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 14, paddingBottom: 190, gap: 12 },

  /* nav */
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 40, paddingHorizontal: 14, borderRadius: R.pill,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
  },
  backBtnText: { fontSize: 13, fontWeight: '700', color: C.ink },
  segment: {
    flexDirection: 'row', padding: 4, borderRadius: R.pill,
    backgroundColor: '#EAE4F5',
  },
  segmentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 32, paddingHorizontal: 14, borderRadius: R.pill,
  },
  segmentBtnActive: { backgroundColor: C.brand },
  segmentText: { fontSize: 12, fontWeight: '700', color: C.body },
  segmentTextActive: { color: '#FFFFFF' },

  /* destination card */
  destCard: {
    backgroundColor: C.card, borderRadius: R.xl, padding: 18, gap: 10,
    borderWidth: 1, borderColor: C.line, ...cardShadow,
  },
  destTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  destTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  destTagText: { fontSize: 12, fontWeight: '700', color: C.brandDeep },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.ok },
  orderChip: {
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: R.pill,
    backgroundColor: C.brandSoft,
    maxWidth: '52%',
  },
  orderChipText: { fontSize: 11, fontWeight: '800', color: C.brand },
  destName: { fontSize: 20, fontWeight: '900', color: C.ink, letterSpacing: -0.3 },
  areaSub: { fontSize: 13, color: C.body, lineHeight: 19 },
  destAddressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pinWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center',
  },
  destAddress: { flex: 1, fontSize: 14, lineHeight: 20, color: C.body, paddingTop: 3 },
  navGoogleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1A73E8',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginTop: 12,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  navGoogleBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  distanceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  distanceStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  distanceStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  distanceStatValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  distanceStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  destFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.hairline,
  },
  distPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.hairline,
  },
  distText: { fontSize: 12, fontWeight: '800', color: C.ink },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: R.pill, backgroundColor: C.brandSoft,
  },
  linkBtnText: { fontSize: 12, fontWeight: '800', color: C.brandDeep },

  /* map card */
  mapCard: {
    backgroundColor: C.card, borderRadius: R.xl, padding: 14, gap: 12,
    borderWidth: 1, borderColor: C.line, ...cardShadow,
  },
  mapHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  mapTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mapTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  gpsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, borderWidth: 1,
  },
  gpsOk: { backgroundColor: C.okSoft, borderColor: C.okLine },
  gpsWait: { backgroundColor: C.warnSoft, borderColor: C.warnLine },
  gpsDot: { width: 6, height: 6, borderRadius: 3 },
  gpsText: { fontSize: 11, fontWeight: '800' },
  mapFrame: {
    width: '100%',
    height: 260,
    borderRadius: R.lg,
    overflow: 'hidden',
    backgroundColor: C.night,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: C.night,
  },
  mapContainerSmall: {
    height: 260,
    width: '100%',
  },
  mapContainerFull: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapToggle: {
    position: 'absolute', top: 10, right: 10, flexDirection: 'row',
    padding: 3, borderRadius: R.pill, backgroundColor: 'rgba(15,23,42,0.78)',
  },
  mapToggleBtn: { paddingVertical: 5, paddingHorizontal: 11, borderRadius: R.pill },
  mapToggleBtnActive: { backgroundColor: '#FFFFFF' },
  mapToggleText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },
  mapToggleTextActive: { color: C.ink },
  statStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAF8FE', borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 6,
  },
  statCell: { flex: 1, paddingHorizontal: 8, gap: 3 },
  statDivider: { width: 1, height: 28, backgroundColor: C.line },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.muted },
  statValue: { fontSize: 12, fontWeight: '800', color: C.ink },

  /* radar */
  radarWrapFull: { flex: 1, width: '100%', alignSelf: 'stretch', padding: 6 },
  fsWrap: {
    flex: 1, marginHorizontal: 12, marginTop: 12, marginBottom: 104,
    borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.night,
    borderWidth: 1, borderColor: C.line, ...cardShadow,
  },
  fsBtn: {
    position: 'absolute', top: 10, left: 10, width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
    zIndex: 10,
  },
  myLocationBtn: {
    position: 'absolute', bottom: 12, right: 12, width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.28, shadowRadius: 6, elevation: 5,
    borderWidth: 1.5, borderColor: '#E2E8F0', zIndex: 10,
  },
  myLocationBtnActive: {
    backgroundColor: '#ECFDF5', borderColor: '#10B981',
  },
  radarWrap: { alignItems: 'center', justifyContent: 'center', padding: 10 },
  radarBadge: {
    position: 'absolute', bottom: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: R.pill,
    backgroundColor: 'rgba(15,23,42,0.88)', borderWidth: 1, borderColor: '#334155',
  },
  radarBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  radarBadgeText: { fontSize: 11, fontWeight: '700', color: '#E2E8F0' },
  radarCard: {
    borderRadius: R.xl, overflow: 'hidden', backgroundColor: C.night,
    alignItems: 'center', justifyContent: 'center', ...cardShadow,
  },

  /* instruments */
  hudSection: { gap: 12 },
  meterRow: { flexDirection: 'row', gap: 12 },
  meterCard: {
    flex: 1, backgroundColor: C.card, borderRadius: R.lg, padding: 14, gap: 8,
    borderWidth: 1, borderColor: C.line, ...cardShadow,
  },
  meterHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meterIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  meterLabel: { fontSize: 12, fontWeight: '700', color: C.body },
  meterValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  meterValue: { fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -0.5 },
  meterUnit: { fontSize: 12, fontWeight: '700', color: C.muted },
  meterTrack: { height: 5, borderRadius: 3, backgroundColor: C.hairline, overflow: 'hidden' },
  meterFill: { height: 5, borderRadius: 3 },
  meterCaption: { fontSize: 11, color: C.muted },

  /* delivery list */
  listCard: {
    backgroundColor: C.card, borderRadius: R.xl, padding: 16, gap: 10,
    borderWidth: 1, borderColor: C.line, ...cardShadow,
  },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  listTitle: { fontSize: 15, fontWeight: '800', color: C.ink },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: R.md, backgroundColor: '#FAF8FE',
    borderWidth: 1, borderColor: C.hairline,
  },
  listAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.brandSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  listAvatarText: { fontSize: 15, fontWeight: '900', color: C.brand },
  listBody: { flex: 1, gap: 2 },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listName: { flexShrink: 1, fontSize: 14, fontWeight: '800', color: C.ink },
  listOrderNo: { fontSize: 11, fontWeight: '700', color: C.brand },
  listAddress: { fontSize: 12, color: C.body },
  listRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  listDist: { fontSize: 13, fontWeight: '800', color: C.ok },

  /* actions */
  actions: { gap: 10, marginTop: 8, marginBottom: 16 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 52, borderRadius: R.lg, backgroundColor: C.ok,
    shadowColor: C.ok, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, borderRadius: R.lg, backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.brandLine,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '800', color: C.brandDeep },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 40,
  },
  ghostBtnText: { fontSize: 13, fontWeight: '700', color: C.body },
  sortieSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sortieSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sortieSummaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  sortieBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  sortieBadgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  sortieBadgeReady: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  sortieBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sortieBadgeTextPending: {
    color: '#B45309',
  },
  sortieBadgeTextReady: {
    color: '#047857',
  },
  openSortieBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 8,
  },
  openSortieBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
});