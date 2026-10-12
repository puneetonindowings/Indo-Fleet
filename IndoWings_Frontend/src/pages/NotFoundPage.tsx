import React from 'react';
import { Home, Package } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (page: string) => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-24 sm:py-32 bg-[#f8fafc] text-slate-900 font-sans">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Subtle pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-[#5a00b8] text-xs font-bold border border-purple-100">
          <span>Error 404</span>
        </div>

        {/* Big clean number */}
        <h1 className="text-7xl sm:text-8xl font-black text-[#5a00b8] tracking-tight">
          404
        </h1>

        {/* Title & subtitle */}
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Page not found
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved, deleted, or never existed.
          </p>
        </div>

        {/* Simple clean CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#5a00b8] hover:bg-[#460091] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            onClick={() => onNavigate('track')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Package className="w-4 h-4 text-[#5a00b8]" />
            <span>Track Order</span>
          </button>
        </div>

        {/* Simple support note */}
        <div className="pt-6 border-t border-slate-200/60">
          <p className="text-xs text-slate-400">
            Need assistance?{' '}
            <button
              onClick={() => onNavigate('support')}
              className="text-[#5a00b8] font-semibold hover:underline cursor-pointer"
            >
              Contact Support
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
