import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Product, ReviewSubmission } from '../types';
import { useAuth } from '../context/AuthContext';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  X, 
  Star, 
  Sparkles, 
  CheckCircle2, 
  ThumbsUp, 
  Truck, 
  BadgeCheck,
  AlertCircle
} from 'lucide-react';
import { getPlatformMeta } from './ProductCard';

interface ReviewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: (product: Product, rewardEarned: number) => void;
  onOpenPlans: () => void;
}

const QUICK_SUGGESTIONS = [
  'Outstanding build quality, exactly as described on portal!',
  'Super fast doorstep delivery, packaging was pristine.',
  'Great value for money, thoroughly satisfied with everyday performance.',
  'Authentic original item with intact manufacturer seals. 5 stars!',
  'Exceeded expectations in design, battery life and ease of use.',
];

export const ReviewModal: React.FC<ReviewModalProps> = ({
  product,
  isOpen,
  onClose,
  onReviewSubmitted,
  onOpenPlans,
}) => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [rating, setRating] = useState<number>(5);
  const [qualityRating, setQualityRating] = useState<number>(5);
  const [deliveryRating, setDeliveryRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const platformMeta = getPlatformMeta(product.platform);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      setError('You must be signed in to submit a review.');
      return;
    }

    if (userProfile.status === 'inactive') {
      setError('Your reviewer account has been deactivated by the administration. You cannot submit reviews.');
      return;
    }

    if (!reviewText.trim() || reviewText.length < 10) {
      setError('Please provide at least a 10-character genuine feedback.');
      return;
    }

    // Check if demo limit reached and no active plan
    const currentDemoDone = userProfile.demoTasksCompleted || 0;
    const hasActivePlan = userProfile.activePlan && userProfile.activePlan !== 'none';

    if (!hasActivePlan && currentDemoDone >= 5) {
      setError('You have completed your 5 free demo test tasks. Please upgrade to a plan to continue earning.');
      onOpenPlans();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const reviewId = `rev-${Date.now()}-${currentUser.uid.slice(0, 6)}`;
    const rewardEarned = product.rewardAmount || 20;

    const newReview: ReviewSubmission = {
      id: reviewId,
      userId: currentUser.uid,
      userEmail: currentUser.email || 'user@reviewearn.com',
      productId: product.id,
      productTitle: product.title,
      platform: product.platform,
      rating,
      reviewText: reviewText.trim(),
      qualityRating,
      deliveryRating,
      rewardEarned,
      status: 'approved',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Save review in Firestore
      const reviewRef = doc(db, 'reviews', reviewId);
      try {
        await setDoc(reviewRef, newReview);
      } catch (e) {
        console.warn('Firestore setDoc review notice:', e);
      }

      // 2. Update user wallet and stats in INR (₹)
      const userRef = doc(db, 'users', currentUser.uid);
      const newWalletBalance = (userProfile.walletBalance || 0) + rewardEarned;
      const newTotalEarned = (userProfile.totalEarned || 0) + rewardEarned;
      const newCompletedCount = (userProfile.completedTasksCount || 0) + 1;
      const newDemoCompleted = (userProfile.demoTasksCompleted || 0) + 1;

      const updatedFields = {
        walletBalance: newWalletBalance,
        totalEarned: newTotalEarned,
        completedTasksCount: newCompletedCount,
        demoTasksCompleted: newDemoCompleted,
        updatedAt: new Date().toISOString(),
      };

      try {
        await updateDoc(userRef, updatedFields);
      } catch (e) {
        try {
          await setDoc(userRef, updatedFields, { merge: true });
        } catch (inner) {
          console.warn('Firestore user update notice:', inner);
        }
      }

      // 3. Immediately sync local storage session
      if (typeof window !== 'undefined') {
        const mergedProfile = { ...userProfile, ...updatedFields };
        localStorage.setItem('customer_session', JSON.stringify(mergedProfile));
      }

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (err) {
        // ignore confetti errors in restricted sandboxes
      }

      await refreshProfile();
      onReviewSubmitted(product, rewardEarned);
      onClose();

      // If user just finished 5th demo task and has no plan, prompt membership upgrade
      if (!hasActivePlan && newDemoCompleted >= 5) {
        setTimeout(() => {
          onOpenPlans();
        }, 1200);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      // Even if network or Firestore error occurs, complete review locally for customer
      onReviewSubmitted(product, rewardEarned);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${platformMeta.badgeBg}`}>
              {platformMeta.name} Task
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              Earn +₹{product.rewardAmount}
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold leading-snug line-clamp-2">
            {product.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Category: {product.category} • Retail Price: ₹{product.originalPrice.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Overall Star Rating */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              1. Overall Product Rating
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-slate-700">
                {rating === 5 ? '5.0 - Excellent' : rating === 4 ? '4.0 - Good' : `${rating}.0 - Average`}
              </span>
            </div>
          </div>

          {/* 2. Micro metrics: Quality & Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3.5 h-3.5 text-indigo-600" />
                  Item Quality
                </span>
                <span className="text-indigo-600 font-bold">{qualityRating}/5</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setQualityRating(val)}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-colors ${
                      qualityRating === val
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {val}★
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  Delivery &amp; Packaging
                </span>
                <span className="text-emerald-600 font-bold">{deliveryRating}/5</span>
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setDeliveryRating(val)}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg border transition-colors ${
                      deliveryRating === val
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {val}★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Written Review Text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Detailed Review Comments
              </label>
              <span className="text-[11px] text-slate-400">Min 10 characters</span>
            </div>
            <textarea
              required
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe product performance, durability, packaging quality, or your rating experience..."
              className="w-full p-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Quick AI Suggestions Chips */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Templates (Click to insert):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setReviewText(suggestion)}
                  className="text-[11px] text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors text-left"
                >
                  "{suggestion.slice(0, 38)}..."
                </button>
              ))}
            </div>
          </div>

          {/* Reward confirmation box in INR (₹) */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-900">Guaranteed Reward Payout</div>
                <div className="text-[11px] text-emerald-700">Instant credit of ₹20 into your account wallet</div>
              </div>
            </div>
            <span className="text-base font-black text-emerald-700">
              +₹{product.rewardAmount}
            </span>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Recording Verification...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Review &amp; Claim ₹{product.rewardAmount}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
