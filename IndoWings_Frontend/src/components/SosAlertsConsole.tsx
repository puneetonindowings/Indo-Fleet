import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Phone,
  Radio,
  CheckCircle2,
  Clock,
  Battery,
  User,
  Volume2,
  VolumeX,
  RefreshCw,
  ExternalLink,
  Trash2,
  Check,
  Loader2,
  Map,
  Layers,
  Play,
  Pause,
  Navigation,
} from 'lucide-react';

interface SosAlertItem {
  id: string;
  pilot_name: string;
  pilot_phone?: string;
  vehicle_id?: string;
  latitude: number;
  longitude: number;
  battery_pct: number;
  audio_base64?: string | null;
  has_audio?: boolean;
  notes?: string;
  timestamp: string;
  status: 'active' | 'resolved';
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
}

interface SosAlertsConsoleProps {
  alerts: SosAlertItem[];
  onResolve: (id: string, notes?: string) => void;
  onDelete?: (id: string) => void;
  resolvingId: string | null;
  onRefresh: () => void;
}

export const SosAlertsConsole: React.FC<SosAlertsConsoleProps> = ({
  alerts,
  onResolve,
  onDelete,
  resolvingId,
  onRefresh,
}) => {
  const hasActiveInitially = alerts.some((a) => a.status === 'active');
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>(hasActiveInitially ? 'active' : 'all');
  const [resolveModalId, setResolveModalId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState<string>('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<Record<string, 'street' | 'satellite'>>({});
  const [showMap, setShowMap] = useState<Record<string, boolean>>({});

  const activeAlerts = alerts.filter((a) => a.status === 'active');
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved');

  // If new active alert arrives, auto-surface active tab
  useEffect(() => {
    if (activeAlerts.length > 0 && filter === 'resolved') {
      setFilter('active');
    }
  }, [activeAlerts.length]);

  // Priority sorting: Active / Pending emergencies always at top, then newest first
  const sortedAlerts: SosAlertItem[] = useMemo(() => {
    return [...alerts].sort((a: SosAlertItem, b: SosAlertItem) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });
  }, [alerts]);

  const filteredAlerts: SosAlertItem[] = useMemo(() => {
    return sortedAlerts.filter((a: SosAlertItem) => {
      if (filter === 'active') return a.status === 'active';
      if (filter === 'resolved') return a.status === 'resolved';
      return true;
    });
  }, [sortedAlerts, filter]);

  const handleOpenResolveModal = (id: string) => {
    setResolveModalId(id);
    setResolveNotes('Pilot contact verified. Issue resolved.');
  };

  const handleConfirmResolve = () => {
    if (!resolveModalId) return;
    onResolve(resolveModalId, resolveNotes);
    setResolveModalId(null);
    setResolveNotes('');
  };

  // Play Web Audio Beep / Siren Alarm + Voice Dispatch Readout
  const playEmergencyTone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Tone notice:', e);
    }
  };

  const formatAudioUri = (raw?: string | null): string => {
    if (!raw) return '';
    if (raw.startsWith('data:audio') || raw.startsWith('blob:') || raw.startsWith('http')) {
      return raw;
    }
    // Default to mp4 audio data URI for expo-audio recorded blobs
    return `data:audio/mp4;base64,${raw}`;
  };

  // Text-to-Speech Voice Dispatch Readout
  const handlePlayVoiceDispatch = (alert: SosAlertItem) => {
    playEmergencyTone();

    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (speakingId === alert.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const text = `Emergency beacon alert from pilot ${alert.pilot_name}. Vehicle ID: ${alert.vehicle_id || 'UAV SYS'}. Battery level: ${alert.battery_pct} percent. Live coordinates: ${alert.latitude.toFixed(4)} North, ${alert.longitude.toFixed(4)} East. Notes: ${alert.notes || 'Distress beacon activated'}.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Prevent garbage collection bug in Chrome
    (window as any)._activeSosUtterance = utterance;

    utterance.onstart = () => setSpeakingId(alert.id);
    utterance.onend = () => {
      setSpeakingId(null);
      (window as any)._activeSosUtterance = null;
    };
    utterance.onerror = () => {
      setSpeakingId(null);
      (window as any)._activeSosUtterance = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleMapLayer = (alertId: string) => {
    setMapLayer((prev) => ({
      ...prev,
      [alertId]: prev[alertId] === 'satellite' ? 'street' : 'satellite',
    }));
  };

  const toggleMapVisibility = (alertId: string) => {
    setShowMap((prev) => ({
      ...prev,
      [alertId]: prev[alertId] === undefined ? false : !prev[alertId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER & STATS ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-xs shrink-0 ${
                activeAlerts.length > 0
                  ? 'bg-red-50 text-red-600 ring-2 ring-red-200 animate-pulse'
                  : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              {activeAlerts.length > 0 ? (
                <ShieldAlert className="w-6 h-6 text-red-600" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  SOS Emergency Response Console
                </h2>
                {activeAlerts.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                    {activeAlerts.length} Active Signal{activeAlerts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time pilot distress beacon monitoring, live interactive GPS telemetry map, and audio logs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Telemetry</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Beacons</p>
            <p className="text-xl font-black text-slate-900 mt-1">{alerts.length}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-red-50/70 border border-red-100">
            <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Active Emergencies</p>
            <p className="text-xl font-black text-red-700 mt-1">{activeAlerts.length}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Resolved</p>
            <p className="text-xl font-black text-emerald-700 mt-1">{resolvedAlerts.length}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100">
            <p className="text-[11px] font-bold text-[#5a00b8] uppercase tracking-wider">Command Status</p>
            <p className="text-sm font-black text-[#5a00b8] mt-1.5">
              {activeAlerts.length > 0 ? '🚨 HIGH ALERT' : '✅ ALL NOMINAL'}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              filter === 'active'
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {activeAlerts.length > 0 && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
            <span>Active Emergencies ({activeAlerts.length})</span>
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-[#5a00b8] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Signals ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'resolved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Resolved ({resolvedAlerts.length})
          </button>
        </div>
      </div>

      {/* ── ALERTS LIST ────────────────────────────────────────────── */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
          <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-900">No SOS Alerts Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {filter === 'active'
              ? 'No active distress signals. All couriers and delivery drones are operating nominally.'
              : 'No SOS beacon records matching the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert: SosAlertItem) => {
            const isActive = alert.status === 'active';
            const isMapOpen = showMap[alert.id] !== false; // Open by default
            const currentLayer = mapLayer[alert.id] || 'street';
            const isSpeaking = speakingId === alert.id;

            const mapUrl =
              currentLayer === 'satellite'
                ? `https://maps.google.com/maps?q=${alert.latitude},${alert.longitude}&t=k&z=17&output=embed`
                : `https://maps.google.com/maps?q=${alert.latitude},${alert.longitude}&z=16&output=embed`;

            return (
              <div
                key={alert.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 shadow-xs border-2 transition-all ${
                  isActive
                    ? 'border-red-400 bg-red-50/15 shadow-red-500/5 ring-4 ring-red-100/50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isActive ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">{alert.id}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isActive
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isActive ? '🚨 ACTIVE DISTRESS SIGNAL' : '✅ RESOLVED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Transmitted: {new Date(alert.timestamp).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {alert.pilot_phone && (
                      <a
                        href={`tel:${alert.pilot_phone}`}
                        className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#5a00b8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call Pilot</span>
                      </a>
                    )}

                    <button
                      onClick={() => toggleMapVisibility(alert.id)}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>{isMapOpen ? 'Hide Map' : 'View Live Map'}</span>
                    </button>

                    {alert.latitude && alert.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-red-600" />
                        <span>Google Maps</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}

                    {isActive && (
                      <button
                        onClick={() => handleOpenResolveModal(alert.id)}
                        disabled={resolvingId === alert.id}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {resolvingId === alert.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Acknowledge & Resolve</span>
                      </button>
                    )}

                    {onDelete && !isActive && (
                      <button
                        onClick={() => onDelete(alert.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <User className="w-3 h-3" /> Pilot Contact
                    </p>
                    <p className="text-xs font-black text-slate-900 mt-1">{alert.pilot_name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{alert.pilot_phone || 'No phone recorded'}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Radio className="w-3 h-3" /> Vehicle / Telemetry
                    </p>
                    <p className="text-xs font-black text-slate-900 mt-1">{alert.vehicle_id || 'UAV-SYS'}</p>
                    <p className="text-[11px] font-semibold text-slate-600 mt-0.5 flex items-center gap-1">
                      <Battery className="w-3 h-3 text-emerald-600" />
                      <span>Battery: {alert.battery_pct}%</span>
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Live GPS Fix
                    </p>
                    <p className="text-xs font-black text-slate-900 mt-1">
                      {Number(alert.latitude).toFixed(4)}° N, {Number(alert.longitude).toFixed(4)}° E
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">High precision GPS fix</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> Audio / Voice Note
                    </p>
                    <p className="text-xs font-black text-slate-900 mt-1">
                      {alert.has_audio || alert.audio_base64 ? 'Mic Audio Captured' : 'Ambient Voice Readout Ready'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">1-Min Ambient Mic Feed</p>
                  </div>
                </div>

                {/* ── REAL-TIME INTERACTIVE DRIVER MAP ───────────────────────── */}
                {isMapOpen && alert.latitude && alert.longitude && (
                  <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 shadow-xs relative bg-slate-900">
                    <div className="h-64 sm:h-72 w-full">
                      <iframe
                        title={`Live Map for ${alert.pilot_name}`}
                        src={mapUrl}
                        className="w-full h-full border-none"
                        loading="lazy"
                      />
                    </div>

                    {/* Floating Map Overlay Badge */}
                    <div className="absolute top-3 left-3 bg-slate-900/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-2 shadow-lg">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span>
                        Live Driver: {alert.pilot_name} ({Number(alert.latitude).toFixed(5)}, {Number(alert.longitude).toFixed(5)})
                      </span>
                    </div>

                    {/* Layer Switcher */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/95 rounded-xl p-1 shadow-md border border-slate-200">
                      <button
                        onClick={() => toggleMapLayer(alert.id)}
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                          currentLayer === 'street'
                            ? 'bg-[#5a00b8] text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Street
                      </button>
                      <button
                        onClick={() => toggleMapLayer(alert.id)}
                        className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all ${
                          currentLayer === 'satellite'
                            ? 'bg-[#5a00b8] text-white shadow-xs'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Satellite
                      </button>
                    </div>
                  </div>
                )}

                {/* ── AUDIO VOICE NOTE PLAYER & AI VOICE DISPATCH ─────────────── */}
                <div className="mt-3.5 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSpeaking ? 'bg-red-600 text-white animate-pulse' : 'bg-purple-200 text-[#5a00b8]'
                    }`}>
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">
                        {alert.audio_base64 ? 'Recorded Pilot Audio Feed' : 'Emergency Voice Dispatch Readout'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {alert.audio_base64 ? 'Play captured microphone audio' : 'Automated audio readout of distress signal & coordinates'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    {alert.audio_base64 && (
                      <audio
                        controls
                        src={formatAudioUri(alert.audio_base64)}
                        className="w-full sm:w-56 h-8 accent-[#5a00b8]"
                      />
                    )}
                    <button
                      onClick={() => handlePlayVoiceDispatch(alert)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSpeaking
                          ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                          : 'bg-[#5a00b8] hover:bg-[#480094] text-white shadow-md shadow-purple-500/20'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <Pause className="w-3.5 h-3.5" />
                          <span>Stop Readout</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Voice Dispatch</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Notes & Resolution details */}
                {alert.notes && (
                  <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                    <span className="font-bold text-slate-900">Pilot Distress Note: </span>
                    <span className="italic">{alert.notes}</span>
                  </div>
                )}

                {!isActive && (
                  <div className="mt-3.5 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between flex-wrap gap-2 text-xs text-emerald-800">
                    <div>
                      <span className="font-bold">Resolved by: </span>
                      <span>{alert.resolved_by || 'Operations Administrator'}</span>
                      {alert.resolved_at && (
                        <span className="text-emerald-700/80 ml-2">
                          ({new Date(alert.resolved_at).toLocaleString()})
                        </span>
                      )}
                    </div>
                    {alert.resolution_notes && (
                      <span className="italic font-medium">{alert.resolution_notes}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── RESOLVE MODAL ────────────────────────────────────────── */}
      {resolveModalId && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setResolveModalId(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Resolve Emergency Beacon</h3>
                <p className="text-xs text-slate-500">Record resolution actions taken by command ops</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Resolution Notes</label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#5a00b8] outline-hidden resize-none"
                placeholder="Enter actions taken (e.g., Pilot called, UAV returned to station safe)..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setResolveModalId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmResolve}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
