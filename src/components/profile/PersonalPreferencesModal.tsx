import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  ShieldCheck,
  Palette,
  Utensils,
  Gamepad2,
  Heart,
  Briefcase,
  MessageSquare,
  Volume2,
  Plus,
} from 'lucide-react';
import {
  CompanionCharacter,
  OnboardingPreferences,
  PreferredTone,
} from '../../types';
import { VOICE_STYLES } from '../../data/initialData';
import { playChime } from '../../utils/audio';

export const COLOUR_OPTIONS = [
  'Neon Pink',
  'Cyber Cyan',
  'Royal Purple',
  'Emerald Green',
  'Midnight Black',
  'Sunset Gold',
  'Crimson Red',
  'Ocean Blue',
];

export const FOOD_OPTIONS = [
  'Biryani',
  'Pizza',
  'Ramen',
  'Momos',
  'Pasta',
  'Street Food',
  'Sweets & Desserts',
  'Coffee & Chai',
];

export const GAME_OPTIONS = [
  'BGMI / PUBG',
  'Valorant',
  'Minecraft',
  'Genshin Impact',
  'Free Fire',
  'GTA',
  'Chess',
  'Story RPGs',
];

export const HOBBY_OPTIONS = [
  'Anime & Manga',
  'Coding & Tech',
  'Music',
  'Fitness & Gym',
  'Movies & Series',
  'Reading',
  'Art & Design',
  'Travel',
];

export const WORK_STUDY_OPTIONS = [
  'Student',
  'Software Developer',
  'Content Creator',
  'Designer',
  'Business / Professional',
  'Exam Preparation',
  'Gamer / Streamer',
];

export const TONE_OPTIONS: Array<{ id: PreferredTone; label: string; desc: string }> = [
  { id: 'friendly', label: 'Friendly & Warm', desc: 'Supportive, caring, and approachable' },
  { id: 'funny', label: 'Funny & Playful', desc: 'Witty banter with light natural jokes' },
  { id: 'calm', label: 'Calm & Soothing', desc: 'Gentle, peaceful, and reassuring' },
  { id: 'straightforward', label: 'Straightforward', desc: 'Direct, clear, and concise' },
];

interface PersonalPreferencesFormProps {
  initialPreferences?: OnboardingPreferences | null;
  defaultCallsign?: string;
  companion: CompanionCharacter;
  onSavePreferences: (prefs: OnboardingPreferences) => void;
  onSkip?: () => void;
  submitLabel?: string;
  isSaving?: boolean;
}

