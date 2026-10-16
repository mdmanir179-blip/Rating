import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  AdminSettings, 
  SubscriptionPayment, 
  WithdrawalRequest, 
  Product, 
  PlatformType, 
  UserProfile,
  OfferBanner 
} from '../types';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  ShieldCheck, 
  CreditCard, 
  CheckCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Save, 
  ArrowLeft,
  Users,
  Package,
  Wallet,
  UserX,
  UserCheck,
  Search,
  Upload,
  Video,
  Image as ImageIcon,
  Edit2,
  Tag,
  Eye,
  EyeOff,
  Sparkles,
  QrCode,
  Check,
  Briefcase,
  Crown
} from 'lucide-react';
import { getPlatformMeta } from './ProductCard';
import { compressImageFile } from '../utils/imageUtils';

interface AdminPortalProps {
  onBack: () => void;
  products: Product[];
  banners: OfferBanner[];
  onAddProduct: (prod: Product) => Promise<void>;
  onUpdateProduct: (prod: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAddBanner: (banner: OfferBanner) => Promise<void>;
  onDeleteBanner: (id: string) => Promise<void>;
  onToggleBanner: (banner: OfferBanner) => Promise<void>;
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

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onBack,
  products,
  banners,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddBanner,
  onDeleteBanner,
  onToggleBanner,
}) => {
  const { refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'products' | 'banners' | 'subscriptions' | 'withdrawals' | 'settings'>('users');
  const [settings, setSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [subscriptions, setSubscriptions] = useState<SubscriptionPayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Product Add / Edit modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodTitle, setProdTitle] = useState('');
  const [prodPlatform, setProdPlatform] = useState<PlatformType>('amazon');
  const [prodCategory, setProdCategory] = useState('Electronics');
  const [prodPrice, setProdPrice] = useState(1999);
  const [prodReward, setProdReward] = useState(20);
  const [prodImage, setProdImage] = useState('https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80');
  const [prodVideo, setProdVideo] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);

  // Banner Add form state
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerSubtitle, setBannerSubtitle] = useState('');
  const [bannerBadge, setBannerBadge] = useState('SPECIAL OFFER 🔥');
  const [bannerImage, setBannerImage] = useState('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80');
  const [bannerCta, setBannerCta] = useState('Upgrade to Pro');
  const [bannerAction, setBannerAction] = useState<'open_plans' | 'open_tasks'>('open_plans');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Fetch settings
      const settingsSnap = await getDoc(doc(db, 'settings', 'payment_config'));
      if (settingsSnap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...settingsSnap.data() } as AdminSettings);
      }

      // 2. Fetch all registered users
      const usersSnap = await getDocs(collection(db, 'users'));
      const uList = usersSnap.docs.map((d) => ({ ...d.data(), id: d.id } as UserProfile));
      setUserList(uList);

      // 3. Fetch subscriptions
      const subSnap = await getDocs(collection(db, 'subscriptions'));
      const subs = subSnap.docs.map((d) => d.data() as SubscriptionPayment);
      setSubscriptions(subs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      // 4. Fetch withdrawals
      const withSnap = await getDocs(collection(db, 'withdrawals'));
      const withs = withSnap.docs.map((d) => d.data() as WithdrawalRequest);
      setWithdrawals(withs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // User Activation / Deactivation toggle
  const handleToggleUserStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setUserList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      console.error('Error updating user status:', err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const [bulkRewardAmount, setBulkRewardAmount] = useState<number>(20);
  const [isUpdatingRewards, setIsUpdatingRewards] = useState(false);
  const [bulkRewardSuccess, setBulkRewardSuccess] = useState<string | null>(null);
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'assigned' | 'active' | 'inactive'>('all');

  // Worker Task Assignment state
  const [selectedWorkerForTask, setSelectedWorkerForTask] = useState<UserProfile | null>(null);
  const [workerAssignedProducts, setWorkerAssignedProducts] = useState<string[]>([]);
  const [workerCustomLimit, setWorkerCustomLimit] = useState<number>(0);
  const [workerPlanToGrant, setWorkerPlanToGrant] = useState<string>('keep');
  const [workerBonusCredit, setWorkerBonusCredit] = useState<number>(0);
  const [workerNotes, setWorkerNotes] = useState<string>('');
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [assignSuccessToast, setAssignSuccessToast] = useState<string | null>(null);

  const openAssignWorkModal = (worker: UserProfile) => {
    setSelectedWorkerForTask(worker);
    setWorkerAssignedProducts(worker.assignedProductIds || []);
    setWorkerCustomLimit(worker.customTaskLimit || 0);
    setWorkerPlanToGrant(worker.activePlan || 'keep');
    setWorkerBonusCredit(0);
    setWorkerNotes(worker.assignedNotes || '');
  };

  const handleSaveWorkerAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForTask) return;
    setAssigningLoading(true);
    try {
      const userRef = doc(db, 'users', selectedWorkerForTask.id);
      const updates: any = {
        assignedProductIds: workerAssignedProducts,
        customTaskLimit: Number(workerCustomLimit) || 0,
        assignedNotes: workerNotes.trim(),
        updatedAt: new Date().toISOString(),
      };
      if (workerPlanToGrant !== 'keep') {
        updates.activePlan = workerPlanToGrant;
      }
      if (Number(workerBonusCredit) > 0) {
        updates.walletBalance = (selectedWorkerForTask.walletBalance || 0) + Number(workerBonusCredit);
        updates.totalEarned = (selectedWorkerForTask.totalEarned || 0) + Number(workerBonusCredit);
      }
      try {
        await updateDoc(userRef, updates);
      } catch (e) {
        await setDoc(userRef, updates, { merge: true });
      }

      setUserList((prev) =>
        prev.map((u) => (u.id === selectedWorkerForTask.id ? { ...u, ...updates } : u))
      );

      setAssignSuccessToast(`✓ Work & tasks assigned to ${selectedWorkerForTask.displayName || selectedWorkerForTask.email}!`);
      setTimeout(() => setAssignSuccessToast(null), 4000);
      setSelectedWorkerForTask(null);
    } catch (err) {
      console.error('Error assigning work:', err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${selectedWorkerForTask.id}`);
    } finally {
      setAssigningLoading(false);
    }
  };

  const handleApplyBulkReward = async () => {
    if (!bulkRewardAmount || bulkRewardAmount <= 0) return;
    setIsUpdatingRewards(true);
    setBulkRewardSuccess(`Updating per-rating reward to ₹${bulkRewardAmount}...`);
    try {
      // 1. Save to settings in Firestore
      const updatedSettings: AdminSettings = {
        ...settings,
        defaultRatingReward: Number(bulkRewardAmount),
        updatedAt: new Date().toISOString(),
      };
      setSettings(updatedSettings);
      try {
        await setDoc(doc(db, 'settings', 'payment_config'), updatedSettings, { merge: true });
      } catch (err) {
        console.warn('Settings setDoc error:', err);
      }

      // 2. Update all products in Firestore and in app
      for (const prod of products) {
        const updated: Product = { ...prod, rewardAmount: Number(bulkRewardAmount) };
        await onUpdateProduct(updated);
      }
      setBulkRewardSuccess(`✓ Successfully updated reward to ₹${bulkRewardAmount} per rating across all ${products.length} products! Customer portal is now live with the new rate.`);
      setTimeout(() => setBulkRewardSuccess(null), 5000);
    } catch (e) {
      console.error('Error updating bulk rewards:', e);
      setBulkRewardSuccess('Failed to apply bulk rewards.');
    } finally {
      setIsUpdatingRewards(false);
    }
  };

  // Image upload handler (compresses file to optimized JPEG Data URL ~40-70KB)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 800, 800, 0.82);
        setProdImage(compressed);
      } catch (err) {
        console.error('Image compression error:', err);
      }
    }
  };

  // QR Code upload handler (compresses file to optimized JPEG Data URL ~40-60KB)
  const handleQrCodeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 600, 600, 0.85);
        setSettings((prev) => ({ ...prev, qrCodeUrl: compressed }));
      } catch (err) {
        console.error('QR code compression error:', err);
      }
    }
  };

  // Video upload handler (converts file to Data URL or video blob)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProdVideo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 1200, 600, 0.82);
        setBannerImage(compressed);
      } catch (err) {
        console.error('Banner compression error:', err);
      }
    }
  };

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdTitle('');
    setProdPlatform('amazon');
    setProdCategory('Electronics');
    setProdPrice(1999);
    setProdReward(20);
    setProdImage('https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80');
    setProdVideo('');
    setProdDesc('');
    setShowProductModal(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdTitle(prod.title);
    setProdPlatform(prod.platform);
    setProdCategory(prod.category);
    setProdPrice(prod.originalPrice);
    setProdReward(prod.rewardAmount);
    setProdImage(prod.imageUrl);
    setProdVideo(prod.videoUrl || '');
    setProdDesc(prod.description);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodTitle.trim()) return;

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        title: prodTitle.trim(),
        platform: prodPlatform,
        category: prodCategory.trim() || 'General Store',
        originalPrice: Number(prodPrice) || 999,
        rewardAmount: Number(prodReward) || 20,
        imageUrl: prodImage,
        videoUrl: prodVideo.trim() || undefined,
        description: prodDesc.trim() || 'Authentic marketplace item ready for quality reviews.',
      };
      await onUpdateProduct(updated);
    } else {
      const newProd: Product = {
        id: `prod-${prodPlatform.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        title: prodTitle.trim(),
        platform: prodPlatform,
        category: prodCategory.trim() || 'General Store',
        originalPrice: Number(prodPrice) || 999,
        rewardAmount: Number(prodReward) || 20,
        imageUrl: prodImage,
        videoUrl: prodVideo.trim() || undefined,
        description: prodDesc.trim() || 'Authentic marketplace item ready for quality reviews.',
        rating: 4.8,
        totalReviews: 120,
        inStock: true,
        createdAt: new Date().toISOString(),
      };
      await onAddProduct(newProd);
    }
    setShowProductModal(false);
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) return;

    const newBanner: OfferBanner = {
      id: `banner-${Date.now().toString().slice(-4)}`,
      title: bannerTitle.trim(),
      subtitle: bannerSubtitle.trim(),
      badge: bannerBadge.trim() || 'SPECIAL PROMO',
      imageUrl: bannerImage.trim() || undefined,
      ctaText: bannerCta.trim() || 'View Offer',
      targetAction: bannerAction,
      active: true,
      createdAt: new Date().toISOString(),
    };

    await onAddBanner(newBanner);
    setBannerTitle('');
    setBannerSubtitle('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving payment settings...');
    try {
      const updateData: AdminSettings = {
        ...settings,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'settings', 'payment_config'), updateData);
      setSaveStatus('Payment settings updated in INR and live across all user checkout modals!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'settings/payment_config');
      setSaveStatus('Failed to save settings.');
    }
  };

  const handleApproveSubscription = async (sub: SubscriptionPayment) => {
    try {
      await updateDoc(doc(db, 'subscriptions', sub.id), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
      });

      const days = sub.planDurationDays || 30;
      const expiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await updateDoc(doc(db, 'users', sub.userId), {
        activePlan: sub.planId,
        planExpiresAt: expiry,
        updatedAt: new Date().toISOString(),
      });

      setSubscriptions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: 'approved' } : s))
      );
      await refreshProfile();
    } catch (err) {
      console.error('Error approving subscription:', err);
      handleFirestoreError(err, OperationType.UPDATE, `subscriptions/${sub.id}`);
    }
  };

  const handleRejectSubscription = async (subId: string) => {
    try {
      await updateDoc(doc(db, 'subscriptions', subId), {
        status: 'rejected',
      });
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, status: 'rejected' } : s))
      );
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `subscriptions/${subId}`);
    }
  };

  const handleCompleteWithdrawal = async (withDoc: WithdrawalRequest) => {
    try {
      await updateDoc(doc(db, 'withdrawals', withDoc.id), {
        status: 'completed',
      });
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === withDoc.id ? { ...w, status: 'completed' } : w))
      );
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${withDoc.id}`);
    }
  };

  const filteredUsers = userList.filter((u) => {
    if (userStatusFilter === 'active' && u.status === 'inactive') return false;
    if (userStatusFilter === 'inactive' && u.status !== 'inactive') return false;
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-purple-600 text-white font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Full Admin Control Panel</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Customer status management, real-time product image/video uploads, offer banners, and UPI payouts.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync All Live Data</span>
        </button>
      </div>

      {/* GLOBAL PER-RATING REWARD RATE CONFIGURATION CARD (Edit Rate Option) */}
      <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-indigo-50 border-2 border-emerald-300 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
            ₹
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                Per Rating Cash Reward Rate (প্রতি রেটিং এ কত টাকা দেওয়া হবে - Edit Rate)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-2xs">
                Live Rate: ₹{settings.defaultRatingReward || 20} / Rating
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Edit how much cash reviewers earn per product rating. Click "Update Live Rate" to immediately save to database and update all marketplace products &amp; live customer portal in real-time.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center bg-white rounded-xl border-2 border-emerald-400 px-3 py-1.5 shadow-xs">
            <span className="text-sm font-black text-emerald-700 mr-1.5">₹</span>
            <input
              type="number"
              min="1"
              value={bulkRewardAmount}
              onChange={(e) => setBulkRewardAmount(Number(e.target.value))}
              className="w-20 text-base font-black text-slate-900 outline-none"
              placeholder="20"
            />
          </div>

          <button
            onClick={handleApplyBulkReward}
            disabled={isUpdatingRewards}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isUpdatingRewards ? 'Updating...' : 'Update Live Rate (রেট কার্যকর করুন)'}</span>
          </button>
        </div>
      </div>

      {bulkRewardSuccess && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{bulkRewardSuccess}</span>
        </div>
      )}

      {assignSuccessToast && (
        <div className="mt-3 p-3 rounded-xl bg-indigo-100 border border-indigo-300 text-indigo-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-indigo-700 shrink-0" />
          <span>{assignSuccessToast}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mt-6 gap-2 text-xs sm:text-sm font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Workers &amp; Task Allocation ({userList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Products &amp; Videos ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('banners')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'banners'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Offer Banners ({banners.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'subscriptions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Plan Payments ({subscriptions.filter(s => s.status === 'pending').length} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'withdrawals'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Cashout Requests ({withdrawals.filter(w => w.status === 'pending').length} Pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Scanner &amp; UPI (₹)</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="mt-6">
        
        {/* TAB 1: CUSTOMER WORKERS MANAGEMENT DATA TABLE */}
        {activeTab === 'users' && (
          <div className="space-y-5">
            
            {/* Top Stat Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Workers</div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{userList.length}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Registered Reviewers</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Active Workers</div>
                <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
                  {userList.filter((u) => u.status !== 'inactive').length}
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Eligible for Rating Tasks</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/20 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Suspended / Inactive</div>
                <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                  {userList.filter((u) => u.status === 'inactive').length}
                </div>
                <div className="text-[10px] text-rose-500 mt-0.5">Task access disabled</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-indigo-100 bg-indigo-50/20 shadow-xs">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Total Payouts Earned</div>
                <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
                  ₹{userList.reduce((acc, u) => acc + (u.totalEarned || 0), 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-indigo-500 mt-0.5">Wallet Balances: ₹{userList.reduce((acc, u) => acc + (u.walletBalance || 0), 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Workers ({userList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('assigned')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userStatusFilter === 'assigned'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Assigned Work (যাদের কাজ দেওয়া হয়েছে) ({userList.filter(u => (u.assignedProductIds && u.assignedProductIds.length > 0) || (u.customTaskLimit && u.customTaskLimit > 0) || (u.activePlan && u.activePlan !== 'none')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userStatusFilter === 'active'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Active ({userList.filter((u) => u.status !== 'inactive').length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    userStatusFilter === 'inactive'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Suspended ({userList.filter((u) => u.status === 'inactive').length})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search name, email, or mobile..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Workers Data Table */}
            {filteredUsers.length === 0 ? (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm">
                No workers found matching your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Worker / Reviewer</th>
                      <th className="py-3.5 px-4">Contact (Email / Mobile)</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4">Assigned Work (বরাদ্দকৃত কাজ)</th>
                      <th className="py-3.5 px-4">Wallet Balance</th>
                      <th className="py-3.5 px-4">Total Earned</th>
                      <th className="py-3.5 px-4">Demo / Tasks</th>
                      <th className="py-3.5 px-4">Membership Plan</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isInactive = u.status === 'inactive';
                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isInactive ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          {/* Worker Avatar & Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                                alt=""
                                className="w-9 h-9 rounded-full border border-slate-200 object-cover shrink-0"
                              />
                              <div>
                                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {u.displayName || 'Reviewer'}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  ID: #{u.id.slice(0, 10)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Email & Phone */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="text-slate-800 font-medium">{u.email}</div>
                            {u.phone ? (
                              <div className="text-[11px] text-indigo-600 font-mono font-semibold">
                                📞 +91 {u.phone}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400">Email Login</div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isInactive
                                  ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isInactive ? 'bg-rose-600' : 'bg-emerald-600'
                                }`}
                              ></span>
                              {isInactive ? 'Suspended' : 'Active'}
                            </span>
                          </td>

                          {/* Assigned Work & Task Allocation */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {u.assignedProductIds && u.assignedProductIds.length > 0 ? (
                              <div className="font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 inline-flex items-center gap-1.5 shadow-2xs">
                                <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{u.assignedProductIds.length} Products Assigned</span>
                              </div>
                            ) : u.customTaskLimit && u.customTaskLimit > 0 ? (
                              <div className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-flex items-center gap-1.5 shadow-2xs">
                                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                <span>Bonus: {u.customTaskLimit} tasks</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs font-medium">Standard Catalog</span>
                            )}
                            {u.assignedNotes && (
                              <div className="text-[10px] text-slate-500 truncate max-w-[150px] mt-0.5 font-medium" title={u.assignedNotes}>
                                📝 {u.assignedNotes}
                              </div>
                            )}
                          </td>

                          {/* Wallet Balance */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-emerald-600 text-sm">
                            ₹{(u.walletBalance || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Total Earned */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-semibold text-slate-700">
                            ₹{(u.totalEarned || 0).toLocaleString('en-IN')}
                          </td>

                          {/* Tasks Done */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">
                              {u.completedTasksCount || 0} reviews
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Demo: {u.demoTasksCompleted || 0} / 5
                            </div>
                          </td>

                          {/* Active Plan */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                u.activePlan && u.activePlan !== 'none'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {u.activePlan && u.activePlan !== 'none'
                                ? u.activePlan.replace('_', ' ')
                                : 'Free Trial'}
                            </span>
                          </td>

                          {/* Actions: Assign Work & Activate / Suspend Toggle */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openAssignWorkModal(u)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1.5 active:scale-95"
                                title="Assign specific products or tasks to this worker"
                              >
                                <Briefcase className="w-3.5 h-3.5" />
                                <span>Assign Work (কাজ দিন)</span>
                              </button>

                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1 ${
                                  isInactive
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'
                                }`}
                                title={
                                  isInactive
                                    ? 'Reactivate worker account'
                                    : 'Suspend worker account'
                                }
                              >
                                {isInactive ? (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>Activate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Suspend</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PRODUCTS & VIDEOS (REAL-TIME EDIT/ADD/DELETE) */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Marketplace Product Catalog</h3>
                <p className="text-xs text-slate-500">
                  Upload images and unboxing demo videos. Updates reflect instantly on customer portals!
                </p>
              </div>

              <button
                onClick={openCreateProduct}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Product</span>
              </button>
            </div>

            {/* List of current products */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const meta = getPlatformMeta(p.platform);
                return (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white flex gap-3 items-center shadow-xs">
                    <img src={p.imageUrl} alt={p.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${meta.badgeBg}`}>
                          {meta.name}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600">
                          +₹{p.rewardAmount ?? 20}
                        </span>
                        {p.videoUrl && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 flex items-center gap-0.5">
                            <Video className="w-2.5 h-2.5" /> Video
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{p.title || 'Marketplace Item'}</h4>
                      <p className="text-[11px] text-slate-400">₹{(p.originalPrice ?? 999).toLocaleString('en-IN')}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditProduct(p)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Product, Image & Video"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct(p.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: OFFER BANNERS */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Customer Feed Offer Banners</h3>
                <p className="text-xs text-slate-500">
                  These promotional banners appear between product cards in the customer portal feed.
                </p>
              </div>
            </div>

            {/* Create Banner Form */}
            <form onSubmit={handleCreateBanner} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Create New Feed Promotion Banner</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Banner Title</label>
                  <input
                    type="text"
                    required
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    placeholder="e.g. Flash Bonus: Earn ₹5 Extra on Every Task Today!"
                    className="w-full p-2 text-xs sm:text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={bannerBadge}
                    onChange={(e) => setBannerBadge(e.target.value)}
                    placeholder="e.g. LIMITED DEAL 🔥"
                    className="w-full p-2 text-xs sm:text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Subtitle / Details</label>
                  <input
                    type="text"
                    value={bannerSubtitle}
                    onChange={(e) => setBannerSubtitle(e.target.value)}
                    placeholder="e.g. Upgrade to 1 Month Master Earner and enjoy instant payout approvals."
                    className="w-full p-2 text-xs sm:text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">CTA Button Text</label>
                  <input
                    type="text"
                    value={bannerCta}
                    onChange={(e) => setBannerCta(e.target.value)}
                    placeholder="e.g. Claim 50% Off"
                    className="w-full p-2 text-xs sm:text-sm rounded-xl border border-slate-300"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Banner Image URL or Upload</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bannerImage}
                      onChange={(e) => setBannerImage(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 p-2 text-xs sm:text-sm rounded-xl border border-slate-300"
                    />
                    <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input type="file" accept="image/*" onChange={handleBannerImageFileChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Button Action</label>
                  <select
                    value={bannerAction}
                    onChange={(e: any) => setBannerAction(e.target.value)}
                    className="w-full p-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="open_plans">Open Membership Plans</option>
                    <option value="open_tasks">Go to Task Queue</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Publish Offer Banner</span>
                </button>
              </div>
            </form>

            {/* List of existing banners */}
            <div className="space-y-3">
              {banners.map((b) => (
                <div key={b.id} className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {b.badge}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          b.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {b.active ? 'Visible on Feed' : 'Hidden'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{b.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{b.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => onToggleBanner(b)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      {b.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{b.active ? 'Hide' : 'Show'}</span>
                    </button>
                    <button
                      onClick={() => onDeleteBanner(b.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 4: SUBSCRIPTION APPROVALS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">User Membership Payments (INR ₹)</h3>
                <p className="text-xs text-slate-500">
                  Review submitted UPI UTR / Transaction IDs. Approving activates the reviewer's membership plan.
                </p>
              </div>
            </div>

            {subscriptions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm">
                No subscription payments submitted yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {sub.planName} (₹{sub.amount})
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            sub.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-slate-900">
                        Reviewer: <span className="text-indigo-600">{sub.userEmail}</span>
                      </div>

                      <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Mode: <strong className="uppercase">{sub.paymentMethod}</strong></span>
                        <span>UTR / TrxID: <strong className="font-mono text-slate-900">{sub.transactionId}</strong></span>
                        <span>Sender: <strong className="font-mono">{sub.senderAccountOrPhone}</strong></span>
                        {sub.notes && <span>Notes: {sub.notes}</span>}
                      </div>

                      <div className="text-[11px] text-slate-400 mt-1">
                        Submitted: {new Date(sub.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {sub.status === 'pending' && (
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => handleRejectSubscription(sub.id)}
                          className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveSubscription(sub)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve &amp; Activate Plan</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WITHDRAWALS */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">User Wallet Cashout Requests (INR ₹)</h3>

            {withdrawals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm">
                No withdrawal requests submitted yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {withdrawals.map((w) => (
                  <div key={w.id} className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-emerald-600">₹{w.amount}</span>
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {w.method}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            w.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 font-semibold mt-1">
                        Reviewer: {w.userEmail}
                      </div>
                      <div className="text-xs font-mono text-slate-600">
                        Target UPI / Account: {w.accountDetails}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(w.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {w.status === 'pending' && (
                      <button
                        onClick={() => handleCompleteWithdrawal(w)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-end sm:self-center"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Confirm Transfer Completed</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PAYMENT SETTINGS (UPI, PhonePe, GPay, Bank, IFSC) */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Indian Payment Channels &amp; UPI QR Configuration</h3>
                <p className="text-xs text-slate-500">
                  Update your BHIM UPI ID, PhonePe/GPay mobile numbers, Bank IFSC and QR code image.
                </p>
              </div>

              {saveStatus && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  {saveStatus}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* QR Scanner Image with File Upload */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-600" />
                  <span>BHIM UPI QR Code Scanner Image</span>
                </label>
                
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="w-24 h-24 rounded-xl bg-white border-2 border-dashed border-indigo-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {settings.qrCodeUrl ? (
                      <img src={settings.qrCodeUrl} alt="UPI QR Code" className="w-full h-full object-cover" />
                    ) : (
                      <QrCode className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap gap-2 items-center">
                      <label className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload QR Image from Phone/PC</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrCodeFileChange}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-slate-500">or enter image link below:</span>
                    </div>

                    <input
                      type="text"
                      value={settings.qrCodeUrl}
                      onChange={(e) => setSettings({ ...settings, qrCodeUrl: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="https://..."
                    />
                    <p className="text-[11px] text-emerald-600 font-medium">
                      ✓ Changes to this QR Code update instantly on customer plan upgrades &amp; payment screens!
                    </p>
                  </div>
                </div>
              </div>

              {/* Default Reward Per Review */}
              <div className="md:col-span-2 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-emerald-950 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Default Cash Reward Per Rating (INR ₹)</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center bg-white rounded-xl border border-emerald-300 px-3 py-1.5 shadow-xs">
                    <span className="text-sm font-bold text-slate-500 mr-1.5">₹</span>
                    <input
                      type="number"
                      min="1"
                      value={settings.defaultRatingReward ?? 20}
                      onChange={(e) => setSettings({ ...settings, defaultRatingReward: Number(e.target.value) })}
                      className="w-20 text-base font-black text-emerald-700 outline-none"
                    />
                  </div>
                  <span className="text-xs text-emerald-800">
                    Reward amount given to reviewers per product rating (admin can edit anytime).
                  </span>
                </div>
              </div>

              {/* UPI ID */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Official UPI ID / VPA
                </label>
                <input
                  type="text"
                  value={settings.upiId}
                  onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  placeholder="reviewearn.pay@okhdfcbank"
                />
              </div>

              {/* PhonePe / GPay Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  PhonePe / Google Pay / Paytm Mobile
                </label>
                <input
                  type="text"
                  value={settings.phonePeNumber}
                  onChange={(e) => setSettings({ ...settings, phonePeNumber: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  placeholder="9876543210"
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Account Beneficiary Name
                </label>
                <input
                  type="text"
                  value={settings.accountHolderName}
                  onChange={(e) => setSettings({ ...settings, accountHolderName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="ReviewEarn Technologies Pvt Ltd"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={settings.bankName}
                  onChange={(e) => setSettings({ ...settings, bankName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="HDFC Bank / State Bank of India"
                />
              </div>

              {/* Bank Account No */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={settings.bankAccountNo}
                  onChange={(e) => setSettings({ ...settings, bankAccountNo: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                  placeholder="50200084920194"
                />
              </div>

              {/* Bank IFSC */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Bank IFSC Code
                </label>
                <input
                  type="text"
                  value={settings.bankIfsc}
                  onChange={(e) => setSettings({ ...settings, bankIfsc: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 uppercase"
                  placeholder="HDFC0001234"
                />
              </div>

              {/* Instructions */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  User Payment Instructions Notice
                </label>
                <textarea
                  rows={3}
                  value={settings.instructions}
                  onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Instructions for user before sending money..."
                />
              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save &amp; Update Indian Payment Info</span>
              </button>
            </div>
          </form>
        )}

      </div>

      {/* PRODUCT CREATE / EDIT MODAL WITH IMAGE & VIDEO UPLOADER */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                <span>{editingProduct ? 'Edit Product, Image & Video' : 'Add New Marketplace Product'}</span>
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={prodTitle}
                  onChange={(e) => setProdTitle(e.target.value)}
                  placeholder="e.g. boAt Wave Call 2 Smartwatch"
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Marketplace Portal</label>
                  <select
                    value={prodPlatform}
                    onChange={(e: any) => setProdPlatform(e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="amazon">Amazon India</option>
                    <option value="flipkart">Flipkart</option>
                    <option value="meesho">Meesho</option>
                    <option value="blinkit">Blinkit</option>
                    <option value="instamart">Instamart</option>
                    <option value="zepto">Zepto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category</label>
                  <input
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="Electronics / Fashion"
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Retail Price (₹)</label>
                  <input
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(Number(e.target.value))}
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reviewer Reward (₹)</label>
                  <input
                    type="number"
                    value={prodReward}
                    onChange={(e) => setProdReward(Number(e.target.value))}
                    className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 font-bold text-emerald-600"
                  />
                </div>
              </div>

              {/* IMAGE UPLOAD / URL */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Product Image (ছবি আপলোড করুন বা লিংক দিন)</span>
                  </label>
                  <span className="text-[11px] text-emerald-600 font-bold">Auto-Compressed</span>
                </div>

                {/* File Upload Button */}
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <label className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]">
                    <Upload className="w-4 h-4" />
                    <span>📁 Upload Image from PC / Phone (ডিভাইস থেকে ছবি আপলোড)</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                  <span className="text-xs text-slate-500 font-medium text-center sm:text-left">or enter link:</span>
                </div>

                <input
                  type="text"
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                />

                {/* Image Preview */}
                {prodImage && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200">
                    <div className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                      <img src={prodImage} alt="Product Preview" className="w-full h-full object-cover" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Image Attached &amp; Ready
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Saved to database and will update customer portal instantly upon submit.
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Presets */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">Quick Sample Product Images:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {[
                      { label: '🎧 Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80' },
                      { label: '⌚ Smartwatch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' },
                      { label: '📱 Smartphone', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80' },
                      { label: '👟 Sneakers', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80' },
                      { label: '🧴 Skincare', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80' },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProdImage(preset.url)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 text-[11px] font-medium text-slate-700 transition-colors shadow-2xs"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* VIDEO UPLOAD / URL */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-red-500" />
                  <span>Product Demo / Unboxing Video (Upload or URL)</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={prodVideo}
                    onChange={(e) => setProdVideo(e.target.value)}
                    placeholder="https://... or upload MP4 / WebM"
                    className="flex-1 p-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
                  />
                  <label className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Video</span>
                    <input type="file" accept="video/*" onChange={handleVideoFileChange} className="hidden" />
                  </label>
                </div>
                {prodVideo && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    ✓ Video media attached. Reviewers can watch this in their product card!
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Product Description</label>
                <textarea
                  rows={3}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Review guidelines or product specifications..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingProduct ? 'Save & Update in Customer Portal' : 'Add to Customer Portal'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* WORKER TASK ASSIGNMENT MODAL (কাজ দিন) */}
      {selectedWorkerForTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 mb-1">
                  <Briefcase className="w-3.5 h-3.5" />
                  Task Allocation &amp; Assignment (কাজ বণ্টন)
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Assign Work to: {selectedWorkerForTask.displayName || selectedWorkerForTask.email}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  ID: #{selectedWorkerForTask.id.slice(0, 10)} • Contact: {selectedWorkerForTask.phone || selectedWorkerForTask.email}
                </p>
              </div>

              <button
                onClick={() => setSelectedWorkerForTask(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWorkerAssignment} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* 1. Select specific products to assign */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <span>Select Products to Assign (রিভিউ করার জন্য প্রোডাক্ট নির্বাচন করুন)</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWorkerAssignedProducts(products.map(p => p.id))}
                      className="text-[11px] font-bold text-indigo-600 hover:underline"
                    >
                      Select All ({products.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setWorkerAssignedProducts([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-2xl p-2.5 divide-y divide-slate-100 bg-slate-50/50 space-y-1">
                  {products.map((p) => {
                    const isChecked = workerAssignedProducts.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                          isChecked ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setWorkerAssignedProducts((prev) => [...prev, p.id]);
                              } else {
                                setWorkerAssignedProducts((prev) => prev.filter(id => id !== p.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200" />
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-800 truncate">{p.title}</div>
                            <div className="text-[10px] text-slate-500 capitalize">{p.platform} • ₹{p.originalPrice}</div>
                          </div>
                        </div>

                        <span className="text-xs font-black text-emerald-600 shrink-0 ml-2">
                          +₹{p.rewardAmount}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {workerAssignedProducts.length === 0
                    ? 'No specific products locked: Worker can access all standard marketplace catalog tasks.'
                    : `✓ Worker is specifically assigned ${workerAssignedProducts.length} product tasks.`}
                </p>
              </div>

              {/* 2. Custom Task Allowance / Daily Limit */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Bonus / Custom Task Allowance (অতিরিক্ত টাস্কের পরিমাণ)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={workerCustomLimit}
                    onChange={(e) => setWorkerCustomLimit(Number(e.target.value))}
                    className="w-24 p-2 rounded-xl border border-amber-300 font-black text-amber-900 bg-white"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 10, 20, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setWorkerCustomLimit(num)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 hover:bg-amber-100 text-xs font-bold text-amber-900 transition-colors"
                      >
                        +{num} Tasks
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-amber-800 mt-1.5">
                  Grant bonus daily reviews to this worker even before or alongside subscription plan.
                </p>
              </div>

              {/* 3. Direct Plan Activation */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span>Grant / Upgrade Membership Plan (সরাসরি প্ল্যান চালু করুন)</span>
                </label>
                <select
                  value={workerPlanToGrant}
                  onChange={(e) => setWorkerPlanToGrant(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
                >
                  <option value="keep">Keep Current Status ({selectedWorkerForTask.activePlan || 'Free Trial'})</option>
                  <option value="none">Free Trial (Reset Plan)</option>
                  <option value="3_days">3 Days Pro Earner (Active)</option>
                  <option value="7_days">7 Days Master Earner (Active)</option>
                  <option value="1_month">1 Month Elite Earner (Active)</option>
                  <option value="6_months">6 Months VIP Earner (Active)</option>
                  <option value="1_year">1 Year Unlimited Earner (Active)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Admin can instantly unlock membership for this worker without requiring payment slip approval.
                </p>
              </div>

              {/* 4. Bonus Wallet Credit */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span>Add Bonus Cash to Worker Wallet (বোনাস টাকা যোগ করুন - INR ₹)</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={workerBonusCredit}
                    onChange={(e) => setWorkerBonusCredit(Number(e.target.value))}
                    placeholder="0"
                    className="w-32 p-2 text-xs sm:text-sm rounded-xl border border-slate-300 font-bold"
                  />
                  <span className="text-xs text-slate-500">Current Balance: ₹{selectedWorkerForTask.walletBalance || 0}</span>
                </div>
              </div>

              {/* 5. Admin Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Worker Assignment Notes (কাজের নির্দেশ বা মন্তব্য)
                </label>
                <input
                  type="text"
                  value={workerNotes}
                  onChange={(e) => setWorkerNotes(e.target.value)}
                  placeholder="e.g. Assigned Flipkart electronics reviews batch 1..."
                  className="w-full p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedWorkerForTask(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>{assigningLoading ? 'Saving...' : 'Save & Allocate Tasks (কাজ বরাদ্দ করুন)'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
