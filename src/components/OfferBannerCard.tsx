import React from 'react';
import { OfferBanner } from '../types';
import { Sparkles, ArrowRight, Tag } from 'lucide-react';

interface OfferBannerCardProps {
  banner: OfferBanner;
  onAction: () => void;
}

export const OfferBannerCard: React.FC<OfferBannerCardProps> = ({ banner, onAction }) => {
  return (
    <div className="col-span-full my-4 relative rounded-2xl overflow-hidden shadow-lg border border-indigo-200/60 bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 text-white">
      {/* Background illustration / image with overlay */}
      {banner.imageUrl && (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="relative z-10 p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider bg-amber-400 text-slate-950 mb-2.5 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            {banner.badge}
          </div>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            {banner.title}
          </h3>

          <p className="text-xs sm:text-sm text-indigo-100 mt-1.5 leading-relaxed">
            {banner.subtitle}
          </p>
        </div>

        <button
          onClick={onAction}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-400/20 transition-all flex items-center gap-2 active:scale-95 shrink-0"
        >
          <span>{banner.ctaText}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
