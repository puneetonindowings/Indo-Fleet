import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle2, ShieldCheck, Send, Search, Filter, ArrowLeft, Plane, Clock, ThumbsUp, Award, Sparkles, ExternalLink, ChevronDown } from 'lucide-react';
import { DeliveryUser } from '../components/AuthModal';
import { API_BASE_URL } from '../config/api';

interface FeedbackItem {
  id: string;
  order_id?: string | null;
  user_name: string;
  user_email?: string;
  drone_name: string;
  rating: number;
  category: string;
  message: string;
  created_at: string;
  verified_order: boolean;
  status?: string;
}

interface FeedbackPageProps {
  onNavigate: (page: string) => void;
  currentUser?: DeliveryUser | null;
}

const DRONE_OPTIONS = [
  'Cyberone Pro (Medical Transit & Express)',
  'Cyberone Max (Heavy Cargo 15kg)',
  'Cyberone Lite (High-Speed Metro Dispatch)',
  'S-500 Long-Range Logistics UAV',
  'E-250 Autonomous Surveillance & Cargo'
];

const CATEGORY_OPTIONS = ['Delivery Speed & Precision', 'Payload Handling & Precision Release', 'Real-Time Live Telemetry & Tracking', 'Platform Experience & UI', 'Flight Safety & Weather Handling'];

