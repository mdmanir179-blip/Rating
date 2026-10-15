import React from 'react';
import { 
  X, 
  Smartphone, 
  Monitor, 
  Download, 
  CheckCircle2, 
  Share, 
  PlusSquare,
  Sparkles
} from 'lucide-react';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallClick: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-500 text-white flex items-center justify-center mx-auto shadow-md mb-2">
            <Smartphone className="w-6 h-6" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Install ReviewEarn App
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Access daily product ratings &amp; reviews instantly from your Mobile Home Screen or PC Desktop!
          </p>
        </div>

        <div className="p-6 space-y-5">
          
          {/* 1-Click Install Button if supported */}
          {deferredPrompt && (
            <button
              onClick={onInstallClick}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-98"
            >
              <Download className="w-5 h-5" />
              <span>1-Click Install App on Device</span>
            </button>
          )}

          {/* Quick instructions for Mobile & PC */}
          <div className="space-y-3">
            
            {/* Android */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">Android (Chrome / Brave / Samsung)</div>
                <div className="text-slate-600 mt-0.5">
                  Tap the <strong className="text-slate-800">3 vertical dots</strong> in top right corner &gt; select <strong className="text-indigo-600">"Install app"</strong> or <strong className="text-indigo-600">"Add to Home screen"</strong>.
                </div>
              </div>
            </div>

            {/* iOS / iPhone */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <Share className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">iPhone / iPad (Safari)</div>
                <div className="text-slate-600 mt-0.5">
                  Tap the <strong className="text-slate-800">Share button</strong> at bottom of Safari &gt; scroll down and tap <strong className="text-indigo-600">"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-600" />.
                </div>
              </div>
            </div>

            {/* Windows / Mac Computer */}
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900">Windows PC &amp; Mac (Desktop App)</div>
                <div className="text-slate-600 mt-0.5">
                  In Chrome or Edge, click the <strong className="text-indigo-600">Install App icon</strong> inside the address bar (or Menu &gt; Cast, save and share &gt; Install).
                </div>
              </div>
            </div>

          </div>

          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Fast, lightweight app with zero storage usage and instant push updates.</span>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={onClose}
              className="text-xs text-slate-500 font-bold hover:text-slate-800"
            >
              Close
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
