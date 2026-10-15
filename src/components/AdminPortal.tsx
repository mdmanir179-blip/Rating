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
  Sparkles
} from 'lucide-react';
import { getPlatformMeta } from './ProductCard';

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

  // Image upload handler (converts file to base64 Data URL)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProdImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  const handleBannerImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    const q = userSearchQuery.toLowerCase();
    return u.email?.toLowerCase().includes(q) || u.displayName?.toLowerCase().includes(q);
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
          <span>Customer Management ({userList.length})</span>
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
        
        {/* TAB 1: CUSTOMER MANAGEMENT (ACTIVE / INACTIVE TOGGLE) */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registered Customer &amp; Reviewer Accounts</h3>
                <p className="text-xs text-slate-500">
                  Admin can deactivate or reactivate any worker. Inactive accounts cannot submit reviews or withdraw.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-slate-500 text-sm">
                No users found.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredUsers.map((u) => {
                  const isInactive = u.status === 'inactive';
                  return (
                    <div
                      key={u.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isInactive
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                          alt=""
                          className="w-12 h-12 rounded-full border border-slate-300 object-cover shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{u.displayName || 'Reviewer'}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isInactive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {isInactive ? 'Inactive / Suspended' : 'Active Account'}
                            </span>
                            {u.role === 'admin' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                                Administrator
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-slate-500 mt-0.5 font-mono">
                            {u.email}
                          </div>

                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                            <span>Wallet Balance: <strong className="text-emerald-600">₹{u.walletBalance || 0}</strong></span>
                            <span>Total Earned: <strong>₹{u.totalEarned || 0}</strong></span>
                            <span>Demo Done: <strong>{u.demoTasksCompleted || 0} / 5</strong></span>
                            <span>Plan: <strong>{u.activePlan || 'none'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                            isInactive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {isInactive ? (
                            <>
                              <UserCheck className="w-4 h-4" />
                              <span>Reactivate Account</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4" />
                              <span>Deactivate / Suspend Account</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
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
              
              {/* QR Scanner Image */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  BHIM UPI QR Code Image URL
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={settings.qrCodeUrl}
                    onChange={(e) => setSettings({ ...settings, qrCodeUrl: e.target.value })}
                    className="flex-1 p-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://..."
                  />
                  <div className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-slate-50">
                    <img src={settings.qrCodeUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
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
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Product Image (Upload File or Enter URL)</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={prodImage}
                    onChange={(e) => setProdImage(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 p-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white"
                  />
                  <label className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                </div>
                {prodImage && (
                  <div className="mt-2 w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-white">
                    <img src={prodImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingProduct ? 'Save & Update in Customer Portal' : 'Add to Customer Portal'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
