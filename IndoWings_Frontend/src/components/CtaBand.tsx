import React from 'react';
import { Download, Send } from 'lucide-react';

interface CtaBandProps {
  onOpenCommandCenter?: () => void;
  onOpenDemoBooking?: () => void;
}

export const CtaBand: React.FC<CtaBandProps> = ({ onOpenCommandCenter }) => {
  return (
    <section className="py-12 sm:py-16 bg-[#fbf9fd]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div 
          className="rounded-2xl p-8 sm:p-10 lg:p-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-8 shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #3b0080, #4b128b)',
            boxShadow: '0 18px 48px rgba(59, 0, 128, 0.2)'
          }}
        >
          {/* Left Copy */}
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#dcc4ff] mb-2">
              START WITH THE PRODUCT
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Start with one download center.
            </h2>
            <p className="text-sm sm:text-base text-purple-200/80 leading-relaxed mt-3 max-w-xl">
              It explains the current version, installer, requirements, account access, checksum, and release notes before you install.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3.5 flex-wrap shrink-0">
            <button 
              onClick={onOpenCommandCenter}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#250052] border border-purple-400/30 text-white text-sm font-semibold hover:bg-[#1a003d] transition-all shadow-md active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Get GCS</span>
            </button>

            <a 
              href="#support" 
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-[#171222] text-sm font-semibold hover:bg-slate-100 transition-all shadow-md active:scale-95"
            >
              <Send className="w-4 h-4 text-[#3b0080]" />
              <span>Send feedback</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

