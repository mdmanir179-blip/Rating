import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Star, 
  Wallet, 
  Sparkles, 
  LogOut, 
  LogIn, 
  Crown,
  Layers,
  Smartphone,
  ShieldCheck,
  QrCode
} from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  onOpenWallet: () => void;
  onOpenPlans: () => void;
  onOpenInstallApp?: () => void;
  onOpenQrScanner?: () => void;
  currentTab: 'portal' | 'tasks' | 'admin';
  setCurrentTab: (tab: 'portal' | 'tasks' | 'admin') => void;
  isAdminRoute?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenWallet,
  onOpenPlans,
  onOpenInstallApp,
  onOpenQrScanner,
  currentTab,
  setCurrentTab,
  isAdminRoute,
}) => {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  const isLoggedIn = Boolean(currentUser || userProfile);

  const getPlanBadge = () => {
    if (!userProfile) return null;
    if (userProfile.activePlan && userProfile.activePlan !== 'none') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <Crown className="w-3.5 h-3.5 text-emerald-500" />
          {userProfile.activePlan.replace('_', ' ').toUpperCase()} ACTIVE
        </span>
      );
    }
    const remaining = Math.max(0, 5 - (userProfile.demoTasksCompleted || 0));
    return (
      <button
        onClick={onOpenPlans}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
        Trial ({remaining}/5 tasks left) • Upgrade
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('portal')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-amber-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-xl">
              <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900">ReviewEarn</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  INDIA PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Marketplace Ratings &amp; Rewards (INR ₹)</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
            <button
              onClick={() => setCurrentTab('portal')}
              className={`px-3 py-2 rounded-lg transition-colors ${
                currentTab === 'portal'
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Customer Portal
            </button>

            {isLoggedIn && (
              <button
                onClick={() => setCurrentTab('tasks')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 ${
                  currentTab === 'tasks'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                My Rating Tasks
              </button>
            )}

            <button
              onClick={onOpenPlans}
              className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 text-slate-700"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              Plans &amp; Packages
            </button>

            {/* Payment QR Scanner Button */}
            {onOpenQrScanner && (
              <button
                onClick={onOpenQrScanner}
                className="px-3 py-2 rounded-lg text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 font-bold text-xs border border-emerald-200 shadow-2xs"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>QR Scanner</span>
              </button>
            )}

            {/* Install App Button */}
            {onOpenInstallApp && (
              <button
                onClick={onOpenInstallApp}
                className="px-3 py-2 rounded-lg text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100/80 transition-colors flex items-center gap-1 font-semibold text-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>App for Mobile / PC</span>
              </button>
            )}

            {/* Secret Admin access indicator - ONLY shown if on #admin route and is admin */}
            {isAdminRoute && isAdmin && (
              <button
                onClick={() => setCurrentTab('admin')}
                className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-800 font-bold text-xs flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Mobile QR Scanner quick button */}
            {onOpenQrScanner && (
              <button
                onClick={onOpenQrScanner}
                title="Scan QR Code to Pay"
                className="sm:hidden p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center shadow-2xs"
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
              </button>
            )}
            {isLoggedIn && userProfile ? (
              <>
                {/* Active Plan Tag */}
                <div className="hidden lg:block">
                  {getPlanBadge()}
                </div>

                {/* Wallet Balance Widget in INR (₹) */}
                <button
                  onClick={onOpenWallet}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm group"
                  title="Click to view Wallet & Cashout in INR"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold leading-none">Wallet</div>
                    <div className="text-sm font-bold text-emerald-400 group-hover:text-emerald-300">
                      ₹{userProfile.walletBalance.toLocaleString('en-IN')}
                    </div>
                  </div>
                </button>

                {/* User Dropdown */}
                <div className="relative flex items-center gap-2 pl-1 border-l border-slate-200">
                  <div className="flex items-center gap-2">
                    <img
                      src={userProfile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.id}`}
                      alt={userProfile.displayName}
                      className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                    />
                    <div className="hidden xl:block text-left">
                      <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[110px]">
                        {userProfile.displayName}
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        {userProfile.status === 'inactive' ? 'Suspended' : 'Reviewer'}
                      </div>
                    </div>
                  </div>

                  {/* Logout Button */}
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenPlans}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  View Plans
                </button>

                <button
                  onClick={onOpenAuth}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-blue-700 transition-all active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Reviewer Login</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
