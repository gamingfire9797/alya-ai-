import React from 'react';
import { MapPin, ShieldCheck, X, Check, Globe } from 'lucide-react';
import { TimeEngine } from '../../utils/time';
import { PermissionManager } from '../../utils/permissions';
import { playChime } from '../../utils/audio';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  onDeny: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onAllow,
  onDeny,
}) => {
  if (!isOpen) return null;

  const currentTz = TimeEngine.getTimezone();
  const currentOffset = TimeEngine.getUtcOffsetString();

  const handleDeny = () => {
    playChime('click');
    PermissionManager.markLocationDenied();
    onDeny();
    onClose();
  };

  const handleAllow = async () => {
    playChime('heart');
    await PermissionManager.requestOptionalLocation();
    onAllow();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-sm rounded-3xl glass-card border border-pink-500/30 p-5 shadow-2xl flex flex-col gap-4 text-white">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300">
              <MapPin size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white font-comfortaa">Regional Calibration</h3>
              <span className="text-[10px] text-pink-300 font-medium">Privacy-First & Optional</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDeny}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-slate-300">
          <p className="leading-relaxed">
            Alya already resolves your local timezone (<strong>{currentTz}</strong>, {currentOffset}) directly from your device clock.
          </p>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
            <div className="flex items-center gap-2 text-pink-300 font-semibold text-[11px]">
              <Globe size={13} />
              <span>Why is geographic location optional?</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Granting approximate location allows Alya to calibrate localized sunrise/sunset greetings and weather context. Your exact coordinates are <strong>never stored</strong> or transmitted.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400">
            <ShieldCheck size={14} className="shrink-0" />
            <span>If you decline, Alya continues functioning normally with your system timezone.</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleDeny}
            className="flex-1 py-2.5 px-3 rounded-xl glass-panel hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Not Now (Keep System Time)
          </button>
          <button
            type="button"
            onClick={handleAllow}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:brightness-110 text-white text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Check size={14} />
            <span>Allow Calibration</span>
          </button>
        </div>
      </div>
    </div>
  );
};
