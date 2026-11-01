import React, { useState } from 'react';
import {
  X,
  Palette,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  CompanionCharacter,
  CoreCustomization,
  AlyaAnimationStyle,
  JarvisAnimationStyle,
  CoreParticleStyle,
  AnimationState,
} from '../../types';
import { HolographicAvatar } from '../character/HolographicAvatar';

interface CoreCustomizationStudioProps {
  isOpen: boolean;
  onClose: () => void;
  activeCompanion: CompanionCharacter;
  onSwitchCompanion: (c: CompanionCharacter) => void;
  customization: CoreCustomization;
  onSaveCustomization: (c: CoreCustomization) => void;
}

const COLOR_PRESETS = [
  { name: 'Pink Neon', hex: '#ff269f' },
  { name: 'Purple Cosmic', hex: '#b026ff' },
  { name: 'Ruby Red', hex: '#ff2a5f' },
  { name: 'Amber Gold', hex: '#ff8526' },
  { name: 'Solar Yellow', hex: '#ffd226' },
  { name: 'Emerald Green', hex: '#00ff88' },
  { name: 'Cyan Reactor', hex: '#00e5ff' },
  { name: 'Pure Diamond', hex: '#ffffff' },
];

const ALYA_STYLES: { id: AlyaAnimationStyle; name: string; icon: string }[] = [
  { id: 'default_orbit', name: 'Default Orbit', icon: '🌸' },
  { id: 'lotus_bloom', name: 'Lotus Bloom', icon: '🪷' },
  { id: 'heart_core', name: 'Heart Core', icon: '💖' },
  { id: 'wave_flow', name: 'Wave Flow', icon: '🌊' },
  { id: 'particle_ring', name: 'Particle Ring', icon: '💫' },
  { id: 'cosmic_swirl', name: 'Cosmic Swirl', icon: '🌌' },
  { id: 'petal_flow', name: 'Petal Flow', icon: '🌺' },
];

const JARVIS_STYLES: { id: JarvisAnimationStyle; name: string; icon: string }[] = [
  { id: 'default_reactor', name: 'Default Reactor', icon: '⚡' },
  { id: 'hexagon_core', name: 'Hexagon Core', icon: '🔷' },
  { id: 'planetary_orbit', name: 'Planetary Orbit', icon: '🪐' },
  { id: 'hud_circle', name: 'HUD Circle', icon: '🎯' },
  { id: 'wave_core', name: 'Wave Core', icon: '🔊' },
  { id: 'tech_rings', name: 'Tech Rings', icon: '⚙️' },
  { id: 'hologram_core', name: 'Hologram Core', icon: '🔮' },
];

const PARTICLE_STYLES: { id: CoreParticleStyle; name: string; icon: string }[] = [
  { id: 'hearts', name: 'Hearts', icon: '💕' },
  { id: 'petals', name: 'Petals', icon: '🌸' },
  { id: 'stars', name: 'Stars', icon: '⭐' },
  { id: 'sparks', name: 'Sparks', icon: '✨' },
  { id: 'cosmic_swirl', name: 'Cosmic Swirl', icon: '💫' },
  { id: 'default', name: 'Default', icon: '🔆' },
];

const ANIMATION_STATES: { id: AnimationState; label: string; desc: string }[] = [
  { id: 'idle', label: 'Idle', desc: 'Soft Breathing' },
  { id: 'listening', label: 'Listening', desc: 'Pulse & Expand' },
  { id: 'thinking', label: 'Thinking', desc: 'Rotating Particles' },
  { id: 'speaking', label: 'Speaking', desc: 'Voice Wave' },
  { id: 'processing', label: 'Processing', desc: 'Energy Flow' },
  { id: 'responding', label: 'Responding', desc: 'Core Burst' },
  { id: 'offline', label: 'Offline', desc: 'Dimmed Core' },
];

