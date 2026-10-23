import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPinOff, Layers, ZoomIn, ZoomOut, Navigation } from 'lucide-react';
import { MapDelivery, statusColor, statusLabel } from './analytics';

if (typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
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
      attribution: '© Google Maps'
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
      attribution: '© Google Maps Satellite'
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

interface Props {
  deliveries: MapDelivery[];
  center: { lat: number; lng: number };
}

export const LiveDeliveryMap: React.FC<Props> = ({ deliveries, center }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [error, setError] = useState('');
  const deliveriesRef = useRef(deliveries);
  deliveriesRef.current = deliveries;
  const markersRef = useRef<any[]>([]);

  const plot = () => {
    if (!mapRef.current) return;
    const instance = mapRef.current;

    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {

      }
    });
    markersRef.current = [];

    (instance.getStyle().layers || []).forEach((layer) => {
      if (layer.id.startsWith('route-')) instance.removeLayer(layer.id);
    });
    Object.keys(instance.getStyle().sources || {}).forEach((src) => {
      if (src.startsWith('route-')) instance.removeSource(src);
    });

    const boundsPoints: [number, number][] = [];

    if (deliveriesRef.current.length === 0) {
      const hubHtml = `
        <div style="font-family: Arial, sans-serif; padding: 6px 8px; min-width: 170px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
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
          instance.addLayer({
            id: srcId,
            type: 'line',
            source: srcId,
            paint: { 'line-color': color, 'line-width': 2.5, 'line-dasharray': [2, 2], 'line-opacity': 0.85 }
          });
        }

        const popupHtml = `<div style="font-family:ui-sans-serif,system-ui;padding:4px"><strong style="font-size:12px;color:#0f172a">${d.order_id}</strong><br/><span style="font-size:11px;color:#475569">${d.customer}</span><br/><span style="font-size:11px;font-weight:700;color:${color}">● ${statusLabel(d.status)}</span></div>`;
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

  useEffect(() => {
    if (!containerRef.current) return;
    const controller = new AbortController();

    const activeStyle = mapType === 'satellite' ? GOOGLE_SATELLITE_STYLE : GOOGLE_ROADMAP_STYLE;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: activeStyle as any,
      center: [center.lng, center.lat],
      zoom: 12,
      attributionControl: false
    });
    mapRef.current = map;

    map.on('load', () => {
      map.resize();
      try {
        plot();
      } catch (e: any) {
        if (!controller.signal.aborted) setError(e?.message || 'Could not plot deliveries.');
      }
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    resizeObserverRef.current = ro;

    return () => {
      controller.abort();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleMapType = () => {
    const next = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(next);
    if (mapRef.current) {
      mapRef.current.setStyle((next === 'satellite' ? GOOGLE_SATELLITE_STYLE : GOOGLE_ROADMAP_STYLE) as any);
      mapRef.current.once('idle', () => {
        try {
          plot();
        } catch {

        }
      });
    }
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({ center: [center.lng, center.lat], zoom: 12 });
  };

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


      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-xl border border-slate-200 px-3 py-1.5 shadow-sm flex items-center gap-2 z-10">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[11px] font-bold text-slate-700">
          {deliveries.length > 0 ? `${deliveries.length} Live Aerial Delivery Missions` : 'Central Flight Base Active · Ready for Dispatch'}
        </span>
      </div>


      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleToggleMapType}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-bold shadow-md border border-slate-200 transition-all cursor-pointer backdrop-blur"
          title="Switch Google Maps Style"
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>{mapType === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
        </button>

        <div className="flex flex-col rounded-xl overflow-hidden bg-white/95 shadow-md border border-slate-200 backdrop-blur">
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2 hover:bg-slate-100 text-slate-700 border-b border-slate-100 transition-all cursor-pointer flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleRecenter}
          className="p-2 rounded-xl bg-white/95 hover:bg-white text-blue-600 shadow-md border border-slate-200 transition-all cursor-pointer backdrop-blur flex items-center justify-center"
          title="Recenter Map"
        >
          <Navigation className="w-3.5 h-3.5" />
        </button>
      </div>


      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur rounded-xl border border-slate-200 px-3 py-1.5 shadow-sm flex flex-wrap gap-x-3 gap-y-1 max-w-[70%] z-10">
        {['delivered', 'in-flight', 'out-for-delivery', 'delayed', 'on-hold'].map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor(s) }} />
            {statusLabel(s)}
          </span>
        ))}
      </div>


      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm border border-slate-200 flex items-center gap-1 z-10 select-none">
        <span className="text-[#4285F4] font-black">G</span>
        <span className="text-[#EA4335] font-black">o</span>
        <span className="text-[#FBBC05] font-black">o</span>
        <span className="text-[#4285F4] font-black">g</span>
        <span className="text-[#34A853] font-black">l</span>
        <span className="text-[#EA4335] font-black">e</span>
        <span className="text-slate-600 font-bold ml-0.5">Maps</span>
      </div>
    </div>
  );
};
