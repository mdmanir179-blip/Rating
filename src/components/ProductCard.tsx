import React, { useState } from 'react';
import { Product, PlatformType } from '../types';
import { Star, Sparkles, CheckCircle, ArrowRight, Video, X } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onRateProduct: (product: Product) => void;
  isCompleted?: boolean;
}

export const getPlatformMeta = (platform?: PlatformType) => {
  switch (platform) {
    case 'amazon':
      return {
        name: 'Amazon India',
        bg: 'bg-amber-500/10 text-amber-800 border-amber-500/30',
        badgeBg: 'bg-slate-900 text-amber-400',
        dotColor: 'bg-amber-500',
      };
    case 'flipkart':
      return {
        name: 'Flipkart',
        bg: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
        badgeBg: 'bg-blue-600 text-yellow-300',
        dotColor: 'bg-blue-500',
      };
    case 'meesho':
      return {
        name: 'Meesho',
        bg: 'bg-pink-500/10 text-pink-700 border-pink-500/30',
        badgeBg: 'bg-pink-600 text-white',
        dotColor: 'bg-pink-500',
      };
    case 'blinkit':
      return {
        name: 'Blinkit',
        bg: 'bg-yellow-500/10 text-yellow-800 border-yellow-500/30',
        badgeBg: 'bg-amber-400 text-slate-900',
        dotColor: 'bg-emerald-500',
      };
    case 'instamart':
      return {
        name: 'Instamart',
        bg: 'bg-orange-500/10 text-orange-700 border-orange-500/30',
        badgeBg: 'bg-orange-600 text-white',
        dotColor: 'bg-orange-500',
      };
    case 'zepto':
      return {
        name: 'Zepto',
        bg: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
        badgeBg: 'bg-purple-700 text-fuchsia-300',
        dotColor: 'bg-purple-500',
      };
    default:
      return {
        name: platform || 'Marketplace',
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        badgeBg: 'bg-slate-800 text-white',
        dotColor: 'bg-slate-400',
      };
  }
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, onRateProduct, isCompleted }) => {
  const meta = getPlatformMeta(product.platform);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const priceFormatted = (product.originalPrice ?? 999).toLocaleString('en-IN');
  const reviewsFormatted = (product.totalReviews ?? 100).toLocaleString();
  const rewardVal = product.rewardAmount ?? 20;
  const ratingVal = product.rating ?? 4.8;
  const imageSrc = product.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';

  return (
    <>
      <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden">
        
        {/* Platform & Reward Tag Header */}
        <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
          <img
            src={imageSrc}
            alt={product.title || 'Product'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e: any) => {
              e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80';
            }}
          />

          {/* Platform Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm ${meta.badgeBg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor} animate-pulse`}></span>
              {meta.name}
            </span>

            {/* Video preview badge if product has video */}
            {product.videoUrl && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowVideoModal(true);
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-slate-900/85 hover:bg-slate-900 text-white backdrop-blur-xs transition-colors shadow-sm"
                title="Watch Demo Video"
              >
                <Video className="w-3 h-3 text-red-400" />
                <span>Demo Video</span>
              </button>
            )}
          </div>

          {/* Reward Highlight Badge in INR (₹) */}
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-md shadow-emerald-900/30">
              <Sparkles className="w-3 h-3 text-emerald-200" />
              +₹{rewardVal} REWARD
            </span>
          </div>

          {/* Completed status overlay */}
          {isCompleted && (
            <div className="absolute inset-0 bg-emerald-900/40 backdrop-blur-[2px] flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-700 font-bold text-sm shadow-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Reviewed (+₹{rewardVal})
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-600">{product.category || 'General'}</span>
              <div className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{ratingVal}</span>
                <span className="text-slate-400 text-[11px]">({reviewsFormatted})</span>
              </div>
            </div>

            <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {product.title}
            </h3>

            <p className="text-xs text-slate-500 mt-2 line-clamp-2">
              {product.description || 'Authentic marketplace item ready for quality reviews.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Retail Price (MRP)</div>
              <div className="text-sm font-semibold text-slate-700">
                ₹{priceFormatted}
              </div>
            </div>

            <button
              onClick={() => onRateProduct(product)}
              disabled={isCompleted}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm active:scale-95 ${
                isCompleted
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/25'
              }`}
            >
              {isCompleted ? (
                'Task Completed'
              ) : (
                <>
                  <span>Rate &amp; Earn ₹{rewardVal}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Video Modal Preview if product has video */}
      {showVideoModal && product.videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-400" />
                <span className="text-sm font-bold truncate max-w-md">{product.title}</span>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {product.videoUrl.startsWith('data:video') || product.videoUrl.endsWith('.mp4') || product.videoUrl.endsWith('.webm') ? (
                <video src={product.videoUrl} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <iframe
                  src={product.videoUrl}
                  title={product.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
