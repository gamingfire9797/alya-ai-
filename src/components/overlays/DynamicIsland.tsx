import React from 'react';
import { LiveAudioWave } from '../character/LiveAudioWave';

interface DynamicIslandProps {
  visible: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  statusText?: string;
  onTap: () => void;
}

export const DynamicIsland: React.FC<DynamicIslandProps> = ({
  visible,
  isSpeaking,
  isListening,
  statusText,
  onTap,
}) => {
  if (!visible && !isSpeaking && !isListening) return null;

  return (
    <div
      onClick={onTap}
      className="absolute top-1 left-1/2 -translate-x-1/2 z-40 select-none cursor-pointer group"
    >
      <div className="bg-black/95 text-white border border-pink-500/30 px-3.5 py-1 rounded-full shadow-[0_4px_25px_rgba(244,114,182,0.3)] flex items-center gap-2.5 transition-all duration-300 hover:scale-105 active:scale-95">
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 p-[1px] flex-shrink-0">
          <div className="w-full h-full rounded-full bg-[#1b1427] flex items-center justify-center text-[9px]">
            🌸
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium font-quicksand">
          <span className="font-bold text-pink-300">Alya</span>
          <span className="text-slate-300 text-[10px]">
            {statusText || (isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Background Service')}
          </span>
        </div>
        <LiveAudioWave
          active={isSpeaking || isListening}
          type="mini-wave"
          color={isSpeaking ? 'purple' : 'cyan'}
          className="h-4"
        />
      </div>
    </div>
  );
};
