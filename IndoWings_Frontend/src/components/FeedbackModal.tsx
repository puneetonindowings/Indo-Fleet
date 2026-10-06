import React, { useState, useEffect } from 'react';
import { X, Star, Send, CheckCircle2, MessageSquare, Plane, Sparkles, ExternalLink } from 'lucide-react';
import { DeliveryUser } from './AuthModal';
import { API_BASE_URL } from '../config/api';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: DeliveryUser | null;
  prefilledOrder?: any | null;
  onFeedbackSubmitted?: () => void;
  onNavigate?: (page: string) => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  prefilledOrder,
  onFeedbackSubmitted,
  onNavigate
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<string>('Delivery Speed & Precision');
  const [message, setMessage] = useState<string>('');
  const [name, setName] = useState<string>(currentUser?.name || '');
  const [email, setEmail] = useState<string>(currentUser?.email || '');
  const [droneName, setDroneName] = useState<string>('Cyberone Pro');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (prefilledOrder) {
      if (prefilledOrder.drone_model || prefilledOrder.drone_id) {
        setDroneName(prefilledOrder.drone_model || prefilledOrder.drone_id);
      }
      if (prefilledOrder.customer_name) {
        setName(prefilledOrder.customer_name);
      }
      if (prefilledOrder.customer_email) {
        setEmail(prefilledOrder.customer_email);
      }
    } else if (currentUser) {
      if (currentUser.name && !name) setName(currentUser.name);
      if (currentUser.email && !email) setEmail(currentUser.email);
    }
  }, [prefilledOrder, currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please write a brief feedback comment about your flight experience.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/delivery/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: prefilledOrder?.id || undefined,
          user_name: name.trim() || currentUser?.name || 'Verified Customer',
          user_email: email.trim() || currentUser?.email || 'guest@indowings.com',
          drone_name: droneName,
          rating,
          category,
          message: message.trim()
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to record feedback');
      }

      setSubmitted(true);
      if (prefilledOrder?.id) {
        localStorage.setItem(`iw_feedback_submitted_${prefilledOrder.id}`, 'true');
        localStorage.setItem(`iw_feedback_prompted_${prefilledOrder.id}`, 'true');
      }
      onFeedbackSubmitted?.();
    } catch (err: any) {
      setError(err.message || 'Error submitting feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setMessage('');
    setError('');
    onClose();
  };

  const handleGoFeedbackPage = () => {
    handleResetAndClose();
    if (onNavigate) {
      onNavigate('feedback');
      window.history.pushState({}, '', '/feedback');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-slate-800 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#fbf9fe]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3b0080]/10 flex items-center justify-center text-[#3b0080]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#171222]">
                {prefilledOrder ? `Rate Drone Flight #${prefilledOrder.id}` : 'Platform & Flight Feedback'}
              </h2>
              <p className="text-xs text-slate-500">
                {prefilledOrder ? 'Your package has touched down successfully!' : 'Help us refine IndoWings UAV flight systems'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-bold text-[#171222]">Thank You for Your Review!</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Your feedback has been verified and published to the live reviews feed and delivered directly to our dispatch engineers.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleGoFeedbackPage}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Browse All Reviews
              </button>
              <button
                onClick={handleResetAndClose}
                className="px-6 py-2.5 bg-[#3b0080] hover:bg-[#280058] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* If Prefilled from a Completed Order: Show Delivery Success Banner */}
            {prefilledOrder && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Delivery Completed Successfully</p>
                    <p className="text-[11px] text-emerald-700">Order #{prefilledOrder.id} touched down</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#3b0080] bg-white px-2 py-1 rounded-md border border-purple-200">
                  <Plane className="w-3 h-3" />
                  <span>{droneName}</span>
                </div>
              </div>
            )}

            {/* Rating Stars */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Overall Operational Rating *
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        (hoverRating || rating) >= star
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-200'
                      } transition-colors`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-600 ml-2">
                  {rating === 5 ? '5.0 — Exceptional' : rating === 4 ? '4.0 — Good' : rating === 3 ? '3.0 — Average' : 'Needs Improvement'}
                </span>
              </div>
            </div>

            {/* Drone Model Selection (if not fixed) */}
            {!prefilledOrder && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Drone Airframe Model
                </label>
                <select
                  value={droneName}
                  onChange={e => setDroneName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all font-medium"
                >
                  <option value="Cyberone Pro (Medical Transit & Express)">Cyberone Pro (Medical Transit & Express)</option>
                  <option value="Cyberone Max (Heavy Cargo 15kg)">Cyberone Max (Heavy Cargo 15kg)</option>
                  <option value="Cyberone Lite (High-Speed Metro Dispatch)">Cyberone Lite (High-Speed Metro Dispatch)</option>
                  <option value="S-500 Long-Range Logistics UAV">S-500 Long-Range Logistics UAV</option>
                  <option value="E-250 Autonomous Surveillance & Cargo">E-250 Autonomous Surveillance & Cargo</option>
                </select>
              </div>
            )}

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Area of Evaluation
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'Delivery Speed & Precision',
                  'Precision Payload Release',
                  'Real-Time Live Telemetry',
                  'Platform Experience',
                  'Customer Support',
                  'Flight Safety'
                ].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold text-left border transition-all cursor-pointer truncate ${
                      category === cat
                        ? 'border-[#3b0080] bg-purple-50/80 text-[#3b0080]'
                        : 'border-slate-200 hover:border-purple-200 text-slate-600 bg-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Name & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Tell us about your flight experience *
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                placeholder="How was the payload touchdown, corridor speed, or dashboard tracking? Any suggestions?"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#3b0080] focus:bg-white transition-all resize-none font-medium"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleGoFeedbackPage}
                className="text-xs font-bold text-[#3b0080] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all reviews</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2 bg-[#3b0080] hover:bg-[#280058] text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{loading ? 'Submitting...' : 'Submit Review'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
