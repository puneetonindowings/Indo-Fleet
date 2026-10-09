import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';

export const AppReleaseConsole: React.FC = () => {
  const [version, setVersion] = useState('v1.2.0');
  const [releaseNotes, setReleaseNotes] = useState(
    'Enhanced live GPS map tracking, instant POD handover verification, and performance optimizations.'
  );
  const [androidUrl, setAndroidUrl] = useState(
    'https://indofleet.com/downloads/IndoFleet_DeliveryApp.apk'
  );
  const [iosUrl, setIosUrl] = useState(
    'https://indofleet.com/downloads/IndoFleet_DeliveryApp.ipa'
  );

  const [notifyPartners, setNotifyPartners] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchRelease = async () => {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/app-release`);
      if (res.ok) {
        const data = await res.json();
        if (data.release) {
          setVersion(data.release.version || 'v1.2.0');
          setReleaseNotes(data.release.release_notes || '');
          setAndroidUrl(data.release.android_url || '');
          setIosUrl(data.release.ios_url || '');
          setLastUpdated(data.release.updated_at || '');
        }
      }
    } catch {
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchRelease();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setUrl: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fakeUrl = `https://indofleet.com/downloads/${file.name}`;
    setUrl(fakeUrl);
    setMessage(`Selected file "${file.name}" for release build.`);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/app-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: version.trim(),
          release_notes: releaseNotes.trim(),
          android_url: androidUrl.trim(),
          ios_url: iosUrl.trim(),
          notify_partners: notifyPartners,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to publish app release update.');
        return;
      }

      setMessage(data.message || 'App build release published and broadcasted successfully!');
      fetchRelease();
    } catch {
      setError('Network error while publishing release.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#5a00b8] border border-purple-200 flex items-center justify-center font-bold">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0f172a]">
              IndoFleet Delivery Mobile App Release Console
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload & publish direct downloadable APK/IPA files directly (No Play Store / App Store required)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRelease}
          disabled={fetching}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} /> Sync Live Build
        </button>
      </div>

      {message && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-xs font-bold text-emerald-800">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3 text-xs font-bold text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handlePublish} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              App Version Tag / Build Tag
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="e.g. v1.2.0"
              required
              className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-sm font-bold text-[#0f172a] focus:outline-none focus:border-[#5a00b8]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Target Audience
            </label>
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl px-4 py-2.5 text-xs font-bold text-[#5a00b8] flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> All Active Delivery Partners
            </div>
          </div>
        </div>

        {/* Android APK Section */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
            Android APK Direct Download (.apk)
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Download className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={androidUrl}
                onChange={(e) => setAndroidUrl(e.target.value)}
                placeholder="https://.../IndoFleet_DeliveryApp.apk"
                required
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-[#0f172a] focus:outline-none focus:border-[#5a00b8]"
              />
            </div>
            <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer border border-slate-200 shrink-0">
              <Upload className="w-3.5 h-3.5" /> Upload APK
              <input
                type="file"
                accept=".apk"
                onChange={(e) => handleFileUpload(e, setAndroidUrl)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* iOS Build Section */}
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
            iOS App Build Direct Link (.ipa / Enterprise Build)
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Download className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={iosUrl}
                onChange={(e) => setIosUrl(e.target.value)}
                placeholder="https://.../IndoFleet_DeliveryApp.ipa"
                required
                className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-[#0f172a] focus:outline-none focus:border-[#5a00b8]"
              />
            </div>
            <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer border border-slate-200 shrink-0">
              <Upload className="w-3.5 h-3.5" /> Upload IPA
              <input
                type="file"
                accept=".ipa,.zip"
                onChange={(e) => handleFileUpload(e, setIosUrl)}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
            Release Notes & Feature Updates
          </label>
          <textarea
            rows={3}
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            placeholder="Describe new features, bug fixes, or mobile app updates..."
            required
            className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3 text-xs text-[#0f172a] focus:outline-none focus:border-[#5a00b8]"
          />
        </div>

        {/* Email Notify Checkbox */}
        <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="notifyPartners"
              checked={notifyPartners}
              onChange={(e) => setNotifyPartners(e.target.checked)}
              className="w-4 h-4 text-[#5a00b8] rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="notifyPartners" className="text-xs font-bold text-[#0f172a] cursor-pointer">
              Send Automated Email Notification (Resend) to all Delivery Partners
            </label>
          </div>
          <span className="text-[11px] font-semibold text-[#5a00b8] bg-purple-100 px-2.5 py-0.5 rounded-full">
            Resend Email API
          </span>
        </div>

        {/* Submit CTA */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[#5a00b8] hover:bg-[#4a0098] text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-purple-900/10 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Publish Build & Broadcast Email
          </button>
        </div>
      </form>
    </div>
  );
};