export const PersonalPreferencesForm: React.FC<PersonalPreferencesFormProps> = ({
  initialPreferences,
  defaultCallsign = '',
  companion,
  onSavePreferences,
  onSkip,
  submitLabel = 'Save Personal Memories',
  isSaving = false,
}) => {
  const [callsign, setCallsign] = useState(
    initialPreferences?.callsign || defaultCallsign || '',
  );
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionCharacter>(
    initialPreferences?.companionPreference || companion || 'alya',
  );
  const isJarvis = selectedCompanion === 'jarvis';

  const [preferredLanguage, setPreferredLanguage] = useState<
    'auto' | 'hinglish' | 'english' | 'hindi'
  >(initialPreferences?.preferredLanguage || 'auto');

  const [preferredTone, setPreferredTone] = useState<PreferredTone>(
    initialPreferences?.preferredTone || 'friendly',
  );

  const [preferredVoiceId, setPreferredVoiceId] = useState<string>(
    initialPreferences?.preferredVoiceId ||
      (selectedCompanion === 'jarvis' ? 'jarvis_deep' : 'alya_natural'),
  );

  const [favouriteColours, setFavouriteColours] = useState<string[]>(
    initialPreferences?.favouriteColours || [],
  );
  const [customColour, setCustomColour] = useState('');

  const [favouriteFoods, setFavouriteFoods] = useState<string[]>(
    initialPreferences?.favouriteFoods || [],
  );
  const [customFood, setCustomFood] = useState('');

  const [favouriteGames, setFavouriteGames] = useState<string[]>(
    initialPreferences?.favouriteGames || [],
  );
  const [customGame, setCustomGame] = useState('');

  const [hobbies, setHobbies] = useState<string[]>(initialPreferences?.hobbies || []);
  const [customHobby, setCustomHobby] = useState('');

  const [workOrStudy, setWorkOrStudy] = useState<string>(
    initialPreferences?.workOrStudy || '',
  );
  const [customNotes, setCustomNotes] = useState<string>(
    initialPreferences?.customNotes || '',
  );

  const toggleItem = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string,
  ) => {
    playChime('click');
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addCustomItem = (
    val: string,
    setVal: React.Dispatch<React.SetStateAction<string>>,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const clean = val.trim();
    if (!clean) return;
    if (!list.includes(clean)) {
      setList([...list, clean]);
    }
    setVal('');
    playChime('click');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalColours = customColour.trim()
      ? Array.from(new Set([...favouriteColours, customColour.trim()]))
      : favouriteColours;
    const finalFoods = customFood.trim()
      ? Array.from(new Set([...favouriteFoods, customFood.trim()]))
      : favouriteFoods;
    const finalGames = customGame.trim()
      ? Array.from(new Set([...favouriteGames, customGame.trim()]))
      : favouriteGames;
    const finalHobbies = customHobby.trim()
      ? Array.from(new Set([...hobbies, customHobby.trim()]))
      : hobbies;

    onSavePreferences({
      callsign: callsign.trim() || defaultCallsign || 'Explorer',
      companionPreference: selectedCompanion,
      preferredLanguage,
      preferredTone,
      preferredVoiceId,
      favouriteColours: finalColours,
      favouriteFoods: finalFoods,
      favouriteGames: finalGames,
      hobbies: finalHobbies,
      workOrStudy: workOrStudy.trim(),
      customNotes: customNotes.trim(),
      updatedAt: new Date().toISOString(),
    });
  };

  const availableVoices = VOICE_STYLES.filter((v) => v.character === selectedCompanion);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {/* Privacy & Personal Memory Notice */}
      <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2 text-[11px] text-emerald-200">
        <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
        <span>
          <strong>Personal Memory Notice:</strong> Answers you choose below are saved as personal memories under your account only. All questions are optional and can be edited or deleted anytime in Memory Bank or Settings.
        </span>
      </div>

      {/* 1. What should Alya call you? */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          <Sparkles size={13} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
          <span>1. What should {isJarvis ? 'Jarvis' : 'Alya'} call you?</span>
        </label>
        <input
          type="text"
          value={callsign}
          maxLength={40}
          onChange={(e) => setCallsign(e.target.value)}
          placeholder="Your preferred name or nickname..."
          className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/60"
        />
      </div>

      {/* 2. Language & Tone */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white flex items-center gap-1.5">
            <MessageSquare size={13} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
            <span>2. What language do you prefer?</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(
              [
                { id: 'auto', label: 'Auto Dynamic' },
                { id: 'hinglish', label: 'Hinglish' },
                { id: 'english', label: 'English' },
                { id: 'hindi', label: 'Hindi' },
              ] as const
            ).map((lang) => {
              const active = preferredLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => {
                    setPreferredLanguage(lang.id);
                    playChime('click');
                  }}
                  className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold border transition-all ${
                    active
                      ? isJarvis
                        ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                        : 'bg-pink-500/25 border-pink-400 text-pink-200'
                      : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-white">
            3. What tone should {isJarvis ? 'Jarvis' : 'Alya'} use?
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {TONE_OPTIONS.map((t) => {
              const active = preferredTone === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setPreferredTone(t.id);
                    playChime('click');
                  }}
                  className={`p-2 rounded-xl text-left border transition-all ${
                    active
                      ? isJarvis
                        ? 'bg-amber-500/25 border-amber-400 text-white'
                        : 'bg-pink-500/25 border-pink-400 text-white'
                      : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="text-[11px] font-bold">{t.label}</div>
                  <div className="text-[10px] text-slate-400">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Persona & Voice Preference */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          <Volume2 size={13} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
          <span>4. Companion & Voice Preference</span>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCompanion('alya');
              setPreferredVoiceId('alya_natural');
              playChime('switch');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
              selectedCompanion === 'alya'
                ? 'bg-pink-500/25 border-pink-400 text-pink-200'
                : 'bg-black/30 border-white/10 text-slate-400'
            }`}
          >
            🌸 Alya (Warm & Playful)
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedCompanion('jarvis');
              setPreferredVoiceId('jarvis_deep');
              playChime('switch');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition-all ${
              selectedCompanion === 'jarvis'
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-black/30 border-white/10 text-slate-400'
            }`}
          >
            ⚡ Jarvis (Tactical & Calm)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {availableVoices.map((v) => {
            const active = preferredVoiceId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setPreferredVoiceId(v.id);
                  playChime('click');
                }}
                className={`p-2 rounded-xl text-left border text-[11px] transition-all ${
                  active
                    ? isJarvis
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                      : 'bg-pink-500/20 border-pink-400 text-pink-200 font-bold'
                    : 'bg-black/30 border-white/10 text-slate-300'
                }`}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Favourite Colours */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          <Palette size={13} className="text-purple-400" />
          <span>5. What are your favourite colours?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set([...COLOUR_OPTIONS, ...favouriteColours])).map((col) => {
            const selected = favouriteColours.includes(col);
            return (
              <button
                key={col}
                type="button"
                onClick={() => toggleItem(favouriteColours, setFavouriteColours, col)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 ${
                  selected
                    ? 'bg-purple-500/30 border-purple-400 text-purple-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {selected && <Check size={10} />}
                <span>{col}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customColour}
            onChange={(e) => setCustomColour(e.target.value)}
            placeholder="Add custom colour..."
            className="flex-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
          />
          <button
            type="button"
            onClick={() =>
              addCustomItem(customColour, setCustomColour, favouriteColours, setFavouriteColours)
            }
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-1"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* 6. Favourite Foods */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          <Utensils size={13} className="text-amber-400" />
          <span>6. What foods do you like?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set([...FOOD_OPTIONS, ...favouriteFoods])).map((food) => {
            const selected = favouriteFoods.includes(food);
            return (
              <button
                key={food}
                type="button"
                onClick={() => toggleItem(favouriteFoods, setFavouriteFoods, food)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 ${
                  selected
                    ? 'bg-amber-500/30 border-amber-400 text-amber-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {selected && <Check size={10} />}
                <span>{food}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customFood}
            onChange={(e) => setCustomFood(e.target.value)}
            placeholder="Add custom food or drink..."
            className="flex-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="button"
            onClick={() =>
              addCustomItem(customFood, setCustomFood, favouriteFoods, setFavouriteFoods)
            }
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-1"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* 7. Games You Play */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          <Gamepad2 size={13} className="text-cyan-400" />
          <span>7. What games do you play?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set([...GAME_OPTIONS, ...favouriteGames])).map((game) => {
            const selected = favouriteGames.includes(game);
            return (
              <button
                key={game}
                type="button"
                onClick={() => toggleItem(favouriteGames, setFavouriteGames, game)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 ${
                  selected
                    ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {selected && <Check size={10} />}
                <span>{game}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customGame}
            onChange={(e) => setCustomGame(e.target.value)}
            placeholder="Add custom game..."
            className="flex-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() =>
              addCustomItem(customGame, setCustomGame, favouriteGames, setFavouriteGames)
            }
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-1"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* 8. Interests & Hobbies */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          <Heart size={13} className="text-pink-400" />
          <span>8. What are your interests & hobbies?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {Array.from(new Set([...HOBBY_OPTIONS, ...hobbies])).map((h) => {
            const selected = hobbies.includes(h);
            return (
              <button
                key={h}
                type="button"
                onClick={() => toggleItem(hobbies, setHobbies, h)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 ${
                  selected
                    ? 'bg-pink-500/30 border-pink-400 text-pink-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {selected && <Check size={10} />}
                <span>{h}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={customHobby}
            onChange={(e) => setCustomHobby(e.target.value)}
            placeholder="Add custom interest or hobby..."
            className="flex-1 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-pink-400"
          />
          <button
            type="button"
            onClick={() => addCustomItem(customHobby, setCustomHobby, hobbies, setHobbies)}
            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white flex items-center gap-1"
          >
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      {/* 9. Work, Study, or Daily Activities */}
      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
        <label className="text-xs font-bold text-white flex items-center gap-1.5">
          <Briefcase size={13} className="text-emerald-400" />
          <span>9. What kind of work, study, or activities do you do?</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {WORK_STUDY_OPTIONS.map((w) => {
            const selected = workOrStudy === w;
            return (
              <button
                key={w}
                type="button"
                onClick={() => {
                  setWorkOrStudy(selected ? '' : w);
                  playChime('click');
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                  selected
                    ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                {w}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={workOrStudy}
          maxLength={80}
          onChange={(e) => setWorkOrStudy(e.target.value)}
          placeholder="Or type your field, course, or daily routine..."
          className="w-full px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all"
          >
            Skip for Now
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className={`flex-1 py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${
            isJarvis
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950'
              : 'bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white'
          }`}
        >
          <Sparkles size={15} />
          <span>{isSaving ? 'Saving Preferences...' : submitLabel}</span>
        </button>
      </div>
    </form>
  );
};

interface PersonalPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPreferences?: OnboardingPreferences | null;
  defaultCallsign?: string;
  companion: CompanionCharacter;
  onSavePreferences: (prefs: OnboardingPreferences) => void;
}

export const PersonalPreferencesModal: React.FC<PersonalPreferencesModalProps> = ({
  isOpen,
  onClose,
  initialPreferences,
  defaultCallsign,
  companion,
  onSavePreferences,
}) => {
  if (!isOpen) return null;
  const isJarvis = companion === 'jarvis';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none animate-fadeIn">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div
        className={`relative z-10 w-full max-w-lg max-h-[90dvh] flex flex-col rounded-3xl overflow-hidden glass-panel border ${
          isJarvis ? 'border-amber-500/30' : 'border-pink-500/30'
        } shadow-2xl bg-[#0d0b18] text-white`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
            <div>
              <h2 className="text-sm sm:text-base font-bold font-comfortaa">
                Personal Preferences & Memory Setup
              </h2>
              <p className="text-[10px] text-slate-400">
                Customize what {isJarvis ? 'Jarvis' : 'Alya'} remembers about your tastes & style
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 scrollbar-none">
          <PersonalPreferencesForm
            initialPreferences={initialPreferences}
            defaultCallsign={defaultCallsign}
            companion={companion}
            onSavePreferences={(prefs) => {
              onSavePreferences(prefs);
              onClose();
            }}
            onSkip={onClose}
            submitLabel="Save & Sync to Memory Bank"
          />
        </div>
      </div>
    </div>
  );
};
