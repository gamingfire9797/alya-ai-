import React, { useState } from 'react';
import {
  Key,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { CompanionCharacter } from '../../types';
import { apiFetch } from '../../utils/apiConfig';

interface ApiKeySetupScreenProps {
  currentCompanion: CompanionCharacter;
  savedApiKey: string;
  hasServerKey: boolean;
  onSaveKeyAndProceed: (key: string) => void;
  onSkipWithServerDefault?: () => void;
  onBack?: () => void;
}

export const ApiKeySetupScreen: React.FC<ApiKeySetupScreenProps> = ({
  currentCompanion,
  savedApiKey,
  hasServerKey,
  onSaveKeyAndProceed,
  onSkipWithServerDefault,
  onBack,
}) => {
  const [apiKey, setApiKey] = useState(savedApiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error' | 'quota';
    message: string;
  }>({ status: 'idle', message: '' });

  const isJarvis = currentCompanion === 'jarvis';

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest && !hasServerKey) {
      setTestResult({
        status: 'error',
        message: 'Please enter a Gemini API key first.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult({ status: 'idle', message: '' });

    try {
      const res = await apiFetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest || undefined }),
      });
      const data = await res.json();
      if (data.valid) {
        setTestResult({
          status: 'success',
          message: data.message || 'Connected successfully to Gemini API! Neural intelligence verified.',
        });
      } else {
        if (data.errorType === 'quota') {
          setTestResult({
            status: 'quota',
            message: data.message || 'API quota reached. Please check rate limits in Google AI Studio.',
          });
        } else {
          setTestResult({
            status: 'error',
            message: data.message || 'Invalid API key. Please check your key and try again.',
          });
        }
      }
    } catch {
      setTestResult({
        status: 'error',
        message: 'Network connection error. Please check your internet connection.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed && !hasServerKey) {
      setTestResult({
        status: 'error',
        message: 'Please enter a Gemini API key to continue.',
      });
      return;
    }
    onSaveKeyAndProceed(trimmed);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-y-auto bg-[#05030a] text-white p-5 select-none">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[110px] transition-all duration-700 ${
            isJarvis ? 'bg-amber-600/20' : 'bg-pink-600/20'
          }`}
        />
        <div
          className={`absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[110px] transition-all duration-700 ${
            isJarvis ? 'bg-yellow-600/15' : 'bg-purple-600/20'
          }`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <div className="relative z-10 pt-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                title="Back to profile setup"
              >
                <ArrowLeft size={14} />
              </button>
            )}
            <div
              className={`w-7 h-7 rounded-full p-[1.5px] ${
                isJarvis
                  ? 'bg-gradient-to-tr from-amber-500 to-yellow-500'
                  : 'bg-gradient-to-tr from-pink-500 to-purple-500'
              }`}
            >
              <div className="w-full h-full rounded-full bg-[#120a1f] flex items-center justify-center font-bold text-xs">
                {isJarvis ? '⚡' : '🌸'}
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold font-comfortaa text-white tracking-wide">
                {isJarvis ? 'Jarvis' : 'Alya'} AI
              </h1>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-slate-400">
            Step 4 of 5
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isJarvis ? 'bg-gradient-to-r from-amber-500 to-yellow-400 w-4/5' : 'bg-gradient-to-r from-pink-500 to-purple-500 w-4/5'
            }`}
          />
        </div>
      </div>

      <div className="relative z-10 max-w-sm w-full mx-auto my-auto py-4 space-y-4">
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl glass-panel border border-white/15 mb-1 shadow-lg">
            <Key
              size={24}
              className={isJarvis ? 'text-amber-400' : 'text-pink-400'}
            />
          </div>
          <h2 className="text-xl font-extrabold text-white font-comfortaa tracking-tight">
            Connect Gemini AI Engine
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed font-quicksand">
            Powered by Google's{' '}
            <span className="text-white font-semibold">Gemini 3.8 Flash</span> engine for
            intelligent conversation, low-latency neural voice, and bilingual dialogue.
          </p>
        </div>

        {hasServerKey && (
          <div className="p-2.5 rounded-xl glass-panel border border-emerald-500/30 bg-emerald-950/20 text-xs flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-emerald-200/90 leading-tight">
              <span className="font-semibold text-emerald-300">Server Key Available: </span>
              Default connection active. You can also add your own key for dedicated quota.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-200">
            Gemini API Key (Optional with Server Default)
          </label>
          <div className="relative flex items-center">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                if (testResult.status !== 'idle') {
                  setTestResult({ status: 'idle', message: '' });
                }
              }}
              placeholder="AIzaSy..."
              className="w-full pl-3.5 pr-10 py-3 rounded-xl bg-black/60 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/50 font-mono tracking-wider transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 text-slate-400 hover:text-white transition-colors"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-slate-400">Never shared or logged</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 font-semibold transition-colors ${
                isJarvis ? 'text-amber-400 hover:text-amber-300' : 'text-pink-400 hover:text-pink-300'
              }`}
            >
              <span>Get Free Gemini Key</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {testResult.status !== 'idle' && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-fadeIn ${
              testResult.status === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : testResult.status === 'quota'
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            {testResult.status === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="leading-snug text-[11px]">{testResult.message}</div>
          </div>
        )}

        <div className="p-2.5 rounded-xl glass-panel-subtle border border-white/5 text-[10px] text-slate-400 leading-normal flex items-start gap-2">
          <Shield size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
          <span>
            Stored safely in local device storage.
          </span>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTesting}
            className="w-full py-2.5 px-4 rounded-xl border border-white/20 glass-panel hover:bg-white/10 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Validating with Gemini 3.8 Flash...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Test Connection</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleSaveAndConnect}
            disabled={isTesting}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg transition-all ${
              isJarvis
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-[0_0_20px_rgba(244,114,182,0.4)]'
            }`}
          >
            <span>Save & Connect</span>
            <ArrowRight size={15} />
          </button>
          {hasServerKey && onSkipWithServerDefault && (
            <button
              type="button"
              onClick={onSkipWithServerDefault}
              className="w-full py-2 text-center text-[11px] text-slate-400 hover:text-white transition-colors"
            >
              Continue using default server connection →
            </button>
          )}
        </div>
      </div>

      <div className="relative z-10 text-center text-[10px] text-slate-500 font-mono tracking-wider pt-2">
        Alya AI • Gemini 3.8 Flash Engine
      </div>
    </div>
  );
};
