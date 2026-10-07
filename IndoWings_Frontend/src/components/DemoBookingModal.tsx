import React, { useState } from 'react';
import { X, Send, CheckCircle2, Plane } from 'lucide-react';
import { apiClient } from '../api/client';
import PhoneInput from './PhoneInput';

interface DemoBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedDrone?: string;
}

export const DemoBookingModal: React.FC<DemoBookingModalProps> = ({
  isOpen,
  onClose,
  preselectedDrone
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [droneInterest, setDroneInterest] = useState(preselectedDrone || 'Cyberone Pro');
  const [useCase, setUseCase] = useState('Topographic Mapping & GIS');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (preselectedDrone) {
      setDroneInterest(preselectedDrone);
    }
  }, [preselectedDrone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.submitDemoRequest({
        name,
        email,
        phone,
        organization,
        drone_interest: droneInterest,
        use_case: useCase,
        message
      });
      setSubmitted(true);
    } catch (err) {
      alert('Failed to submit demo request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#171222] border border-orange-500/40 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-900/50 bg-black/40">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-slate-900/50 text-orange-300">
              <Plane className="w-5 h-5 text-cyan-400" />
            </span>
            <div>
              <h3 className="text-base font-bold">Book a Live UAV Flight Demonstration</h3>
              <p className="text-[11px] text-slate-400">Direct evaluation with IndoWings Flight Operations Engineers</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <span className="p-4 rounded-full bg-emerald-950 text-emerald-400 inline-block border border-emerald-800 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </span>
              <h4 className="text-xl font-bold">Flight Demo Scheduled!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Your flight demonstration request for <strong>{droneInterest}</strong> has been saved directly to the IndoWings Command Center database. Our technical team from Noida HQ will contact you within 24 hours.
              </p>
              <button 
                onClick={() => { setSubmitted(false); onClose(); }}
                className="mt-4 px-6 py-2.5 rounded-xl bg-[#ef7f1a] hover:bg-[#6d28d9] text-white text-xs font-semibold"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Your Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-slate-900/50 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Corporate Email *</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul@enterprise.com"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-slate-900/50 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Phone / WhatsApp</label>
                  <PhoneInput
                    value={phone}
                    onChange={v => setPhone(v)}
                    placeholder="98765 43210"
                    size="sm"
                    dark
                    inputClassName="rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Organization / Agency</label>
                  <input 
                    type="text" 
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="e.g. State Forestry / Mining"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-slate-900/50 text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Aircraft / System of Interest *</label>
                <select 
                  value={droneInterest}
                  onChange={(e) => setDroneInterest(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#171222] border border-slate-900/50 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="Cyberone Pro">Cyberone Pro (Surveillance & ISR)</option>
                  <option value="Cyberone Max">Cyberone Max (BVLOS & Corridor Mapping)</option>
                  <option value="Cyberone Lite">Cyberone Lite (Rapid Tactical Recon)</option>
                  <option value="S-Series Pro">S-Series Pro (Precision Agriculture 16L)</option>
                  <option value="E-Series Pro">E-Series Pro (Precision Agriculture 10L)</option>
                  <option value="Anti-Drone C-UAS">Ingenious Anti-Drone C-UAS Countermeasure</option>
                  <option value="IndoFly GCS">IndoFly Ground Control Station</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Brief Requirements / Location</label>
                <textarea 
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Specify flight site location, target terrain, or required payload sensors..."
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-slate-900/50 text-white focus:outline-none focus:border-orange-500"
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#ef7f1a] hover:from-[#ef7f1a] hover:to-[#191b30] text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-slate-950/60"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'Submitting to Database...' : 'Register Flight Demo Request'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
