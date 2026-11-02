import React from 'react';
import { Edit3, ShieldCheck, Sparkles } from 'lucide-react';
import { UserProfile, CompanionCharacter } from '../../types';
import { PRESET_AVATARS, PRESET_BANNERS } from '../../utils/imageUtils';

interface UserProfileCardProps {
  profile: Partial<UserProfile> | null;
  companion?: CompanionCharacter;
  onEditProfile?: () => void;
  showEditButton?: boolean;
  className?: string;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  profile,
  companion = 'alya',
  onEditProfile,
  showEditButton = true,
  className = '',
}) => {
  const isJarvis = companion === 'jarvis';
  const nickname = profile?.displayName || 'Alya Explorer';
  const username = profile?.username || 'explorer';
  const avatarUrl = profile?.avatarUrl || 'alya_pink';
  const bannerUrl = profile?.bannerUrl || 'cyber_neon';

  const presetAvatar = PRESET_AVATARS.find((p) => p.id === avatarUrl);
  const isCustomAvatar = avatarUrl.startsWith('data:') || avatarUrl.startsWith('http');

  const presetBanner = PRESET_BANNERS.find((b) => b.id === bannerUrl);
  const isCustomBanner = bannerUrl.startsWith('data:') || bannerUrl.startsWith('http');

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden glass-card border ${
        isJarvis ? 'border-amber-500/30' : 'border-pink-500/30'
      } shadow-2xl transition-all duration-300 ${className}`}
    >
      <div className="relative w-full h-28 sm:h-36 overflow-hidden">
        {isCustomBanner ? (
          <img
            src={bannerUrl}
            alt="Profile Banner"
            className="w-full h-full object-cover object-center"
          />
        ) : (
          <div
            className={`w-full h-full ${presetBanner?.backgroundClass || 'bg-gradient-to-r from-purple-900 to-pink-900'}`}
            style={{
              backgroundImage: presetBanner?.pattern,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e0c19] via-black/25 to-black/30 pointer-events-none" />

        {showEditButton && onEditProfile && (
          <button
            type="button"
            onClick={onEditProfile}
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs font-medium transition-all shadow-md active:scale-95"
            aria-label="Edit Profile"
          >
            <Edit3 size={13} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      <div className="relative px-4 pb-4 pt-0">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 -mt-12 sm:-mt-14 mb-3">
          <div className="relative group shrink-0">
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-[#0b0c16] ${
                isJarvis
                  ? 'shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'shadow-[0_0_20px_rgba(244,114,182,0.4)]'
              }`}
            >
              <div
                className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 ${
                  presetAvatar?.border || (isJarvis ? 'border-amber-400' : 'border-pink-400')
                } ${
                  isCustomAvatar
                    ? 'bg-black'
                    : `bg-gradient-to-br ${presetAvatar?.gradient || 'from-pink-500 to-purple-600'}`
                }`}
              >
                {isCustomAvatar ? (
                  <img
                    src={avatarUrl}
                    alt={nickname}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <span className="text-3xl sm:text-4xl select-none" role="img" aria-label="avatar">
                    {presetAvatar?.emoji || '🌸'}
                  </span>
                )}
              </div>
            </div>
            <span
              className={`absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center text-white border-2 border-[#0b0c16] shadow-md ${
                isJarvis ? 'bg-amber-500' : 'bg-pink-500'
              }`}
              title="Alya AI Device Profile Verified"
            >
              <Sparkles size={11} />
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-0.5 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg sm:text-xl font-bold font-comfortaa text-white truncate max-w-[240px]">
                {nickname}
              </h3>
              {profile?.accountType === 'guest' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Guest • Local Only
                </span>
              ) : profile?.accountType === 'google' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck size={11} className="text-emerald-400" />
                  Google Linked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/10 text-slate-300 border border-white/10">
                  <ShieldCheck size={11} className="text-emerald-400" />
                  Registered Account
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-400 font-mono">
              <span className={isJarvis ? 'text-amber-400/90' : 'text-pink-400/90'}>@</span>
              <span className="text-slate-300 font-semibold">{username}</span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400 capitalize">
                {companion === 'jarvis' ? 'Jarvis Mode' : 'Alya Mode'}
              </span>
              {profile?.email && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="text-[11px] text-slate-400 truncate max-w-[160px]">{profile.email}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
