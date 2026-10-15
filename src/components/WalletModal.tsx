import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ReviewSubmission, WithdrawalRequest } from '../types';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  X, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Send
} from 'lucide-react';
import { getPlatformMeta } from './ProductCard';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlans: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose, onOpenPlans }) => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'withdraw' | 'history'>('overview');
  const [reviews, setReviews] = useState<ReviewSubmission[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Withdraw form state in INR
  const [withdrawAmount, setWithdrawAmount] = useState<number>(100);
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'phonepe' | 'gpay' | 'paytm' | 'bank_transfer' | 'imps'>('upi');
  const [accountDetails, setAccountDetails] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Load reviews and withdrawal records
  useEffect(() => {
    if (!isOpen || !currentUser) return;

    const loadData = async () => {
      setLoadingHistory(true);
      try {
        // 1. Fetch user reviews
        const qRev = query(collection(db, 'reviews'), where('userId', '==', currentUser.uid));
        const revSnap = await getDocs(qRev);
        const revList = revSnap.docs.map((d) => d.data() as ReviewSubmission);
        setReviews(revList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        // 2. Fetch user withdrawals
        const qWith = query(collection(db, 'withdrawals'), where('userId', '==', currentUser.uid));
        const withSnap = await getDocs(qWith);
        const withList = withSnap.docs.map((d) => d.data() as WithdrawalRequest);
        setWithdrawals(withList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      } catch (err) {
        console.error('Error fetching wallet activity:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadData();
  }, [isOpen, currentUser]);

  if (!isOpen || !userProfile) return null;

  const currentBalance = userProfile.walletBalance || 0;
  const totalEarned = userProfile.totalEarned || 0;
  const completedTasks = userProfile.completedTasksCount || 0;

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (userProfile.status === 'inactive') {
      setWithdrawError('Your reviewer account has been deactivated by the administration. Payouts are suspended.');
      return;
    }

    if (withdrawAmount < 100) {
      setWithdrawError('Minimum withdrawal amount is ₹100.');
      return;
    }

    if (withdrawAmount > currentBalance) {
      setWithdrawError(`Insufficient balance! Your current wallet balance is ₹${currentBalance}.`);
      return;
    }

    if (!accountDetails.trim()) {
      setWithdrawError('Please enter your receiving UPI ID (e.g. mobile@upi) or Bank A/C details.');
      return;
    }

    setIsSubmittingWithdraw(true);
    setWithdrawError(null);

    const withdrawalId = `wdr-${Date.now()}-${currentUser.uid.slice(0, 5)}`;
    const newRequest: WithdrawalRequest = {
      id: withdrawalId,
      userId: currentUser.uid,
      userEmail: currentUser.email || 'user@reviewearn.com',
      amount: withdrawAmount,
      method: withdrawMethod,
      accountDetails: accountDetails.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      // 1. Save withdrawal request
      await setDoc(doc(db, 'withdrawals', withdrawalId), newRequest);

      // 2. Deduct from balance
      const newBal = currentBalance - withdrawAmount;
      await updateDoc(doc(db, 'users', currentUser.uid), {
        walletBalance: newBal,
        updatedAt: new Date().toISOString(),
      });

      setWithdrawMessage(`Payout request of ₹${withdrawAmount} submitted via ${withdrawMethod.toUpperCase()}. Destination: ${accountDetails}!`);
      setWithdrawals((prev) => [newRequest, ...prev]);
      setAccountDetails('');
      await refreshProfile();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `withdrawals/${withdrawalId}`);
      setWithdrawError('Failed to process withdrawal request.');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Earnings Wallet (INR ₹)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time balance, verified task earnings history, and instant UPI / IMPS cashouts.
          </p>

          {/* Balance highlights in INR (₹) */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Available</div>
              <div className="text-lg sm:text-2xl font-black text-emerald-400">₹{currentBalance.toLocaleString('en-IN')}</div>
            </div>

            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Total Earned</div>
              <div className="text-lg sm:text-2xl font-black text-indigo-300">₹{totalEarned.toLocaleString('en-IN')}</div>
            </div>

            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Tasks Completed</div>
              <div className="text-lg sm:text-2xl font-black text-amber-300">{completedTasks}</div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-200 text-xs sm:text-sm font-semibold bg-slate-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Account Status
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'withdraw'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Cashout / Withdraw
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-center transition-colors border-b-2 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            History &amp; Logs
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Current Membership</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {userProfile.activePlan && userProfile.activePlan !== 'none'
                      ? userProfile.activePlan.replace('_', ' ').toUpperCase()
                      : 'Free Trial (5 Demo Tasks)'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Demo tasks completed: <span className="font-semibold text-slate-800">{userProfile.demoTasksCompleted || 0} / 5</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onOpenPlans();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upgrade Membership</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900">Per Review Commission Rate</div>
                  <div className="text-xs text-emerald-700">Every valid review credits ₹20 directly to wallet</div>
                </div>
                <span className="text-xl font-black text-emerald-700">₹20 / Task</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-white">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Indian Payout &amp; Cashout Policy</h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Minimum cashout amount: ₹100 (achievable right after completing the 5 demo tasks).</li>
                  <li>Supported gateways: BHIM UPI, PhonePe, Google Pay, Paytm, and IMPS / NEFT Bank Transfer.</li>
                  <li>Processing timeframe: 15 minutes to 2 hours with instant confirmation.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: WITHDRAW */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {withdrawMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{withdrawMessage}</span>
                </div>
              )}

              {withdrawError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{withdrawError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Indian Payout Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'upi', name: 'BHIM UPI' },
                    { id: 'phonepe', name: 'PhonePe' },
                    { id: 'gpay', name: 'Google Pay' },
                    { id: 'paytm', name: 'Paytm Wallet/UPI' },
                    { id: 'imps', name: 'IMPS Quick Transfer' },
                    { id: 'bank_transfer', name: 'Bank Account' },
                  ].map((gw) => (
                    <button
                      key={gw.id}
                      type="button"
                      onClick={() => setWithdrawMethod(gw.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                        withdrawMethod === gw.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {gw.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Withdrawal Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min={100}
                    max={currentBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                  <span>Available Balance: ₹{currentBalance}</span>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(currentBalance)}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Withdraw All
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Recipient UPI ID / Mobile / Bank Account Details
                </label>
                <input
                  type="text"
                  required
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  placeholder={
                    withdrawMethod === 'bank_transfer' || withdrawMethod === 'imps'
                      ? 'A/C Number, IFSC Code & Account Holder Name'
                      : 'e.g. 9876543210@paytm or rahul@okaxis'
                  }
                  className="w-full p-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingWithdraw || currentBalance < 100}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingWithdraw ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Request Payout (₹{withdrawAmount})</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading your activity history...</div>
              ) : (
                <>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Recent Product Reviews &amp; Earnings ({reviews.length})
                    </h4>
                    {reviews.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">
                        No reviews submitted yet. Rate your first product from the task queue to earn ₹20!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reviews.slice(0, 8).map((rev) => {
                          const meta = getPlatformMeta(rev.platform);
                          return (
                            <div key={rev.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badgeBg}`}>
                                    {meta.name}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-900 line-clamp-1 max-w-[200px] sm:max-w-xs">
                                    {rev.productTitle}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {new Date(rev.createdAt).toLocaleDateString()} • {rev.rating}★ Review
                                </div>
                              </div>
                              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                                +₹{rev.rewardEarned}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Withdrawal Requests ({withdrawals.length})
                    </h4>
                    {withdrawals.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 text-center text-xs text-slate-500">
                        No cashouts requested yet.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {withdrawals.map((w) => (
                          <div key={w.id} className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                ₹{w.amount} via {w.method.toUpperCase()}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {w.accountDetails}
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                w.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : w.status === 'rejected'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {w.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
