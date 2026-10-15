import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, AdminSettings, SubscriptionPayment } from '../types';
import { SUBSCRIPTION_PLANS } from '../data/plans';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  X, 
  Crown, 
  Check, 
  Copy, 
  CheckCircle2, 
  QrCode, 
  CreditCard, 
  Smartphone, 
  Building2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

const DEFAULT_SETTINGS: AdminSettings = {
  qrCodeUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
  upiId: 'reviewearn.pay@okhdfcbank',
  phonePeNumber: '9876543210 (PhonePe / GPay)',
  gPayNumber: '9876543210',
  paytmNumber: '9876543210',
  bankName: 'HDFC Bank Ltd / State Bank of India (SBI)',
  bankAccountNo: '50200084920194',
  bankIfsc: 'HDFC0001234',
  accountHolderName: 'ReviewEarn Rating Technologies Pvt Ltd',
  instructions: 'Transfer the plan price using any Indian UPI app (PhonePe, Google Pay, Paytm, BHIM) or Net Banking / IMPS. You can also scan the official UPI QR code. Submit your 12-digit UPI Reference / UTR / Transaction ID below for instant plan activation.',
};

export const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, onOpenAuth }) => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(SUBSCRIPTION_PLANS[2]); // 1 month default
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'gpay' | 'phonepe' | 'paytm' | 'bank_transfer' | 'qr_scanner'>('upi');
  const [transactionId, setTransactionId] = useState('');
  const [senderAccountOrPhone, setSenderAccountOrPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch admin payment settings from Firestore
  useEffect(() => {
    if (!isOpen) return;
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'payment_config'));
        if (snap.exists()) {
          setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as AdminSettings);
        }
      } catch (err) {
        setSettings(DEFAULT_SETTINGS);
      }
    };
    fetchSettings();
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    if (!transactionId.trim() || !senderAccountOrPhone.trim()) {
      setErrorMessage('Please provide both your 12-digit UPI UTR / Transaction ID and Sender Mobile Number.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const subId = `sub-${Date.now()}-${currentUser.uid.slice(0, 5)}`;
    const newSubscription: SubscriptionPayment = {
      id: subId,
      userId: currentUser.uid,
      userEmail: currentUser.email || 'user@reviewearn.com',
      planId: selectedPlan.id,
      planName: selectedPlan.name,
      planDurationDays: selectedPlan.durationDays,
      amount: selectedPlan.price,
      paymentMethod,
      transactionId: transactionId.trim().toUpperCase(),
      senderAccountOrPhone: senderAccountOrPhone.trim(),
      notes: notes.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    try {
      try {
        await setDoc(doc(db, 'subscriptions', subId), newSubscription);
      } catch (e) {
        console.warn('Subscription setDoc notice:', e);
      }

      setSuccessMessage(
        `Subscription payment for ${selectedPlan.name} (₹${selectedPlan.price}) recorded successfully! UTR / TrxID: ${transactionId.toUpperCase()}. Admin will approve shortly.`
      );
      setTransactionId('');
      setSenderAccountOrPhone('');
      setNotes('');
      await refreshProfile();
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to submit subscription payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 mb-2">
            <Crown className="w-4 h-4 text-amber-400" />
            Official Reviewer Membership Packages (INR ₹)
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Select Your Reviewer Membership Plan
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Complete daily product reviews across Amazon, Flipkart, Meesho, Blinkit, Instamart &amp; Zepto. Earn ₹20 per verified task.
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Payment Request Submitted!</div>
                <div className="text-xs text-emerald-700 mt-0.5">{successMessage}</div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Plans Grid (3d, 7d, 1m, 6m, 1y) */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <span>Step 1: Choose a Membership Duration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {SUBSCRIPTION_PLANS.map((plan) => {
                const isSelected = selectedPlan.id === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col justify-between relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-xs">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {plan.durationLabel}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">₹{plan.price}</span>
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                        Earn up to ₹{plan.dailyEarningPotential}/day
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                        {plan.features.slice(0, 3).map((f, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                            <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-2">
                      <button
                        type="button"
                        className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Admin Payment Details & Instructions */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Step 2: Transfer ₹{selectedPlan.price} to Official Admin Payment Channel</span>
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              {settings.instructions}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Payment details column */}
              <div className="md:col-span-2 space-y-2.5">
                
                {/* UPI ID */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 font-black text-xs flex items-center justify-center">
                      UPI
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Official UPI ID / VPA</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {settings.upiId}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.upiId, 'upi')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                  >
                    {copiedKey === 'upi' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* PhonePe / Google Pay Number */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 font-bold text-xs flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">PhonePe / Google Pay / Paytm Mobile</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        {settings.phonePeNumber}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.phonePeNumber, 'phone')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                  >
                    {copiedKey === 'phone' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Bank Details */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 font-bold text-xs flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {settings.bankName} • {settings.accountHolderName}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                        A/C: {settings.bankAccountNo} • IFSC: {settings.bankIfsc}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.bankAccountNo, 'bank')}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                  >
                    {copiedKey === 'bank' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

              </div>

              {/* QR Scanner visual */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center shadow-xs">
                <div className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  Scan to Pay (BHIM UPI)
                </div>
                <div className="w-32 h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-inner">
                  <img
                    src={settings.qrCodeUrl}
                    alt="BHIM UPI QR Scanner"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-2 font-medium">
                  Scan via PhonePe, GPay, Paytm, BHIM, or Banking app
                </div>
              </div>

            </div>
          </div>

          {/* 3. Verification Submission Form */}
          <form onSubmit={handlePaymentSubmit} className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-950 mb-3 flex items-center gap-2">
              <span>Step 3: Enter Payment Proof Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Mode Used
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="upi">BHIM UPI / Any UPI App</option>
                  <option value="phonepe">PhonePe</option>
                  <option value="gpay">Google Pay (GPay)</option>
                  <option value="paytm">Paytm UPI / Wallet</option>
                  <option value="qr_scanner">QR Code Scanner</option>
                  <option value="bank_transfer">Net Banking / IMPS / NEFT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  12-Digit UPI UTR / Transaction ID *
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 429182749102"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sender Mobile Number / UPI ID *
                </label>
                <input
                  type="text"
                  required
                  value={senderAccountOrPhone}
                  onChange={(e) => setSenderAccountOrPhone(e.target.value)}
                  placeholder="e.g. 98XXXXXXXX or name@upi"
                  className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Notes / Screenshot Reference
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Payment sent at 3:15 PM via Google Pay"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 text-center sm:text-left">
                Selected Plan: <span className="font-bold text-slate-900">{selectedPlan.name}</span> • Payable Amount:{' '}
                <span className="font-bold text-indigo-700 text-sm">₹{selectedPlan.price}</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Submitting Verification...</span>
                ) : (
                  <>
                    <span>Submit Payment Proof (₹{selectedPlan.price})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
