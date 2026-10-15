import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Product, PlatformType, OfferBanner } from './types';
import { INITIAL_PRODUCTS } from './data/mockProducts';
import { INITIAL_BANNERS } from './data/mockBanners';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ProductCard } from './components/ProductCard';
import { ReviewModal } from './components/ReviewModal';
import { PlanModal } from './components/PlanModal';
import { WalletModal } from './components/WalletModal';
import { AdminPortal } from './components/AdminPortal';
import { SecretAdminLogin } from './components/SecretAdminLogin';
import { TaskQueue } from './components/TaskQueue';
import { OfferBannerCard } from './components/OfferBannerCard';
import { InstallAppModal } from './components/InstallAppModal';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Wallet, 
  Crown,
  Home,
  AlertTriangle,
  Smartphone,
  Lock,
  RefreshCw
} from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, isAdmin } = useAuth();

  // Navigation & Hash Router
  const [currentTab, setCurrentTab] = useState<'portal' | 'tasks' | 'admin'>('portal');
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>(undefined);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<Product | null>(null);

  // PWA beforeinstallprompt event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Real-time state from Firestore (always initialized with 15 mock products so products NEVER disappear)
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [banners, setBanners] = useState<OfferBanner[]>(INITIAL_BANNERS);
  const [completedProductIds, setCompletedProductIds] = useState<Set<string>>(new Set());
  const [portalFilter, setPortalFilter] = useState<PlatformType | 'all'>('all');
  const [rewardToast, setRewardToast] = useState<{ amount: number; title: string } | null>(null);

  // Listen to URL hash for secret #admin
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        setIsAdminRoute(true);
        setCurrentTab('admin');
      } else {
        setIsAdminRoute(false);
        if (currentTab === 'admin') {
          setCurrentTab('portal');
        }
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [currentTab]);

  // Capture beforeinstallprompt for Mobile / Desktop App
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // REAL-TIME FIRESTORE LISTENER FOR PRODUCTS
  useEffect(() => {
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || 'Marketplace Item',
              platform: ((data.platform || 'amazon').toLowerCase()) as PlatformType,
              category: data.category || 'General Store',
              originalPrice: Number(data.originalPrice) || 999,
              rewardAmount: Number(data.rewardAmount) || 20,
              imageUrl: data.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
              description: data.description || 'Authentic marketplace item ready for quality reviews.',
              rating: Number(data.rating) || 4.8,
              totalReviews: Number(data.totalReviews) || 120,
              inStock: data.inStock !== false,
              videoUrl: data.videoUrl || undefined,
              createdAt: data.createdAt || undefined,
            } as Product;
          });
          const valid = list.filter((p) => p && p.title && p.id);
          setProducts(valid.length > 0 ? valid : INITIAL_PRODUCTS);
        } else {
          setProducts(INITIAL_PRODUCTS);
        }
      },
      (error) => {
        console.warn('Real-time products fallback to local catalog:', error);
        setProducts(INITIAL_PRODUCTS);
      }
    );

    return () => unsubProducts();
  }, []);

  // REAL-TIME FIRESTORE LISTENER FOR OFFER BANNERS
  useEffect(() => {
    const unsubBanners = onSnapshot(
      collection(db, 'banners'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || 'Special Promotion',
              subtitle: data.subtitle || '',
              badge: data.badge || 'PROMO',
              imageUrl: data.imageUrl || undefined,
              ctaText: data.ctaText || 'View Details',
              targetAction: data.targetAction || 'open_plans',
              active: data.active !== false,
              createdAt: data.createdAt || undefined,
            } as OfferBanner;
          });
          setBanners(list.length > 0 ? list : INITIAL_BANNERS);
        } else {
          setBanners(INITIAL_BANNERS);
        }
      },
      (error) => {
        console.warn('Real-time banners fallback:', error);
        setBanners(INITIAL_BANNERS);
      }
    );

    return () => unsubBanners();
  }, []);

  // Load completed reviews for current user
  useEffect(() => {
    if (!currentUser) {
      setCompletedProductIds(new Set());
      return;
    }

    const unsubReviews = onSnapshot(
      query(collection(db, 'reviews'), where('userId', '==', currentUser.uid)),
      (snap) => {
        const set = new Set<string>();
        snap.forEach((d) => {
          const data = d.data();
          if (data.productId) set.add(data.productId);
        });
        setCompletedProductIds(set);
      },
      (err) => {
        console.error('Error listening to user reviews:', err);
      }
    );

    return () => unsubReviews();
  }, [currentUser]);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User installed the PWA app');
        }
        setDeferredPrompt(null);
        setIsInstallModalOpen(false);
      });
    }
  };

  // Handle product click
  const handleProductClick = (product: Product) => {
    if (!currentUser) {
      setAuthModalMessage(`Sign in to rate "${product.title?.slice(0, 40)}..." and earn ₹20 cash reward!`);
      setIsAuthModalOpen(true);
      return;
    }

    if (userProfile?.status === 'inactive') {
      alert('Your reviewer account has been deactivated by the administrator. Please contact support.');
      return;
    }

    const demoDone = userProfile?.demoTasksCompleted || 0;
    const hasActivePlan = userProfile?.activePlan && userProfile.activePlan !== 'none';
    if (!hasActivePlan && demoDone >= 5) {
      setIsPlanModalOpen(true);
      return;
    }

    setSelectedProductForReview(product);
  };

  const handleReviewSubmitted = (product: Product, rewardEarned: number) => {
    setCompletedProductIds((prev) => new Set([...prev, product.id]));
    setRewardToast({
      amount: rewardEarned,
      title: product.title || 'Product Review',
    });
    setTimeout(() => {
      setRewardToast(null);
    }, 4000);
  };

  // Admin handlers
  const handleAddProductAdmin = async (newProd: Product) => {
    try {
      await setDoc(doc(db, 'products', newProd.id), newProd);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `products/${newProd.id}`);
    }
  };

  const handleUpdateProductAdmin = async (updated: Product) => {
    try {
      await setDoc(doc(db, 'products', updated.id), updated);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `products/${updated.id}`);
    }
  };

  const handleDeleteProductAdmin = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleAddBannerAdmin = async (banner: OfferBanner) => {
    try {
      await setDoc(doc(db, 'banners', banner.id), banner);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `banners/${banner.id}`);
    }
  };

  const handleDeleteBannerAdmin = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'banners', id));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `banners/${id}`);
    }
  };

  const handleToggleBannerAdmin = async (banner: OfferBanner) => {
    try {
      await setDoc(doc(db, 'banners', banner.id), {
        ...banner,
        active: !banner.active,
      });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `banners/${banner.id}`);
    }
  };

  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Safe product lists with rock-solid fallback
  const rawProducts = products && products.length > 0 ? products : INITIAL_PRODUCTS;
  const filteredCatalog = rawProducts.filter((p) => {
    if (!p) return false;
    const matchPlatform = portalFilter === 'all' || (p.platform && p.platform.toLowerCase() === portalFilter.toLowerCase());
    if (!matchPlatform) return false;
    if (!catalogSearchQuery.trim()) return true;
    const q = catalogSearchQuery.toLowerCase();
    return (
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  });

  const rawBanners = banners && banners.length > 0 ? banners : INITIAL_BANNERS;
  const activeBanners = rawBanners.filter((b) => b && b.active);

  // If user navigated to #admin
  if (isAdminRoute) {
    if (!isAdmin) {
      return (
        <SecretAdminLogin
          onSuccess={() => {
            setCurrentTab('admin');
          }}
          onBackToCustomerPortal={() => {
            window.location.hash = '';
            setIsAdminRoute(false);
            setCurrentTab('portal');
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
        <Navbar
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenWallet={() => setIsWalletModalOpen(true)}
          onOpenPlans={() => setIsPlanModalOpen(true)}
          onOpenInstallApp={() => setIsInstallModalOpen(true)}
          currentTab="admin"
          setCurrentTab={(tab) => {
            if (tab !== 'admin') {
              window.location.hash = '';
              setIsAdminRoute(false);
            }
            setCurrentTab(tab);
          }}
          isAdminRoute={true}
        />
        <main className="flex-1">
          <AdminPortal
            onBack={() => {
              window.location.hash = '';
              setIsAdminRoute(false);
              setCurrentTab('portal');
            }}
            products={rawProducts}
            banners={rawBanners}
            onAddProduct={handleAddProductAdmin}
            onUpdateProduct={handleUpdateProductAdmin}
            onDeleteProduct={handleDeleteProductAdmin}
            onAddBanner={handleAddBannerAdmin}
            onDeleteBanner={handleDeleteBannerAdmin}
            onToggleBanner={handleToggleBannerAdmin}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-16 md:pb-0">
      
      {/* Navigation */}
      <Navbar
        onOpenAuth={() => {
          setAuthModalMessage(undefined);
          setIsAuthModalOpen(true);
        }}
        onOpenWallet={() => setIsWalletModalOpen(true)}
        onOpenPlans={() => setIsPlanModalOpen(true)}
        onOpenInstallApp={() => setIsInstallModalOpen(true)}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isAdminRoute={false}
      />

      {/* Account Inactive Alert Banner across app */}
      {userProfile?.status === 'inactive' && (
        <div className="bg-rose-600 text-white py-2.5 px-4 text-center text-xs font-bold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Notice: Your reviewer account is currently deactivated by the administrator. Contact support.</span>
        </div>
      )}

      {/* Floating Earning Toast in INR (₹) */}
      {rewardToast && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
            +₹{rewardToast.amount}
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-400">Reward Credited to Wallet!</div>
            <div className="text-xs text-slate-300 max-w-xs truncate">{rewardToast.title}</div>
          </div>
        </div>
      )}

      {/* MAIN VIEW CONTROLLER */}
      <main className="flex-1">
        {currentTab === 'tasks' && currentUser ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  My Rating &amp; Review Tasks
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Automatic marketplace product feed. Earn ₹20 per verified task in INR.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsWalletModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-xs"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Wallet: ₹{userProfile?.walletBalance || 0}</span>
                </button>
              </div>
            </div>

            <TaskQueue
              products={rawProducts}
              banners={rawBanners}
              completedProductIds={completedProductIds}
              onRateProduct={handleProductClick}
              onOpenPlans={() => setIsPlanModalOpen(true)}
            />
          </div>
        ) : (
          /* DEFAULT PUBLIC BROWSE PORTAL */
          <div>
            {/* LOGGED IN REVIEWER DASHBOARD OR PUBLIC HERO */}
            {currentUser && userProfile ? (
              <section className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-8 border-b border-indigo-900/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          {userProfile.status === 'inactive' ? 'Account Suspended' : 'Active Verified Reviewer'}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          ID: #{currentUser.uid.slice(0, 8)}
                        </span>
                      </div>
                      
                      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Customer Portal — Welcome, {userProfile.displayName || 'Reviewer'}!
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                        Select any marketplace product below to rate quality, delivery speed, and claim your guaranteed ₹20 reward per task.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setIsWalletModalOpen(true)}
                        className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2.5 shadow-sm"
                      >
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          <Wallet className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Wallet Balance</div>
                          <div className="text-emerald-400 font-black">₹{userProfile.walletBalance.toLocaleString('en-IN')}</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setIsPlanModalOpen(true)}
                        className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
                      >
                        <Crown className="w-4 h-4 text-slate-950" />
                        <span>{userProfile.activePlan && userProfile.activePlan !== 'none' ? 'Membership Active' : 'Upgrade Plan'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 5-Task Demo Trial Bar */}
                  {(!userProfile.activePlan || userProfile.activePlan === 'none') && (
                    <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                          <span className="text-amber-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Free Demo Trial: {userProfile.demoTasksCompleted || 0} of 5 Tasks Completed
                          </span>
                          <span className="text-emerald-400">
                            ₹{(userProfile.demoTasksCompleted || 0) * 20} Earned
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                            style={{ width: `${Math.min(100, ((userProfile.demoTasksCompleted || 0) / 5) * 100)}%` }}
                          ></div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1.5">
                          {(userProfile.demoTasksCompleted || 0) >= 5
                            ? 'You have completed all 5 demo tasks! Select a membership package to unlock unlimited daily tasks across all portals.'
                            : `${5 - (userProfile.demoTasksCompleted || 0)} demo tasks remaining. Each rating immediately adds ₹20 to your wallet.`}
                        </p>
                      </div>

                      {(userProfile.demoTasksCompleted || 0) >= 5 && (
                        <button
                          onClick={() => setIsPlanModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs shrink-0 transition-all shadow-sm"
                        >
                          Choose Plan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              /* HERO BANNER FOR GUESTS */
              <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-12 sm:py-20">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                  <div className="text-center max-w-3xl mx-auto">
                    
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-amber-300 mb-4 shadow-sm">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Instant ₹20 Per Verified Product Review</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight sm:leading-tight">
                      Product Rating &amp; Review Earnings Portal (India)
                    </h1>

                    <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                      Test, rate, and review top trending products sourced automatically from{' '}
                      <span className="font-bold text-white">Amazon India, Flipkart, Meesho, Blinkit, Instamart &amp; Zepto</span>.
                      Earn guaranteed ₹20 for every verified rating straight to your UPI (GPay, PhonePe, Paytm) or Bank account.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                      <button
                        onClick={() => {
                          setAuthModalMessage('Sign in or register to test 5 free demo products and earn ₹100 immediately!');
                          setIsAuthModalOpen(true);
                        }}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-black text-sm shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <span>Start Free 5-Task Demo Trial</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setIsPlanModalOpen(true)}
                        className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm border border-white/20 transition-all flex items-center gap-2"
                      >
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>View Membership Packages</span>
                      </button>

                      <button
                        onClick={() => setIsInstallModalOpen(true)}
                        className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5"
                      >
                        <Smartphone className="w-4 h-4 text-indigo-400" />
                        <span>Install Mobile / PC App</span>
                      </button>
                    </div>

                    {/* 3 Step Quick Overview in INR */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-12 text-left">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                        <div className="text-amber-400 font-black text-xs uppercase tracking-wider mb-1">Step 1</div>
                        <div className="text-sm font-bold text-white">5 Free Demo Tasks</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Test system on 5 real items &amp; earn ₹100 trial balance in your wallet.
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                        <div className="text-indigo-400 font-black text-xs uppercase tracking-wider mb-1">Step 2</div>
                        <div className="text-sm font-bold text-white">Choose Membership Plan</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Choose 3 days, 7 days, 1 month, 6 months or 1 year package to unlock daily task streams.
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                        <div className="text-emerald-400 font-black text-xs uppercase tracking-wider mb-1">Step 3</div>
                        <div className="text-sm font-bold text-white">Instant UPI Cashouts</div>
                        <div className="text-xs text-slate-400 mt-1">
                          Withdraw anytime to PhonePe, Google Pay, Paytm, BHIM UPI or Bank account.
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </section>
            )}

            {/* PLATFORM TICKER & PORTAL CATALOG WITH OFFER BANNERS */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Active Marketplace Products Feed ({filteredCatalog.length} Available)
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Click any product to rate quality, delivery, and claim your guaranteed ₹20 reward.
                  </p>
                </div>

                {/* Search Bar & Filter Tabs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  <div className="w-full sm:w-56">
                    <input
                      type="text"
                      value={catalogSearchQuery}
                      onChange={(e) => setCatalogSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                    {[
                      { id: 'all', label: `All Portals (${rawProducts.length})` },
                      { id: 'amazon', label: 'Amazon India' },
                      { id: 'flipkart', label: 'Flipkart' },
                      { id: 'meesho', label: 'Meesho' },
                      { id: 'blinkit', label: 'Blinkit' },
                      { id: 'instamart', label: 'Instamart' },
                      { id: 'zepto', label: 'Zepto' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setPortalFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                          portalFilter === f.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Cards Grid Interleaved with Offer Banners */}
              {filteredCatalog.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                  <p className="text-sm font-bold text-slate-700">No products found for this portal filter.</p>
                  <button
                    onClick={() => {
                      setPortalFilter('all');
                      setCatalogSearchQuery('');
                    }}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
                  >
                    View All Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredCatalog.map((prod, index) => {
                    const isDone = completedProductIds.has(prod.id);
                    const showBanner = activeBanners.length > 0 && index > 0 && index % 4 === 0;
                    const bannerIndex = Math.floor(index / 4);
                    const currentBanner = showBanner ? activeBanners[bannerIndex % activeBanners.length] : null;

                    return (
                      <React.Fragment key={prod.id || index}>
                        {currentBanner && (
                          <OfferBannerCard
                            key={`banner-${currentBanner.id}-${index}`}
                            banner={currentBanner}
                            onAction={() => setIsPlanModalOpen(true)}
                          />
                        )}
                        <ProductCard
                          product={prod}
                          isCompleted={isDone}
                          onRateProduct={handleProductClick}
                        />
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

            </section>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 py-2 px-3 z-40 md:hidden flex items-center justify-around shadow-lg">
        <button
          onClick={() => setCurrentTab('portal')}
          className={`flex flex-col items-center gap-0.5 text-[11px] font-bold ${
            currentTab === 'portal' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Home</span>
        </button>

        {currentUser && (
          <button
            onClick={() => setCurrentTab('tasks')}
            className={`flex flex-col items-center gap-0.5 text-[11px] font-bold ${
              currentTab === 'tasks' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Tasks</span>
          </button>
        )}

        <button
          onClick={() => setIsPlanModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-amber-600"
        >
          <Crown className="w-5 h-5" />
          <span>Plans</span>
        </button>

        {currentUser && (
          <button
            onClick={() => setIsWalletModalOpen(true)}
            className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-emerald-600"
          >
            <Wallet className="w-5 h-5" />
            <span>Wallet</span>
          </button>
        )}

        <button
          onClick={() => setIsInstallModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[11px] font-bold text-slate-500"
        >
          <Smartphone className="w-5 h-5" />
          <span>App</span>
        </button>
      </nav>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              ★
            </div>
            <span className="font-bold text-slate-200">ReviewEarn India</span>
            <span>— Marketplace Rating &amp; Review System (INR ₹)</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setIsPlanModalOpen(true)} className="hover:text-white transition-colors">
              Pricing &amp; Plans
            </button>
            <button onClick={() => setIsWalletModalOpen(true)} className="hover:text-white transition-colors">
              UPI Payout Policies
            </button>
            <button onClick={() => setIsInstallModalOpen(true)} className="hover:text-white transition-colors flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile / PC App</span>
            </button>
            
            {/* Secret Admin link via #admin hash */}
            <a
              href="#admin"
              className="text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
              title="Secret Admin Access"
            >
              <Lock className="w-3 h-3" />
              <span>Admin</span>
            </a>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMessage={authModalMessage}
      />

      <ReviewModal
        product={selectedProductForReview}
        isOpen={!!selectedProductForReview}
        onClose={() => setSelectedProductForReview(null)}
        onReviewSubmitted={handleReviewSubmitted}
        onOpenPlans={() => setIsPlanModalOpen(true)}
      />

      <PlanModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        onOpenAuth={() => {
          setIsPlanModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onOpenPlans={() => {
          setIsWalletModalOpen(false);
          setIsPlanModalOpen(true);
        }}
      />

      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallClick={handleInstallClick}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
