import React, { useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { CompanionCharacter } from '../../types';
import { HolographicAvatar } from '../character/HolographicAvatar';

interface SplashScreenProps {
  currentCompanion: CompanionCharacter;
  onSelectCompanion: (char: CompanionCharacter) => void;
  onEnterApp: () => void;
  hasGeminiKey: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  currentCompanion,
  onSelectCompanion,
  onEnterApp,
  hasGeminiKey,
}) => {
  const [selected, setSelected] = useState<CompanionCharacter>(currentCompanion);

  const handleSelect = (char: CompanionCharacter) => {
    setSelected(char);
    onSelectCompanion(char);
  };

  const isJarvis = selected === 'jarvis';

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden bg-[#040207] text-white p-6 select-none">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={`absolute -top-24 -left-20 w-96 h-96 rounded-full blur-[120px] transition-all duration-700 ${
            isJarvis ? 'bg-amber-600/15' : 'bg-pink-600/15'
          }`}
        />
        <div
          className={`absolute -bottom-24 -right-20 w-96 h-96 rounded-full blur-[130px] transition-all duration-700 ${
            isJarvis ? 'bg-yellow-600/15' : 'bg-purple-600/20'
          }`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      <div className="relative z-10 flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full animate-ping ${
              isJarvis ? 'bg-amber-400' : 'bg-pink-400'
            }`}
          />
          <span className="text-xs uppercase tracking-widest text-slate-400 font-mono">
            Alya AI • Neural Core v3.8
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel border border-white/10 text-[11px] text-emerald-400">
          <CheckCircle2 size={12} />
          <span>{hasGeminiKey ? 'Gemini 3.8 Flash Active' : 'Offline Engine'}</span>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-3">
        <div className="relative flex items-center justify-center mb-4">
          <HolographicAvatar
            character={selected}
            expression="happy"
            size="lg"
            className="animate-pulse"
          />
        </div>

        <div className="text-center space-y-1.5 max-w-sm">
          <h1
            className={`text-3xl font-extrabold font-comfortaa tracking-wide drop-shadow-md transition-colors ${
              isJarvis ? 'text-amber-300' : 'text-pink-300'
            }`}
          >
            {isJarvis ? 'Jarvis' : 'Alya'} AI Companion
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed font-quicksand">
            {isJarvis
              ? 'Tactical, intelligent, composed male AI with Deep & Normal voice configurations and system diagnostics.'
              : 'Warm, empathetic, anime-inspired female companion with natural neural speech and emotional intelligence.'}
          </p>
        </div>

        <div className="mt-6 w-full max-w-xs grid grid-cols-2 gap-2.5 p-1 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => handleSelect('alya')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all font-semibold text-xs ${
              !isJarvis
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌸</span>
            <span>Alya (Female)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelect('jarvis')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl transition-all font-semibold text-xs ${
              isJarvis
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⚡</span>
            <span>Jarvis (Male)</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col items-center gap-2 pb-2">
        <button
          type="button"
          onClick={onEnterApp}
          className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-xl ${
            isJarvis
              ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.35)]'
              : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-[0_0_25px_rgba(244,114,182,0.35)]'
          }`}
        >
          <span>Initialize Companion</span>
          <ArrowRight size={17} />
        </button>
        <span className="text-[11px] text-slate-500 font-mono tracking-wider">
          Voice Engine • Hands-Free Auto • Gemini 3.8 Flash
        </span>
      </div>
    </div>
  );
};
