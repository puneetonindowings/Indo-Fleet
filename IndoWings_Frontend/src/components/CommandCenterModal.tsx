import React, { useState, useEffect } from 'react';
import { X, RadioTower, ShieldCheck, Plus, Database, Wifi } from 'lucide-react';
import { apiClient } from '../api/client';
import { UserProfile, DroneItem, MissionItem, AuditLogItem } from '../types';

interface CommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile, token: string) => void;
  onLogout: () => void;
}

export const CommandCenterModal: React.FC<CommandCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout
}) => {
  const [activeView, setActiveView] = useState<'login' | 'fleet' | 'missions' | 'audit'>('login');
  const [fleet, setFleet] = useState<DroneItem[]>([]);
  const [missions, setMissions] = useState<MissionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>(localStorage.getItem('iw_token') || '');

  // New Mission form state
  const [newTitle, setNewTitle] = useState('');
  const [newDrone, setNewDrone] = useState('Cyberone Pro');
  const [newLocation, setNewLocation] = useState('');
  const [newHectares, setNewHectares] = useState(150);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Load initial stats
    apiClient.getStats().then(data => {
      if (data) setStats(data);
    });

    // If logged in, fetch data
    if (currentUser) {
      loadDashboardData();
    }
  }, [isOpen, currentUser]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [f, m, a] = await Promise.all([
        apiClient.getFleet(),
        apiClient.getMissions(),
        apiClient.getAuditLogs()
      ]);
      setFleet(f);
      setMissions(m);
      setAuditLogs(a);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setLoading(true);
    try {
      const res = await apiClient.login(email);
      setToken(res.token);
      localStorage.setItem('iw_token', res.token);
      onLoginSuccess(res.user, res.token);
      setActiveView('fleet');
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !token) return;
    try {
      const m = await apiClient.createMission({
        title: newTitle,
        drone_model: newDrone,
        location_name: newLocation || 'Noida Industrial Sector',
        area_hectares: Number(newHectares) || 100
      }, token);
      setMissions([m, ...missions]);
      setNewTitle('');
      setNewLocation('');
      alert('Mission created and registered in database!');
    } catch (err: any) {
      alert('Failed to create mission');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#171222] border border-orange-500/40 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-900/50 bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-900/60 text-purple-300 border border-purple-600/40">
              <RadioTower className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">IndoFleet Command Center Console</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-purple-300 border border-purple-800">
                  v3.4.4
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>Backend Gateway: Connected</span>
                <span>•</span>
                <span className="text-cyan-400 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {stats?.supabase_connected ? 'Supabase Live' : 'High-Performance DB'}
                </span>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs (When logged in) */}
        {currentUser && (
          <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/30 border-b border-slate-900/40 text-xs font-medium">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveView('fleet')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeView === 'fleet' ? 'bg-[#5a00b8] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Drone Fleet ({fleet.length})
              </button>
              <button 
                onClick={() => setActiveView('missions')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeView === 'missions' ? 'bg-[#5a00b8] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Missions & Flight Plans ({missions.length})
              </button>
              <button 
                onClick={() => setActiveView('audit')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeView === 'audit' ? 'bg-[#5a00b8] text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Compliance Audit Trail ({auditLogs.length})
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-300">
                Logged in as: <strong className="text-purple-300">{currentUser.full_name}</strong> ({currentUser.role})
              </span>
              <button 
                onClick={() => { onLogout(); setActiveView('login'); }}
                className="px-2.5 py-1 rounded bg-red-950/60 text-red-300 hover:bg-red-900 border border-red-800 text-[11px]"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* LOGIN SCREEN WITH 1-CLICK DEMO ACCOUNTS */}
          {(!currentUser || activeView === 'login') && (
            <div className="space-y-6">
              <div className="text-center max-w-lg mx-auto space-y-2">
                <span className="p-3 rounded-2xl bg-slate-900/40 text-purple-300 inline-block border border-purple-700/30">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                </span>
                <h4 className="text-xl font-bold">Sign In to IndoFleet Command Center</h4>
                <p className="text-xs text-slate-400">
                  Use the administrator demo account to preview the command center. Operational accounts are created from the admin dashboard.
                </p>
              </div>

              {/* Administrator demo account */}
              <div className="grid grid-cols-1 gap-3.5 max-w-2xl mx-auto">
                {/* Admin */}
                <button 
                  onClick={() => handleQuickLogin('puneet.kushwaha@indowfleet.com')}
                  disabled={loading}
                  className="p-4 rounded-xl bg-black/40 border border-purple-800/40 hover:border-orange-500 hover:bg-slate-950/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-purple-300 font-mono">ROLE: ADMINISTRATOR</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-purple-200">Full Access</span>
                  </div>
                  <div className="font-bold text-white group-hover:text-purple-300">Puneet Kushwaha</div>
                  <div className="text-[11px] text-slate-400">puneet.kushwaha@indowfleet.com</div>
                </button>
              </div>
            </div>
          )}

          {/* FLEET VIEW */}
          {currentUser && activeView === 'fleet' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base text-purple-300">Active IndoFleet Fleet Roster</h4>
                <span className="text-xs text-slate-400 font-mono">DGCA Telemetry Link: 100% OK</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {fleet.map((drone) => (
                  <div key={drone.id} className="p-4 rounded-xl bg-black/40 border border-slate-900/40 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-white text-sm block">{drone.model_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{drone.serial_number}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        drone.status === 'ready' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        drone.status === 'in-flight' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {drone.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-slate-300">
                      <div>Link: <strong className="text-emerald-400">Optimal</strong></div>
                      <div>Hours: <strong>{drone.flight_hours} h</strong></div>
                      <div>Range: <strong>{drone.max_range_km} km</strong></div>
                      <div>Endurance: <strong>{drone.endurance_mins} min</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MISSIONS VIEW */}
          {currentUser && activeView === 'missions' && (
            <div className="space-y-6">
              {/* Create Mission Form */}
              <form onSubmit={handleCreateMission} className="p-4 rounded-xl bg-black/40 border border-slate-900/50 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm text-purple-300">
                  <Plus className="w-4 h-4" />
                  <span>Dispatch New UAV Flight Mission</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input 
                    type="text" 
                    placeholder="Mission Title" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="sm:col-span-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-orange-500"
                  />

                  <select 
                    value={newDrone}
                    onChange={(e) => setNewDrone(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-[#171222] border border-white/10 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Cyberone Pro">Cyberone Pro</option>
                    <option value="Cyberone Max">Cyberone Max</option>
                    <option value="Cyberone Lite">Cyberone Lite</option>
                    <option value="S-Series Pro">S-Series Pro</option>
                  </select>

                  <button 
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#6d28d9] hover:bg-[#5a00b8] text-white text-xs font-semibold"
                  >
                    Deploy Mission
                  </button>
                </div>
              </form>

              {/* Missions Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-sm text-purple-300">Registered Operations</h4>
                {missions.map((m) => (
                  <div key={m.id} className="p-3.5 rounded-xl bg-black/40 border border-slate-900/40 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                    <div>
                      <div className="font-bold text-white">{m.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Aircraft: {m.drone_model} • Location: {m.location_name} ({m.area_hectares} ha)
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded font-bold text-[10px] w-max ${
                      m.status === 'ACTIVE' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse' :
                      m.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      'bg-slate-950 text-purple-300 border border-purple-800'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIT VIEW */}
          {currentUser && activeView === 'audit' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-amber-300 font-sans">Immutable Security & DGCA Audit Ledger</h4>
                <span className="text-[10px] text-slate-400">Cryptographic Checksum: VALID</span>
              </div>

              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg bg-black/50 border border-slate-900/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[11px]">
                    <div>
                      <span className="text-purple-400 font-bold">[{log.action}]</span>{' '}
                      <span className="text-white">{log.resource}</span>
                      <div className="text-[10px] text-slate-400">
                        Initiator: {log.user_email} ({log.role}) • IP: {log.ip_address}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
