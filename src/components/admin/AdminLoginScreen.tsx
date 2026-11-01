import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  HelpCircle,
  LogOut,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../../utils/apiConfig';

interface AdminLoginScreenProps {
  onLoginSuccess: (token: string, email: string) => void;
  onBackToApp: () => void;
  hasActiveSession?: boolean;
  onLogoutSession?: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  onLoginSuccess,
  onBackToApp,
  hasActiveSession = false,
  onLogoutSession,
}) => {
  const [adminCode, setAdminCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    if (!adminCode.trim()) {
      setErrorMessage('Please enter the administrative access code.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminCode: adminCode.trim(),
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        if (data.lockedSeconds) {
          setLockoutSeconds(data.lockedSeconds);
        }
        setErrorMessage(data.error || 'Authentication failed. Please verify your Admin Code.');
        return;
      }

      onLoginSuccess(data.token, data.email || 'admin@alya.ai');
    } catch {
      setLoading(false);
      setErrorMessage('Connection error. Unable to reach security gateway.');
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-gradient-to-b from-[#12081f] via-[#0d0717] to-[#04020a] p-4 text-white select-none">
      <div className="flex items-center justify-between z-10 pt-2">
        <button
          type="button"
          onClick={onBackToApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-panel border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Cancel & Return</span>
        </button>
        <div className="flex items-center gap-2">
          {hasActiveSession && onLogoutSession && (
            <button
              type="button"
              onClick={onLogoutSession}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
              title="Terminate existing session"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
            <ShieldAlert size={14} className="text-rose-400 animate-pulse" />
            <span>Admin Control Portal</span>
          </div>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto my-auto py-6 space-y-4 z-10">
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-tr from-rose-600 via-pink-600 to-purple-600 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.4)]">
            <Lock size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold font-comfortaa tracking-wide text-white">
            Alya AI Admin Control
          </h1>
          <p className="text-xs text-slate-400">
            Enter the authorized Admin Code to unlock the administrative cockpit.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2 shadow-lg animate-fadeIn">
            <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <div className="font-semibold">{errorMessage}</div>
              {lockoutSeconds > 0 && (
                <div className="text-[11px] font-mono text-rose-300">
                  Rate limit lockout active: {lockoutSeconds}s remaining before retry.
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleVerify} className="glass-card rounded-2xl p-5 border border-white/10 space-y-4 shadow-2xl">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <KeyRound size={13} className="text-pink-400" />
                <span>Admin Code</span>
                <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="text-[11px] text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1 transition-colors"
              >
                {showCode ? (
                  <>
                    <EyeOff size={13} />
                    <span>Hide Code</span>
                  </>
                ) : (
                  <>
                    <Eye size={13} />
                    <span>Show Code</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative flex items-center">
              <input
                type={showCode ? 'text' : 'password'}
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="Enter secret Admin Code..."
                required
                autoFocus
                disabled={loading || lockoutSeconds > 0}
                className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all font-mono tracking-widest"
              />
              <div className="absolute right-3 text-slate-500">
                <Lock size={15} />
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              Admin Code is verified strictly on the server with salted cryptographic hashing.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onBackToApp}
              disabled={loading}
              className="w-1/3 py-2.5 rounded-xl glass-panel hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              <XCircle size={14} />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={loading || lockoutSeconds > 0}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
                loading || lockoutSeconds > 0
                  ? 'bg-rose-900/50 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.35)] active:scale-98'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <KeyRound size={15} />
                  <span>Verify Admin Code</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="p-3 rounded-xl glass-panel border border-white/5 text-[11px] text-slate-400 space-y-1">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <HelpCircle size={13} className="text-pink-400" />
            <span>Security & Anti-Brute-Force Safeguards</span>
          </div>
          <p>
            The Admin Code is configured securely through server environment secrets and is never transmitted to ordinary clients.
          </p>
          <p>
            Rate limiting triggers a 15-minute security lockout after 5 invalid attempts without exposing partial character clues.
          </p>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500 py-2">
        Alya AI Security Gateway • Zero-Knowledge Private Storage Architecture
      </div>
    </div>
  );
};