export const CoreCustomizationStudio: React.FC<CoreCustomizationStudioProps> = ({
  isOpen,
  onClose,
  activeCompanion,
  onSwitchCompanion,
  customization,
  onSaveCustomization,
}) => {
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionCharacter>(activeCompanion);
  const [activeColor, setActiveColor] = useState<string>(
    selectedCompanion === 'jarvis' ? customization.jarvisColor : customization.alyaColor
  );
  const [alyaStyle, setAlyaStyle] = useState<AlyaAnimationStyle>(customization.alyaStyle);
  const [jarvisStyle, setJarvisStyle] = useState<JarvisAnimationStyle>(customization.jarvisStyle);
  const [particleStyle, setParticleStyle] = useState<CoreParticleStyle>(
    selectedCompanion === 'jarvis' ? customization.jarvisParticleStyle : customization.alyaParticleStyle
  );
  const [brightness, setBrightness] = useState<number>(customization.brightness || 100);
  const [saturation, setSaturation] = useState<number>(customization.saturation || 100);
  const [hue, setHue] = useState<number>(customization.hueOffset || 0);
  const [previewState, setPreviewState] = useState<AnimationState>('idle');

  if (!isOpen) return null;

  const isJarvis = selectedCompanion === 'jarvis';

  const handleCompanionChange = (c: CompanionCharacter) => {
    setSelectedCompanion(c);
    onSwitchCompanion(c);
    setActiveColor(c === 'jarvis' ? customization.jarvisColor : customization.alyaColor);
    setParticleStyle(c === 'jarvis' ? customization.jarvisParticleStyle : customization.alyaParticleStyle);
  };

  const handleSave = () => {
    const updated: CoreCustomization = {
      ...customization,
      alyaColor: selectedCompanion === 'alya' ? activeColor : customization.alyaColor,
      jarvisColor: selectedCompanion === 'jarvis' ? activeColor : customization.jarvisColor,
      alyaStyle,
      jarvisStyle,
      alyaParticleStyle: selectedCompanion === 'alya' ? particleStyle : customization.alyaParticleStyle,
      jarvisParticleStyle: selectedCompanion === 'jarvis' ? particleStyle : customization.jarvisParticleStyle,
      brightness,
      saturation,
      hueOffset: hue,
    };
    onSaveCustomization(updated);
    onClose();
  };

  const handleReset = () => {
    if (selectedCompanion === 'jarvis') {
      setActiveColor('#00d2ff');
      setJarvisStyle('default_reactor');
      setParticleStyle('stars');
    } else {
      setActiveColor('#ff269f');
      setAlyaStyle('default_orbit');
      setParticleStyle('hearts');
    }
    setBrightness(100);
    setSaturation(100);
    setHue(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#09030d] border border-pink-500/30 rounded-3xl shadow-[0_0_50px_rgba(255,38,159,0.25)] flex flex-col overflow-hidden max-h-[95vh]">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Palette size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-2">
                <span>AI Core Color Customization</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-normal">
                  Studio
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Design and tune your companion's holographic core</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          <div className="flex items-center justify-center">
            <div className="flex p-1 rounded-full bg-black/60 border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={() => handleCompanionChange('alya')}
                className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  !isJarvis
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-[0_0_14px_rgba(255,38,159,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>🌸</span>
                <span>Alya Core</span>
              </button>
              <button
                type="button"
                onClick={() => handleCompanionChange('jarvis')}
                className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isJarvis
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_14px_rgba(0,210,255,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⚡</span>
                <span>Jarvis Core</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <div className="space-y-3">
              <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                Select Core Energy Hue
              </div>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map((p) => {
                  const isSelected = activeColor.toLowerCase() === p.hex.toLowerCase();
                  return (
                    <button
                      key={p.hex}
                      onClick={() => setActiveColor(p.hex)}
                      className={`h-8 rounded-xl flex items-center justify-center border transition-all ${
                        isSelected
                          ? 'border-white scale-105 shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ backgroundColor: p.hex }}
                      title={p.name}
                    >
                      {isSelected && <Check size={14} className={p.hex === '#ffffff' ? 'text-black' : 'text-white'} />}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-1">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Hue Shift</span>
                    <span>{hue}°</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={hue}
                    onChange={(e) => setHue(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-red-500 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span>Brightness</span>
                    <span>{brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="160"
                    value={brightness}
                    onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-black/60 border border-white/10">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">
                Live Core Preview
              </div>
              <HolographicAvatar
                character={selectedCompanion}
                customColor={activeColor}
                stylePreset={isJarvis ? jarvisStyle : alyaStyle}
                particleStyle={particleStyle}
                forcedState={previewState}
                size="sm"
                showPedestal={true}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>{isJarvis ? '⚡ Jarvis Animation Styles' : '🌸 Alya Animation Styles'}</span>
              <span className="text-[10px] text-slate-400 font-normal">Choose geometry pattern</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {!isJarvis
                ? ALYA_STYLES.map((st) => {
                    const isSelected = alyaStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setAlyaStyle(st.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                          isSelected
                            ? 'bg-pink-500/20 border-pink-500 text-white shadow-[0_0_12px_rgba(255,38,159,0.3)]'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span className="text-lg">{st.icon}</span>
                        <span className="text-[11px] font-semibold">{st.name}</span>
                      </button>
                    );
                  })
                : JARVIS_STYLES.map((st) => {
                    const isSelected = jarvisStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() => setJarvisStyle(st.id)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_12px_rgba(0,210,255,0.3)]'
                            : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span className="text-lg">{st.icon}</span>
                        <span className="text-[11px] font-semibold">{st.name}</span>
                      </button>
                    );
                  })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
              Particle Style Around Core
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PARTICLE_STYLES.map((ps) => {
                const isSelected = particleStyle === ps.id;
                return (
                  <button
                    key={ps.id}
                    onClick={() => setParticleStyle(ps.id)}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? isJarvis
                          ? 'bg-cyan-500/25 border-cyan-400 text-white'
                          : 'bg-pink-500/25 border-pink-400 text-white'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{ps.icon}</span>
                    <span className="text-[10px] font-medium">{ps.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider flex items-center justify-between">
              <span>Animation States Preview</span>
              <span className="text-[10px] text-slate-400 font-normal">Test behavior</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ANIMATION_STATES.map((st) => {
                const isSelected = previewState === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setPreviewState(st.id)}
                    className={`p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? isJarvis
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                          : 'bg-pink-500/20 border-pink-400 text-pink-200'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{st.label}</div>
                    <div className="text-[10px] opacity-75">{st.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/10 hover:bg-white/10 text-slate-300 text-xs transition-colors"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 text-slate-300 text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`px-5 py-2 rounded-full font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1.5 ${
                isJarvis
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_16px_rgba(0,210,255,0.4)]'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_16px_rgba(255,38,159,0.4)]'
              }`}
            >
              <Check size={14} />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
