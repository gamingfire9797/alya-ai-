import React, { useEffect, useState } from 'react';

interface LiveAudioWaveProps {
  active: boolean;
  type?: 'circular' | 'bars' | 'mini-wave';
  color?: 'pink' | 'cyan' | 'purple' | 'gold';
  className?: string;
}

export const LiveAudioWave: React.FC<LiveAudioWaveProps> = ({
  active,
  type = 'circular',
  color = 'pink',
  className = '',
}) => {
  const [heights, setHeights] = useState<number[]>([40, 65, 90, 45, 75, 30, 85, 60]);

  useEffect(() => {
    if (!active) {
      setHeights([25, 30, 25, 35, 30, 25, 30, 25]);
      return;
    }

    const interval = setInterval(() => {
      setHeights((prev) =>
        prev.map(() => 20 + Math.floor(Math.random() * 75))
      );
    }, 100);

    return () => clearInterval(interval);
  }, [active]);

  if (type === 'mini-wave') {
    return (
      <div className={`flex items-center gap-[3px] h-6 px-1 ${className}`}>
        {heights.slice(0, 5).map((h, i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-all duration-150 ${
              color === 'gold'
                ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                : color === 'cyan'
                ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                : color === 'purple'
                ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
                : 'bg-pink-400 shadow-[0_0_8px_#f472b6]'
            }`}
            style={{
              height: active ? `${Math.max(4, h * 0.28)}px` : '4px',
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'bars') {
    return (
      <div className={`flex items-center justify-center gap-1.5 h-16 ${className}`}>
        {heights.map((h, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-100 ${
              color === 'gold'
                ? 'bg-gradient-to-t from-amber-500 to-yellow-300 shadow-[0_0_10px_#f59e0b]'
                : color === 'cyan'
                ? 'bg-gradient-to-t from-cyan-500 to-sky-300 shadow-[0_0_10px_#22d3ee]'
                : color === 'purple'
                ? 'bg-gradient-to-t from-purple-500 to-pink-300 shadow-[0_0_10px_#c084fc]'
                : 'bg-gradient-to-t from-rose-500 via-pink-400 to-pink-200 shadow-[0_0_10px_#f472b6]'
            }`}
            style={{
              height: active ? `${Math.max(8, h * 0.65)}px` : '8px',
            }}
          />
        ))}
      </div>
    );
  }

  const isGold = color === 'gold';
  return (
    <div className={`relative flex items-center justify-center w-36 h-36 ${className}`}>
      {active && (
        <>
          <div
            className={`absolute inset-0 rounded-full border-2 animate-ping opacity-75 ${
              isGold ? 'border-amber-500/40' : 'border-pink-500/40'
            }`}
          />
          <div
            className={`absolute -inset-4 rounded-full border animate-pulse ${
              isGold ? 'border-amber-400/30' : 'border-pink-400/30'
            }`}
          />
          <div
            className={`absolute -inset-8 rounded-full border animate-pulse duration-1000 ${
              isGold ? 'border-yellow-400/20' : 'border-cyan-400/20'
            }`}
          />
        </>
      )}

      <div
        className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
          active
            ? isGold
              ? 'bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.85)] scale-105'
              : 'bg-gradient-to-tr from-pink-600 via-rose-500 to-purple-500 shadow-[0_0_35px_rgba(244,114,182,0.85)] scale-105'
            : isGold
            ? 'bg-gradient-to-tr from-amber-950/60 to-yellow-950/60 border border-amber-500/30 hover:border-amber-400'
            : 'bg-gradient-to-tr from-pink-900/60 to-purple-900/60 border border-pink-500/30 hover:border-pink-400'
        }`}
      >
        <div className="flex items-center gap-1">
          {heights.slice(0, 5).map((h, i) => (
            <span
              key={i}
              className="w-1 bg-white rounded-full transition-all duration-100"
              style={{
                height: active ? `${Math.max(6, h * 0.35)}px` : '6px',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
