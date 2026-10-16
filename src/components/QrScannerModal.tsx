import React, { useState } from 'react';
import { AdminSettings } from '../types';
import { X, QrCode, Copy, CheckCircle2, Smartphone, Building2, Crown, ExternalLink, Download } from 'lucide-react';
import { DEFAULT_QR_CODE_SVG } from '../utils/qrCodeHelper';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlanModal: () => void;
  settings: AdminSettings;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onOpenPlanModal,
  settings,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const qrSrc = settings.qrCodeUrl || DEFAULT_QR_CODE_SVG;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
            <QrCode className="w-4 h-4 text-emerald-400" />
            Official Payment QR Scanner
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Scan QR Code to Pay &amp; Activate Plan
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Scan using any UPI App (PhonePe, Google Pay, Paytm, BHIM) or Net Banking
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          
          {/* QR Code Scanner Display Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-indigo-50/70 to-slate-50 border-2 border-indigo-100 flex flex-col items-center justify-center text-center shadow-inner">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-xs text-xs font-bold text-indigo-700 mb-3 border border-indigo-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Admin Verified BHIM UPI QR Code
            </div>

            <div className="relative p-3 bg-white rounded-2xl shadow-md border border-slate-200 group">
              <img
                src={qrSrc}
                alt="Payment QR Code Scanner"
                className="w-52 h-52 sm:w-60 sm:h-60 object-contain rounded-xl"
                onError={(e: any) => {
                  e.currentTarget.src = DEFAULT_QR_CODE_SVG;
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-900/40 rounded-2xl transition-opacity pointer-events-none">
                <span className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-lg">
                  Scan with Camera or UPI App
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <a
                href={qrSrc}
                download="Payment_QR_Code.png"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Save QR Image</span>
              </a>
              <span className="text-xs text-slate-500">or scan directly from screen</span>
            </div>
          </div>

          {/* Quick Payment Channel Options */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Direct Payment Channels
            </div>

            {/* UPI ID */}
            {settings.upiId && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                    UPI
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">Official UPI ID / VPA</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                      {settings.upiId}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.upiId, 'upi')}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 hover:text-indigo-600 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                >
                  {copiedKey === 'upi' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* PhonePe / GPay */}
            {settings.phonePeNumber && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-purple-200 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white font-bold text-xs flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-semibold uppercase">PhonePe / Google Pay / Paytm</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono">
                      {settings.phonePeNumber}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings.phonePeNumber, 'phone')}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-purple-50 border border-slate-200 text-slate-600 hover:text-purple-600 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                >
                  {copiedKey === 'phone' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Bank Transfer Details */}
            {settings.bankAccountNo && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Bank Transfer / IMPS</div>
                      <div className="text-xs font-bold text-slate-900">{settings.bankName}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`${settings.bankAccountNo} ${settings.bankIfsc}`, 'bank')}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 text-slate-600 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    {copiedKey === 'bank' ? (
                      <span className="text-emerald-600">Copied</span>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Details</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                  <div><strong>A/C:</strong> {settings.bankAccountNo}</div>
                  <div><strong>IFSC:</strong> {settings.bankIfsc}</div>
                  <div><strong>Beneficiary:</strong> {settings.accountHolderName}</div>
                </div>
              </div>
            )}
          </div>

          {/* Action Step */}
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-indigo-950">
                Already Scanned &amp; Paid?
              </div>
              <div className="text-[11px] text-indigo-800">
                Submit your 12-digit UPI UTR / Transaction ID to unlock unlimited reviewer tasks.
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenPlanModal();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
            >
              <Crown className="w-4 h-4 text-amber-300" />
              <span>Submit Payment Proof</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
