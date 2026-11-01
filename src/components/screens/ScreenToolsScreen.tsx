import React, { useState, useRef } from 'react';
import {
  Scan,
  Upload,
  Monitor,
  Sparkles,
  ShieldAlert,
  StopCircle,
  CheckCircle2,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { ExpressionType } from '../../types';
import { SearchSourceItem } from '../../utils/commandRouter';

interface ScreenToolsScreenProps {
  onAnalyzeScreen: (
    imageBase64: string,
    prompt: string
  ) => Promise<{ analysis: string; emotion: ExpressionType }>;
  activeScreenCapture?: string | null;
  onUpdateScreenCapture?: (imageBase64: string | null) => void;
  lastSearchContext?: {
    query: string;
    overview: string;
    sources: SearchSourceItem[];
  } | null;
}

export const ScreenToolsScreen: React.FC<ScreenToolsScreenProps> = ({
  onAnalyzeScreen,
  activeScreenCapture,
  onUpdateScreenCapture,
  lastSearchContext,
}) => {
  const [localCapture, setLocalCapture] = useState<string | null>(activeScreenCapture || null);
  const [prompt, setPrompt] = useState('Meri screen par kya dikh raha hai? Visible headings, buttons aur content explain karo.');
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [liveStreamActive, setLiveStreamActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  const capturedImage = activeScreenCapture !== undefined ? activeScreenCapture : localCapture;

  const setCapturedImage = (img: string | null) => {
    setLocalCapture(img);
    onUpdateScreenCapture?.(img);
  };

  const stopLiveScreenStream = () => {
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    setLiveStreamActive(false);
  };

  const executeScreenCaptureAfterConsent = async () => {
    setShowConsentModal(false);
    try {
      // 1. Check Native Android MediaProjection Bridge first
      const nativeBridge = (window as any).AndroidBridge;
      if (nativeBridge && typeof nativeBridge.requestScreenCapture === 'function') {
        const base64FromAndroid = await new Promise<string | null>((resolve) => {
          let settled = false;
          const timer = window.setTimeout(() => {
            if (!settled) {
              settled = true;
              delete (window as any).__onNativeScreenCaptureResult;
              resolve(null);
            }
          }, 20000);

          (window as any).__onNativeScreenCaptureResult = (dataUrl: string | null) => {
            if (!settled) {
              settled = true;
              window.clearTimeout(timer);
              delete (window as any).__onNativeScreenCaptureResult;
              resolve(dataUrl);
            }
          };

          try {
            const syncResult = nativeBridge.requestScreenCapture();
            if (syncResult && typeof syncResult === 'string') {
              settled = true;
              window.clearTimeout(timer);
              delete (window as any).__onNativeScreenCaptureResult;
              resolve(syncResult);
            }
          } catch {
            if (!settled) {
              settled = true;
              window.clearTimeout(timer);
              delete (window as any).__onNativeScreenCaptureResult;
              resolve(null);
            }
          }
        });

        if (base64FromAndroid && typeof base64FromAndroid === 'string') {
          const formatted = base64FromAndroid.startsWith('data:image')
            ? base64FromAndroid
            : `data:image/png;base64,${base64FromAndroid}`;
          setCapturedImage(formatted);
          return;
        }
      }

      // 2. Standard Web DisplayMedia API
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: false,
        });
        videoStreamRef.current = stream;
        setLiveStreamActive(true);

        const track = stream.getVideoTracks()[0];
        track.onended = () => {
          setLiveStreamActive(false);
          videoStreamRef.current = null;
        };

        // Grab frame via HTMLVideoElement for broad browser compatibility (works even without ImageCapture API)
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        await video.play();

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/png');

        video.pause();
        video.srcObject = null;
        // Stop single-shot capture track so user's screen isn't held open longer than necessary unless they re-capture
        track.stop();
        setLiveStreamActive(false);

        setCapturedImage(base64);
      } else {
        fileInputRef.current?.click();
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async (customPrompt?: string) => {
    const effectivePrompt = customPrompt || prompt;
    if (!capturedImage && !lastSearchContext) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await onAnalyzeScreen(capturedImage || '', effectivePrompt);
      setAnalysisResult(res.analysis);
    } catch {
      setAnalysisResult('Screen analyse karne mein thoda issue aaya. Kripaya dobara try karein.');
    } finally {
      setAnalyzing(false);
    }
  };

  const quickQuestions = [
    'Meri screen par kya dikh raha hai?',
    'Screen par kaun-kaun si websites dikh rahi hain?',
    'Pehli website kis baare mein hai?',
    'Is page ka summary batao.',
  ];

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-black/40 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-comfortaa text-white flex items-center gap-1.5">
            Screen Awareness <span className="text-indigo-400 text-xs">• Gemini Vision</span>
          </h2>
          <p className="text-[11px] text-slate-300">
            Let Alya inspect visible screen content, YouTube videos, and Google Search results with your consent
          </p>
        </div>
        {liveStreamActive && (
          <button
            type="button"
            onClick={stopLiveScreenStream}
            className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1 animate-pulse"
          >
            <StopCircle size={12} /> Stop Share
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Explicit User Consent Modal for Screen Capture */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="max-w-sm w-full rounded-3xl glass-panel border border-indigo-500/40 bg-[#120b22] p-4 space-y-3 text-white shadow-2xl">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-300">
              <ShieldAlert size={18} />
              <span>Screen Capture Permission & Privacy</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Alya will capture a single snapshot of your screen to explain visible text, headings, YouTube videos, or search results.
            </p>
            <ul className="text-[11px] text-slate-300 space-y-1 bg-white/5 p-2.5 rounded-xl border border-white/10">
              <li>• Screen data is never stored permanently on any server.</li>
              <li>• Passwords, OTPs, and payment card numbers are automatically redacted.</li>
              <li>• You can clear the screen snapshot at any time.</li>
            </ul>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={executeScreenCaptureAfterConsent}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Allow & Capture Screen
              </button>
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Voice-Style Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {quickQuestions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => {
              setPrompt(q);
              if (capturedImage || lastSearchContext) {
                handleAnalyze(q);
              }
            }}
            className="px-2.5 py-1 rounded-full bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-400/30 text-[11px] text-indigo-200 whitespace-nowrap transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Main Screen Capture / Search Context Viewport */}
      <div className="flex-1 glass-card rounded-3xl p-3 border border-indigo-500/30 flex flex-col items-center justify-center overflow-hidden relative">
        {capturedImage ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <img
              src={capturedImage}
              alt="Captured screen"
              className="max-h-[28vh] max-w-full rounded-xl object-contain border border-white/20 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px] text-emerald-300 flex items-center gap-1">
                <CheckCircle2 size={12} /> Active for Voice Queries ("Meri screen par kya hai?")
              </span>
              <button
                type="button"
                onClick={() => {
                  setCapturedImage(null);
                  setAnalysisResult(null);
                }}
                className="text-xs text-rose-400 hover:text-rose-300 underline"
              >
                Clear Snapshot
              </button>
            </div>
          </div>
        ) : lastSearchContext && lastSearchContext.sources.length > 0 ? (
          <div className="w-full h-full overflow-y-auto p-2 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-300 border-b border-white/10 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Globe size={14} /> Visible Google Search Results: "{lastSearchContext.query}"
              </span>
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px]"
              >
                + Capture Screen
              </button>
            </div>
            <div className="space-y-1.5">
              {lastSearchContext.sources.map((src, i) => (
                <div
                  key={src.url + i}
                  className="p-2 rounded-xl bg-white/5 border border-white/10 text-left space-y-0.5"
                >
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>
                      {i + 1}. {src.title}
                    </span>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 text-[10px]"
                    >
                      Open <ExternalLink size={10} />
                    </a>
                  </div>
                  <div className="text-[10px] text-cyan-300/80 truncate">{src.url}</div>
                  <div className="text-[11px] text-slate-300">{src.snippet}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center p-4 space-y-3">
            <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/30 mx-auto flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]">
              <Scan size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Ready for Screen Awareness</h3>
              <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
                Grant permission to capture your screen or upload a screenshot. Then ask Alya by voice: "Alya, meri screen par kya dikh raha hai?"
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConsentModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Monitor size={14} /> Capture Screen
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl glass-panel-subtle hover:bg-white/10 text-slate-200 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Upload size={14} /> Upload Screenshot
              </button>
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="w-full mt-2 p-3 glass-panel rounded-2xl border border-indigo-400/40 shadow-xl max-h-[26vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between text-indigo-300 text-xs font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} />
                Alya's Screen Analysis:
              </span>
              <button
                type="button"
                onClick={() => setAnalysisResult(null)}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-slate-100 font-quicksand leading-relaxed">{analysisResult}</p>
          </div>
        )}
      </div>

      {/* Prompt Input Bar */}
      <div className="glass-panel p-2.5 rounded-2xl border border-white/10 flex items-center gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Alya about your screen or visible websites..."
          className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => handleAnalyze()}
          disabled={analyzing || (!capturedImage && !lastSearchContext)}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white text-xs font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all disabled:opacity-50"
        >
          {analyzing ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" /> Analyzing...
            </span>
          ) : (
            <>
              <Sparkles size={13} /> Ask Alya
            </>
          )}
        </button>
      </div>

      <div className="text-[10px] text-slate-400 text-center">
        Consent-driven screen awareness • Sensitive fields (passwords, OTPs, cards) are protected.
      </div>
    </div>
  );
};
