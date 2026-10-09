import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  ShieldCheck,
  User,
  Building,
  Truck,
  LogOut,
  Sparkles,
  Info
} from 'lucide-react';
import { DeliveryUser } from '../types';
import { API_BASE_URL } from '../config/api';

interface DeliveryAppPageProps {
  user: DeliveryUser | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

interface AppReleaseInfo {
  version: string;
  release_notes: string;
  android_url: string;
  ios_url: string;
  updated_at: string;
}

export const DeliveryAppPage: React.FC<DeliveryAppPageProps> = ({
  user,
  onLogout,
}) => {
  const [release, setRelease] = useState<AppReleaseInfo>({
    version: 'v1.2.0',
    release_notes: 'Enhanced live GPS map tracking, instant POD handover verification, and performance optimizations.',
    android_url: 'https://indofleet.com/downloads/IndoFleet_DeliveryApp.apk',
    ios_url: 'https://indofleet.com/downloads/IndoFleet_DeliveryApp.ipa',
    updated_at: new Date().toISOString(),
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/delivery/app-release`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.release) {
          setRelease(data.release);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] pt-24 pb-24 sm:pb-20 px-4 sm:px-6 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Welcome Header Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#5a00b8] text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-purple-900/20 shrink-0">
                {(user?.name || 'P')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#0f172a]">
                    Welcome, {user?.name || 'Delivery Partner'}!
                  </h1>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Active Delivery Partner
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  IndoFleet Autonomous Drone Delivery Network
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>

          {/* User Details Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                <User className="w-3.5 h-3.5 text-[#5a00b8]" /> Delivery ID
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#0f172a] truncate">
                {user?.id || 'DLV-PARTNER'}
              </p>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                <Building className="w-3.5 h-3.5 text-[#5a00b8]" /> Base Station
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#0f172a] truncate">
                {user?.station || 'IndoFleet Noida Hub'}
              </p>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5a00b8]" /> License (DL)
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#0f172a] truncate">
                {user?.dl_id || 'DL Verified'}
              </p>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
                <Truck className="w-3.5 h-3.5 text-[#5a00b8]" /> Vehicle ID
              </div>
              <p className="text-xs sm:text-sm font-bold text-[#0f172a] truncate">
                {user?.vehicle_id || 'IndoFleet Van'}
              </p>
            </div>
          </div>
        </div>

        {/* App Download Primary Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-6 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-purple-50 text-[#5a00b8] text-xs font-bold px-3 py-1 rounded-full border border-purple-200 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Direct Mobile App Download
              </div>
              <h2 className="text-2xl font-bold text-[#0f172a]">
                Download IndoFleet Delivery App ({release.version})
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                Direct download build files for Android (.apk) & iOS (.ipa)
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-semibold text-slate-400">Release Build</span>
              <p className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mt-1">
                {release.version} &bull; Verified Build
              </p>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Android Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    APK
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Android 8.0+
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0f172a] mb-1">
                  Android App (.apk)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Direct Android installation package with offline map caching and background GPS telemetry.
                </p>
              </div>

              <a
                href={release.android_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#5a00b8] hover:bg-[#4a0098] text-white font-bold text-sm py-3 px-4 rounded-xl transition-all shadow-md shadow-purple-900/10"
              >
                <Download className="w-4 h-4" /> Download Android APK
              </a>
            </div>

            {/* iOS Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    IPA
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    iOS 14.0+
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0f172a] mb-1">
                  iOS App Build (.ipa)
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Direct iOS installation package for enterprise installation on Apple iOS devices.
                </p>
              </div>

              <a
                href={release.ios_url || '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all shadow-md shadow-slate-900/10"
              >
                <Download className="w-4 h-4" /> Download iOS IPA
              </a>
            </div>
          </div>

          {/* Release Notes */}
          <div className="bg-purple-50/60 border border-purple-100 rounded-xl p-4">
            <h4 className="text-xs font-bold text-[#5a00b8] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Info className="w-4 h-4" /> Latest Version Release Notes ({release.version})
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {release.release_notes}
            </p>
          </div>
        </div>

        {/* Workflow Instructions Notice */}
        <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-[#0f172a] mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#5a00b8]" />
            How Delivery Partner Operations Work
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-4">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#5a00b8] text-xs font-bold flex items-center justify-center mb-2">
                1
              </span>
              <h4 className="text-xs font-bold text-[#0f172a] mb-1">
                Install Mobile App
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Download and install the IndoFleet Delivery App on your mobile phone.
              </p>
            </div>

            <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-4">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#5a00b8] text-xs font-bold flex items-center justify-center mb-2">
                2
              </span>
              <h4 className="text-xs font-bold text-[#0f172a] mb-1">
                Log In on App
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log in using your registered Email/Phone & password on your phone.
              </p>
            </div>

            <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-4">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-[#5a00b8] text-xs font-bold flex items-center justify-center mb-2">
                3
              </span>
              <h4 className="text-xs font-bold text-[#0f172a] mb-1">
                Manage Delivery & POD
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accept deliveries, view live maps, verify OTPs, and capture POD signatures on the app.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