export const FeedbackPage: React.FC<FeedbackPageProps> = ({ onNavigate, currentUser }) => {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [droneName, setDroneName] = useState(DRONE_OPTIONS[0]);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [orderId, setOrderId] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch feedbacks from API
  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/delivery/feedbacks`);
      const data = await res.json();
      if (data.success && Array.isArray(data.feedbacks)) {
        setFeedbacks(data.feedbacks);
      }
    } catch (err) {
      console.warn('Could not connect to feedbacks API, using fallback data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();

    // Check URL params for orderId
    const params = new URLSearchParams(window.location.search);
    const qOrderId = params.get('orderId');
    const qDrone = params.get('drone');
    const qName = params.get('name');
    const qEmail = params.get('email');

    if (qOrderId) {
      setOrderId(qOrderId);
      setShowForm(true);
    }
    if (qDrone) setDroneName(qDrone);
    if (qName) setName(qName);
    if (qEmail) setEmail(qEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setSubmitError('Please enter your experience or review comments.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId.trim() || undefined,
          user_name: name.trim() || 'Verified Customer',
          user_email: email.trim() || currentUser?.email || 'guest@indowings.com',
          drone_name: droneName,
          rating,
          category,
          message: message.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');

      setSubmitSuccess(true);
      if (orderId.trim()) {
        localStorage.setItem(`iw_feedback_submitted_${orderId.trim()}`, 'true');
        localStorage.setItem(`iw_feedback_prompted_${orderId.trim()}`, 'true');
      }
      // Reload feedbacks list
      await fetchFeedbacks();
    } catch (err: any) {
      setSubmitError(err.message || 'Could not submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmitSuccess(false);
    setMessage('');
    setOrderId('');
    setShowForm(false);
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (filterRating !== 'all' && f.rating !== filterRating) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (f.user_name || '').toLowerCase().includes(q);
      const matchDrone = (f.drone_name || '').toLowerCase().includes(q);
      const matchMsg = (f.message || '').toLowerCase().includes(q);
      const matchCat = (f.category || '').toLowerCase().includes(q);
      const matchOrder = (f.order_id || '').toLowerCase().includes(q);
      return matchName || matchDrone || matchMsg || matchCat || matchOrder;
    }
    return true;
  });

  const avgRating = feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) / feedbacks.length).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <section className="bg-[#1b0038] text-white pt-28 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center justify-center text-purple-200 mb-6 shadow-inner">
                <MessageSquare className="w-6 h-6" />
              </div>

              <div className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300/90 mb-3">Verified Flight Reviews</div>

              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">Customer & Flight Feedback</h1>

              <p className="text-base sm:text-lg text-purple-100/80 max-w-2xl leading-relaxed">
                Real-time operational reviews, precision payload release evaluations, and verified flight experiences from healthcare providers, enterprise partners, and fleet operations across India.
              </p>
            </div>

            {/* Action Card in Hero */}
            <div className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-6 text-center shrink-0 md:w-80 shadow-2xl">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`w-5 h-5 ${feedbacks.length > 0 && i <= Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-white/25'}`} />
                ))}
              </div>
              <div className="text-4xl font-extrabold text-white font-mono tracking-tight">
                {feedbacks.length > 0 ? avgRating : '0.0'} <span className="text-xl text-purple-200 font-normal">/ 5.0</span>
              </div>
              <p className="text-xs text-purple-200/90 mt-1 mb-4 font-medium">
                {feedbacks.length > 0 ? `Based on ${feedbacks.length} verified mission rating${feedbacks.length > 1 ? 's' : ''}` : 'Live ratings stream when real orders complete'}
              </p>
              <button
                onClick={() => {
                  setShowForm(true);
                  window.scrollTo({ top: 500, behavior: 'smooth' });
                }}
                className="w-full py-3 bg-white hover:bg-purple-50 text-[#3b0080] font-bold text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#3b0080]" />
                <span>Write a Flight Review</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL LIVE STATS BAR ────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="border-r border-slate-100 last:border-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Customer Reviews</span>
            <span className="text-2xl font-extrabold text-[#3b0080] font-mono">{feedbacks.length}</span>
          </div>
          <div className="border-r border-slate-100 last:border-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Average Star Rating</span>
            <span className="text-2xl font-extrabold text-amber-500 font-mono">{feedbacks.length > 0 ? `${avgRating} ★` : '—'}</span>
          </div>
          <div className="border-r border-slate-100 last:border-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">5-Star Missions</span>
            <span className="text-2xl font-extrabold text-emerald-600 font-mono">{feedbacks.filter((f) => Number(f.rating) === 5).length}</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Verified Order Deliveries</span>
            <span className="text-2xl font-extrabold text-purple-700 font-mono">{feedbacks.filter((f) => f.verified_order || f.order_id).length}</span>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ── OPTIONAL INLINE SUBMISSION FORM ──────────────────────────────── */}
        {showForm && (
          <div className="mb-12 bg-white rounded-2xl border-2 border-purple-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="bg-[#fbf9fe] px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#3b0080]/10 text-[#3b0080] flex items-center justify-center">
                  <Star className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#171222]">{orderId ? `Rate Drone Flight for Order #${orderId}` : 'Share Your Flight Experience'}</h3>
                  <p className="text-xs text-slate-500">Your feedback helps our air traffic dispatchers and drone engineers</p>
                </div>
              </div>
              <button onClick={handleResetForm} className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                Close Form
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                </div>
                <h3 className="text-xl font-bold text-[#171222]">Review Published Successfully!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">Thank you! Your flight review has been verified and added to the IndoWings public feedback stream.</p>
                <button onClick={handleResetForm} className="px-6 py-2.5 bg-[#3b0080] hover:bg-[#280058] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer">
                  View My Review
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                {submitError && <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">{submitError}</div>}

                {/* Star Rating Interactive */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Overall Mission Rating *</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star className={`w-8 h-8 ${(hoverRating || rating) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} transition-colors`} />
                      </button>
                    ))}
                    <span className="text-sm font-bold text-slate-700 ml-3">
                      {rating === 5 ? '5.0 — Exceptional Mission' : rating === 4 ? '4.0 — Smooth & Timely Flight' : rating === 3 ? '3.0 — Average Flight' : 'Needs Optimization'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Drone Model */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Autonomous UAV Model *</label>
                    <select
                      value={droneName}
                      onChange={(e) => setDroneName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all"
                    >
                      {DRONE_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Feedback Highlight *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Your Name / Organization</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Order ID (Optional/Prefilled) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Delivery Order ID (Optional for Verified Badge)</label>
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      placeholder="e.g. INW-2026-001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Your Review & Experience *</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the payload transit, flight speed, precision release, or GCS dashboard experience..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#3b0080] hover:bg-[#280058] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Publishing Review...' : 'Publish Feedback'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── FILTER & SEARCH BAR ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          {/* Star Filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterRating('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterRating === 'all' ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Reviews ({feedbacks.length})
            </button>
            <button
              onClick={() => setFilterRating(5)}
              className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterRating === 5 ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>5 Stars</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </button>
            <button
              onClick={() => setFilterRating(4)}
              className={`flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterRating === 4 ? 'bg-[#3b0080] text-white shadow-xs' : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>4 Stars</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drone, customer, topic..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* ── FEEDBACK REVIEWS GRID ────────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-20 text-slate-400">
            <div className="w-10 h-10 border-2 border-[#3b0080] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading live flight reviews...</p>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center max-w-2xl mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#3b0080] flex items-center justify-center mx-auto mb-4 border border-purple-100">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#171222]">{searchQuery || filterRating !== 'all' ? 'No Matching Reviews' : 'No Customer Reviews Yet'}</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 mb-6 leading-relaxed">
              {searchQuery || filterRating !== 'all'
                ? 'No flight reviews matched your filter or search query. Try clearing the filters.'
                : 'All reviews on IndoWings are 100% authentic and submitted by real customers upon order delivery. Reviews will stream here live as delivery missions are completed across India.'}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#3b0080] hover:bg-[#280058] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Share Flight Experience</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFeedbacks.map((fb) => {
              const formattedDate = new Date(fb.created_at).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });

              return (
                <div key={fb.id} className="bg-white rounded-2xl border border-slate-200/90 hover:border-purple-200 hover:shadow-md p-6 flex flex-col justify-between transition-all">
                  <div>
                    {/* Top Row: Rating & Verified Flight Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${star <= fb.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                        ))}
                      </div>

                      {fb.verified_order || fb.order_id ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified Flight</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 font-mono">{formattedDate}</span>
                      )}
                    </div>

                    {/* Drone Model Tag */}
                    <div className="mb-3">
                      <div className="inline-flex items-center gap-1.5 bg-purple-50 text-[#3b0080] border border-purple-100 px-2.5 py-1 rounded-lg text-xs font-bold">
                        <Plane className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{fb.drone_name}</span>
                      </div>
                    </div>

                    {/* Review Message */}
                    <p className="text-slate-700 text-sm leading-relaxed mb-4 italic">"{fb.message}"</p>
                  </div>

                  {/* Bottom Author & Order Info */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#3b0080] text-white text-xs font-bold flex items-center justify-center">{fb.user_name?.[0]?.toUpperCase() || 'U'}</div>
                      <div>
                        <p className="text-xs font-bold text-[#171222] truncate max-w-[140px]">{fb.user_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{fb.category}</p>
                      </div>
                    </div>

                    {fb.order_id && <span className="text-[10px] font-mono text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">#{fb.order_id}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
