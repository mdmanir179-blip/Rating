import React, { useState } from 'react';
import { Product, PlatformType, OfferBanner } from '../types';
import { useAuth } from '../context/AuthContext';
import { ProductCard } from './ProductCard';
import { OfferBannerCard } from './OfferBannerCard';
import { 
  Sparkles, 
  Crown, 
  Filter, 
  Zap,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

interface TaskQueueProps {
  products: Product[];
  banners: OfferBanner[];
  completedProductIds: Set<string>;
  onRateProduct: (prod: Product) => void;
  onOpenPlans: () => void;
}

export const TaskQueue: React.FC<TaskQueueProps> = ({
  products,
  banners,
  completedProductIds,
  onRateProduct,
  onOpenPlans,
}) => {
  const { userProfile } = useAuth();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | 'all'>('all');

  const isInactive = userProfile?.status === 'inactive';
  const demoCount = userProfile?.demoTasksCompleted || 0;
  const hasActivePlan = userProfile?.activePlan && userProfile.activePlan !== 'none';
  const isDemoLocked = !hasActivePlan && demoCount >= 5;

  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter((p) => {
    if (!p) return false;
    const matchPlatform = selectedPlatform === 'all' || p.platform === selectedPlatform;
    if (!matchPlatform) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  const activeBanners = (banners || []).filter((b) => b && b.active);

  return (
    <div className="space-y-6">
      
      {/* Inactive Account Warning Banner */}
      {isInactive && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Account Deactivated by Administration</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Your reviewer account has been set to inactive status by the platform admin. You are currently restricted from submitting new ratings or requesting wallet payouts. Please contact management support.
            </p>
          </div>
        </div>
      )}

      {/* Demo / Active Plan Status Banner */}
      {!hasActivePlan ? (
        <div className={`p-5 rounded-2xl border transition-all ${
          isDemoLocked 
            ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border-amber-300'
            : 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200'
        }`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isDemoLocked ? 'bg-amber-500 text-white' : 'bg-indigo-600 text-white'
                }`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {isDemoLocked ? 'Demo Completed (5/5)' : `Free Trial Active (${demoCount}/5)`}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Earn ₹20 Per Verified Product
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {isDemoLocked
                  ? 'Great job! You finished 5 test tasks and earned ₹100 in INR.'
                  : `Free Trial Task Queue: ${5 - demoCount} tasks remaining`}
              </h3>

              <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                {isDemoLocked
                  ? 'To unlock unlimited daily tasks across Amazon India, Flipkart, Meesho, Blinkit, Instamart & Zepto, please choose a membership plan.'
                  : 'Test the rating and review system with your first 5 products. Each rating credits ₹20 immediately to your balance.'}
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-md bg-white rounded-full h-2.5 mt-3 border border-slate-200 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${isDemoLocked ? 'bg-amber-500' : 'bg-indigo-600'}`}
                  style={{ width: `${Math.min(100, (demoCount / 5) * 100)}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={onOpenPlans}
              className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 shrink-0 ${
                isDemoLocked
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/25 animate-bounce'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-900" />
              <span>{isDemoLocked ? 'Choose Plan to Continue' : 'Upgrade to Pro'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Active Membership Plan: {userProfile?.activePlan?.replace('_', ' ').toUpperCase()}
              </div>
              <div className="text-xs text-emerald-700">
                Unlimited task stream enabled • Daily batch auto-refreshed (₹20/Task)
              </div>
            </div>
          </div>

          <button
            onClick={onOpenPlans}
            className="text-xs font-bold text-emerald-800 hover:underline px-3 py-1.5"
          >
            Extend Duration
          </button>
        </div>
      )}

      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Filter Tabs by Marketplace */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none max-w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Portal:
          </span>

          {[
            { id: 'all', label: `All Portals (${products.length})` },
            { id: 'amazon', label: 'Amazon India' },
            { id: 'flipkart', label: 'Flipkart' },
            { id: 'meesho', label: 'Meesho' },
            { id: 'blinkit', label: 'Blinkit' },
            { id: 'instamart', label: 'Instamart' },
            { id: 'zepto', label: 'Zepto' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedPlatform(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedPlatform === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Products Grid with Interleaved Offer Banners */}
      {filteredProducts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">No products match your filter or search.</p>
          <button
            onClick={() => {
              setSelectedPlatform('all');
              setSearchQuery('');
            }}
            className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Reset Filters &amp; View All Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((prod, index) => {
            const isDone = completedProductIds.has(prod.id);
            const showBanner = activeBanners.length > 0 && index > 0 && index % 4 === 0;
            const bannerIndex = Math.floor(index / 4);
            const currentBanner = showBanner ? activeBanners[bannerIndex % activeBanners.length] : null;

            return (
              <React.Fragment key={prod.id || index}>
                {currentBanner && (
                  <OfferBannerCard
                    banner={currentBanner}
                    onAction={onOpenPlans}
                  />
                )}
                <ProductCard
                  product={prod}
                  isCompleted={isDone}
                  onRateProduct={() => {
                    if (isInactive) return;
                    if (isDemoLocked) {
                      onOpenPlans();
                    } else {
                      onRateProduct(prod);
                    }
                  }}
                />
              </React.Fragment>
            );
          })}
        </div>
      )}

    </div>
  );
};
