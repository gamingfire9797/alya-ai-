import React, { useState, useRef } from 'react';
import { Check, Volume2, VolumeX, Plus, Upload, Palette } from 'lucide-react';
import { BackgroundItem } from '../../types';
import { ambientEngine } from '../../utils/audio';

interface BackgroundsScreenProps {
  backgrounds: BackgroundItem[];
  activeBackground: BackgroundItem;
  onApplyBackground: (bg: BackgroundItem) => void;
  onAddCustomBackground: (bg: BackgroundItem) => void;
}

export const BackgroundsScreen: React.FC<BackgroundsScreenProps> = ({
  backgrounds,
  activeBackground,
  onApplyBackground,
  onAddCustomBackground,
}) => {
  const [ambientActive, setAmbientActive] = useState(ambientEngine.active());
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleAmbient = () => {
    if (ambientActive) {
      ambientEngine.stop();
      setAmbientActive(false);
    } else {
      const soundType = activeBackground.ambientSound === 'none' || !activeBackground.ambientSound ? 'rain' : activeBackground.ambientSound;
      ambientEngine.start(soundType, 0.4);
      setAmbientActive(true);
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newBg: BackgroundItem = {
        id: `custom-${Date.now()}`,
        name: customName || 'Custom Wallpaper',
        theme: 'Personal',
        description: 'User uploaded custom background',
        gradient: 'from-[#1a102a] to-[#0a0512]',
        ambientSound: 'lofi',
        customUrl: dataUrl,
      };
      onAddCustomBackground(newBg);
      setShowAddCustom(false);
      setCustomName('');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden bg-black/40 backdrop-blur-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-comfortaa text-white flex items-center gap-1.5">
            Backgrounds <span className="text-pink-400 text-xs">• Atmosphere</span>
          </h2>
          <span className="text-[11px] text-pink-300/80">
            Scenic spaces and relaxing ambient sounds
          </span>
        </div>
        <button
          onClick={toggleAmbient}
          className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all ${
            ambientActive
              ? 'bg-pink-500 text-white shadow-[0_0_12px_rgba(244,114,182,0.5)] animate-pulse'
              : 'glass-panel-subtle text-slate-300 hover:text-white'
          }`}
          title="Toggle ambient audio"
        >
          {ambientActive ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <span>{ambientActive ? 'Ambience ON' : 'Ambience OFF'}</span>
        </button>
      </div>

      <div className="relative flex-1 glass-card rounded-3xl p-4 flex flex-col items-center justify-center overflow-hidden border border-pink-500/30">
        <div
          className={`absolute inset-0 bg-gradient-to-b ${activeBackground.gradient} opacity-90 transition-all duration-700`}
        />
        {activeBackground.customUrl && (
          <img
            src={activeBackground.customUrl}
            alt={activeBackground.name}
            className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="relative z-10 glass-panel rounded-2xl p-4 max-w-[320px] text-center border border-pink-500/30 shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h3 className="text-base font-bold text-white font-jakarta">
              {activeBackground.name}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-semibold border border-pink-500/30">
              {activeBackground.theme}
            </span>
          </div>
          <p className="text-xs text-slate-200 font-quicksand">
            {activeBackground.description}
          </p>
          <div className="mt-3 flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-medium">
            <Check size={14} /> Active Environment
          </div>
        </div>
      </div>

      {showAddCustom && (
        <div className="p-3.5 glass-panel rounded-2xl border border-pink-500/40 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-semibold text-pink-300">
            <span>Add Custom Background</span>
            <button onClick={() => setShowAddCustom(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Background name (e.g. My Cozy Room)"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomUpload}
          />
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Upload size={13} /> Select Image File
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div className="text-[11px] text-slate-400 px-1 font-semibold flex items-center justify-between">
          <span>Available Environments</span>
          <span className="text-[10px] text-pink-300">Tap to apply</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {backgrounds.map((bg) => {
            const isSelected = activeBackground.id === bg.id;
            return (
              <button
                key={bg.id}
                onClick={() => onApplyBackground(bg)}
                className={`p-1.5 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                  isSelected
                    ? 'glass-panel border-2 border-pink-400 shadow-[0_0_12px_rgba(244,114,182,0.4)] scale-105'
                    : 'glass-panel-subtle border border-white/10 opacity-75 hover:opacity-100 hover:border-pink-500/30'
                }`}
              >
                <div
                  className={`w-full h-11 rounded-xl bg-gradient-to-br ${bg.gradient} flex items-center justify-center relative overflow-hidden shadow-inner`}
                >
                  {bg.customUrl ? (
                    <img src={bg.customUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Palette size={14} className="text-white/40" />
                  )}
                  {isSelected && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-white truncate max-w-full">
                  {bg.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setShowAddCustom(true)}
            className="p-1.5 rounded-2xl flex flex-col items-center justify-center gap-1 glass-panel-subtle border border-dashed border-pink-500/40 hover:border-pink-400 text-pink-300 hover:text-white transition-all"
            title="Upload custom background"
          >
            <div className="w-full h-11 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <Plus size={18} />
            </div>
            <span className="text-[10px] font-bold">Custom</span>
          </button>
        </div>
      </div>
    </div>
  );
};
