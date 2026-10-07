import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { ErrorEvent as MapLibreErrorEvent, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPinOff } from 'lucide-react';
import { MapDelivery, statusColor, statusLabel } from './analytics';

if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

const MAPTILER_KEY = (import.meta as any).env?.VITE_MAPTILER_KEY as string | undefined;

interface Props {
  deliveries: MapDelivery[];
  center: { lat: number; lng: number };
}

export const LiveDeliveryMap: React.FC<Props> = ({ deliveries, center }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const deliveriesRef = useRef(deliveries);
  deliveriesRef.current = deliveries;
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    const controller = new AbortController();
    let map: MapLibreMap | null = null;

    const plot = async () => {
      if (!map) return;
      const instance = map;
      if (controller.signal.aborted) return;

      // clear previous markers
      markersRef.current.forEach((m) => {
        try {
          m.remove();
        } catch {
          /* noop */
        }
      });
      markersRef.current = [];

      // clear previous route sources/layers
      (instance.getStyle().layers || []).forEach((layer) => {
        if (layer.id.startsWith('route-')) instance.removeLayer(layer.id);
      });
      Object.keys(instance.getStyle().sources || {}).forEach((src) => {
        if (src.startsWith('route-')) instance.removeSource(src);
      });

      const boundsPoints: [number, number][] = [];
      deliveriesRef.current.forEach((d) => {
        const color = statusColor(d.status);
        const route: [number, number][] = [
          [d.source.lng, d.source.lat],
          [d.current.lng, d.current.lat],
          [d.destination.lng, d.destination.lat]
        ];
        route.forEach((p) => boundsPoints.push(p));

        const srcId = `route-${d.order_id}`;
        if (!instance.getSource(srcId)) {
          instance.addSource(srcId, {
            type: 'geojson',
            data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } }
          });
          instance.addLayer({ id: srcId, type: 'line', source: srcId, paint: { 'line-color': color, 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': 0.7 } });
        }

        const popupHtml = `<div style="font-family:ui-sans-serif,system-ui"><strong style="font-size:12px">${d.order_id}</strong><br/><span style="font-size:11px;color:#475569">${d.customer}</span><br/><span style="font-size:11px;font-weight:700;color:${color}">${statusLabel(d.status)}</span></div>`;
        const marker = new maplibregl
          .Marker({ color })
          .setLngLat([d.current.lng, d.current.lat])
          .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(popupHtml))
          .addTo(instance);
        markersRef.current.push(marker);
      });

      if (boundsPoints.length) {
        const bounds = new maplibregl.LngLatBounds(boundsPoints[0], boundsPoints[0]);
        boundsPoints.slice(1).forEach((p) => bounds.extend(p));
        instance.fitBounds(bounds, { padding: 60, maxZoom: 13 });
      }
    };

    // Key-less OpenStreetMap raster style used as a reliable fallback.
    const OSM_STYLE = {
      version: 8 as const,
      sources: {
        osm: {
          type: 'raster' as const,
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors'
        }
      },
      layers: [{ id: 'osm-tiles', type: 'raster' as const, source: 'osm' }]
    };

    const init = async () => {
      if (controller.signal.aborted || !containerRef.current) return;
      const initialStyle = MAPTILER_KEY
        ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${encodeURIComponent(MAPTILER_KEY)}`
        : OSM_STYLE;
      if (!MAPTILER_KEY) setNotice('Using free OpenStreetMap tiles (no MapTiler key configured).');
      map = new maplibregl.Map({
        container: containerRef.current,
        style: initialStyle as any,
        center: [center.lng, center.lat],
        zoom: 11
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

      let fellBack = !MAPTILER_KEY;
      const fallbackToOsm = () => {
        if (fellBack || !map || controller.signal.aborted) return;
        fellBack = true;
        map.setStyle(OSM_STYLE as any);
        setNotice('MapTiler tiles unavailable — switched to free OpenStreetMap tiles.');
        map.once('idle', () => {
          if (controller.signal.aborted || !mapRef.current) return;
          void plot().catch(() => {});
        });
      };

      map.on('load', () => {
        map?.resize();
        void plot().catch((e) => !controller.signal.aborted && setError(e instanceof Error ? e.message : 'Could not plot deliveries.'));
      });
      map.on('error', (event: MapLibreErrorEvent) => {
        if (controller.signal.aborted) return;
        if (event.error) fallbackToOsm();
      });

      // ensure correct sizing even if the container mounts at zero size
      const ro = new ResizeObserver(() => map?.resize());
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;
    };

    void init().catch((e) => !controller.signal.aborted && setError(e instanceof Error ? e.message : 'Could not initialize map.'));

    return () => {
      controller.abort();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map?.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MAPTILER_KEY]);

  if (error) {
    return (
      <div className="h-[380px] rounded-2xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-center p-6 gap-2">
        <MapPinOff className="w-8 h-8 text-slate-400" />
        <p className="text-xs font-bold text-slate-500 max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="h-[380px] w-full rounded-2xl overflow-hidden border border-slate-200" />
      {notice && (
        <div className="absolute top-3 left-3 right-16 bg-amber-50/95 backdrop-blur rounded-lg border border-amber-200 px-3 py-1.5 shadow-sm">
          <p className="text-[11px] font-semibold text-amber-800">{notice}</p>
        </div>
      )}
      {deliveries.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 backdrop-blur rounded-xl border border-slate-200 px-4 py-2 shadow-sm">
            <p className="text-xs font-bold text-slate-500">No active deliveries in this period</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-xl border border-slate-200 px-3 py-2 shadow-sm flex flex-wrap gap-x-3 gap-y-1 max-w-[90%]">
        {['delivered', 'in-flight', 'out-for-delivery', 'delayed', 'on-hold'].map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor(s) }} />
            {statusLabel(s)}
          </span>
        ))}
      </div>
    </div>
  );
};
