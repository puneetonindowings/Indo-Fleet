import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { ErrorEvent as MapLibreErrorEvent, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPinOff } from 'lucide-react';
import { MapDelivery, statusColor, statusLabel } from './analytics';

if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

const GOOGLE_MAPS_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface Props {
  deliveries: MapDelivery[];
  center: { lat: number; lng: number };
}

export const LiveDeliveryMap: React.FC<Props> = ({ deliveries, center }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [error, setError] = useState('');
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

      if (deliveriesRef.current.length === 0) {
        // Plot IndoFleet Central Logistics Operations Base
        const hubHtml = `
          <div style="font-family: Arial, sans-serif; padding: 6px 8px; min-width: 160px;">
            <div style="display: flex; items-center: center; gap: 6px; margin-bottom: 4px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
              <strong style="font-size: 12px; color: #5a00b8;">IndoFleet Operations Base</strong>
            </div>
            <p style="font-size: 11px; color: #475569; margin: 0;">Central Dispatch &amp; Flight Hub</p>
            <p style="font-size: 10px; color: #10b981; font-weight: bold; margin: 4px 0 0 0;">● Status: 1,000 UAVs Ready in Stock</p>
          </div>
        `;
        const hubMarker = new maplibregl.Marker({ color: '#5a00b8' })
          .setLngLat([center.lng, center.lat])
          .setPopup(new maplibregl.Popup({ offset: 20 }).setHTML(hubHtml))
          .addTo(instance);
        markersRef.current.push(hubMarker);
      } else {
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

    const GOOGLE_STYLE = GOOGLE_MAPS_KEY ? {
      version: 8,
      sources: {
        'google-maps': {
          type: 'raster' as const,
          tiles: [
            `https://mt0.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${encodeURIComponent(GOOGLE_MAPS_KEY)}`,
            `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${encodeURIComponent(GOOGLE_MAPS_KEY)}`,
            `https://mt2.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${encodeURIComponent(GOOGLE_MAPS_KEY)}`,
            `https://mt3.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${encodeURIComponent(GOOGLE_MAPS_KEY)}`
          ],
          tileSize: 256,
          attribution: '© Google Maps'
        }
      },
      layers: [{ id: 'google-tiles', type: 'raster' as const, source: 'google-maps' }]
    } : null;

    const init = async () => {
      if (controller.signal.aborted || !containerRef.current) return;
      const initialStyle = GOOGLE_STYLE || OSM_STYLE;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: initialStyle as any,
        center: [center.lng, center.lat],
        zoom: 12
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');

      let fellBack = !GOOGLE_MAPS_KEY;
      const fallbackToOsm = () => {
        if (fellBack || !map || controller.signal.aborted) return;
        fellBack = true;
        map.setStyle(OSM_STYLE as any);
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
  }, [GOOGLE_MAPS_KEY]);

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
      
      {/* Top Status Pill */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl border border-slate-200 px-3 py-1.5 shadow-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-bold text-slate-700">
          {deliveries.length > 0 ? `${deliveries.length} Live Aerial Delivery Missions` : 'Central Flight Base Active · Ready for Dispatch'}
        </span>
      </div>

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
