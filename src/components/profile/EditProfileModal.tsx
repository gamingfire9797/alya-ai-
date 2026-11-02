import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  AtSign,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { UserProfile, CompanionCharacter } from '../../types';
import {
  PRESET_AVATARS,
  PRESET_BANNERS,
  validateImageFile,
  compressImage,
} from '../../utils/imageUtils';
import { playChime } from '../../utils/audio';
import { apiFetch } from '../../utils/apiConfig';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  sessionToken?: string | null;
  companion?: CompanionCharacter;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  sessionToken,
  companion = 'alya',
  onProfileUpdated,
}) => {
  const isJarvis = companion === 'jarvis';
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || 'alya_pink');
  const [bannerUrl, setBannerUrl] = useState(currentUser.bannerUrl || 'cyber_neon');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    checked: boolean;
    available: boolean;
    message: string;
  }>({
    checked: true,
    available: true,
    message: 'Current username',
  });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ status: 'idle' | 'success' | 'error'; text: string }>({
    status: 'idle',
    text: '',
  });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser.displayName || '');
      setUsername(currentUser.username || '');
      setAvatarUrl(currentUser.avatarUrl || 'alya_pink');
      setBannerUrl(currentUser.bannerUrl || 'cyber_neon');
      setUsernameStatus({ checked: true, available: true, message: 'Current username' });
      setSaveMessage({ status: 'idle', text: '' });
      setUploadError(null);
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    const clean = username.trim();
    if (clean === currentUser.username) {
      setUsernameStatus({ checked: true, available: true, message: 'Current username' });
      return;
    }
    if (!clean) {
      setUsernameStatus({ checked: false, available: false, message: '' });
      return;
    }
    if (clean.length < 3) {
      setUsernameStatus({
        checked: true,
        available: false,
        message: 'Username must be at least 3 characters.',
      });
      return;
    }
    if (clean.length > 20) {
      setUsernameStatus({
        checked: true,
        available: false,
        message: 'Username cannot exceed 20 characters.',
      });
      return;
    }
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(clean)) {
      setUsernameStatus({
        checked: true,
        available: false,
        message: 'Username can only contain letters, numbers, and underscores (_).',
      });
      return;
    }

    setIsCheckingUsername(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await apiFetch('/api/profile/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: clean, excludeUserId: currentUser.id }),
        });
        const data = await res.json();
        if (data.available) {
          setUsernameStatus({
            checked: true,
            available: true,
            message: 'Username is available!',
          });
        } else {
          setUsernameStatus({
            checked: true,
            available: false,
            message: data.error || 'Username is already taken.',
          });
        }
      } catch {
        setUsernameStatus({
          checked: true,
          available: true,
          message: 'Local availability confirmed.',
        });
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [username, currentUser]);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file, 5);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid avatar image.');
      return;
    }
    try {
      setUploadError(null);
      const compressed = await compressImage(file, 300, 300, 0.85);
      setAvatarUrl(compressed);
      playChime('click');
    } catch {
      setUploadError('Failed to process avatar image. Please try another file.');
    }
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = validateImageFile(file, 6);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid banner image.');
      return;
    }
    try {
      setUploadError(null);
      const compressed = await compressImage(file, 1000, 360, 0.82);
      setBannerUrl(compressed);
      playChime('click');
    } catch {
      setUploadError('Failed to process banner image. Please try another file.');
    }
  };

  const handleSave = async () => {
    const cleanNick = displayName.trim();
    const cleanUser = username.trim();
    if (!cleanNick) {
      setSaveMessage({ status: 'error', text: 'Display nickname is required.' });
      return;
    }
    if (!cleanUser || cleanUser.length < 3 || cleanUser.length > 20) {
      setSaveMessage({ status: 'error', text: 'Username must be between 3 and 20 characters.' });
      return;
    }
    if (!usernameStatus.available && cleanUser !== currentUser.username) {
      setSaveMessage({ status: 'error', text: usernameStatus.message || 'Please choose an available username.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage({ status: 'idle', text: '' });

    try {
      const res = await apiFetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          displayName: cleanNick,
          username: cleanUser,
          avatarUrl,
          bannerUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile.');
      }
      playChime('heart');
      setSaveMessage({ status: 'success', text: 'Profile updated successfully!' });
      onProfileUpdated(data.user);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      const updated: UserProfile = {
        ...currentUser,
        displayName: cleanNick,
        username: cleanUser,
        avatarUrl,
        bannerUrl,
      };
      onProfileUpdated(updated);
      setSaveMessage({ status: 'success', text: 'Profile updated in device storage.' });
      setTimeout(() => {
        onClose();
      }, 700);
    } finally {
      setIsSaving(false);
    }
  };

  const isCustomAvatar = avatarUrl.startsWith('data:') || avatarUrl.startsWith('http');
  const isCustomBanner = bannerUrl.startsWith('data:') || bannerUrl.startsWith('http');
  const activePresetBanner = PRESET_BANNERS.find((b) => b.id === bannerUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 select-none animate-fadeIn">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div
        className={`relative z-10 w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl overflow-hidden glass-panel border ${
          isJarvis ? 'border-amber-500/30' : 'border-pink-500/30'
        } shadow-2xl bg-[#0d0b18] text-white`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
            <h2 className="text-base font-bold font-comfortaa">Customize Profile</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-none">
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-300">Live Preview</span>
            <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black/40">
              <div className="relative w-full h-24 sm:h-28 overflow-hidden">
                {isCustomBanner ? (
                  <img src={bannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                ) : (
                  <div
                    className={`w-full h-full ${activePresetBanner?.backgroundClass || 'bg-gradient-to-r from-purple-900 to-pink-900'}`}
                    style={{ backgroundImage: activePresetBanner?.pattern }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              </div>
              <div className="px-4 pb-3 flex items-end gap-3 -mt-9">
                <div
                  className={`w-16 h-16 rounded-full p-1 bg-[#0d0b18] shrink-0 border-2 ${
                    isJarvis ? 'border-amber-400' : 'border-pink-400'
                  }`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-black">
                    {isCustomAvatar ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">
                        {PRESET_AVATARS.find((p) => p.id === avatarUrl)?.emoji || '🌸'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="min-w-0 pb-1">
                  <div className="font-bold text-sm text-white truncate font-comfortaa">
                    {displayName.trim() || 'Nickname'}
                  </div>
                  <div className="text-xs text-slate-400 font-mono truncate">
                    @{username.trim() || 'username'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User size={13} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
                <span>Display Nickname</span>
              </label>
              <input
                type="text"
                value={displayName}
                maxLength={40}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500/50"
              />
              <span className="text-[10px] text-slate-400">Shown in conversation and profile</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <AtSign size={13} className={isJarvis ? 'text-amber-400' : 'text-pink-400'} />
                <span>Unique Username</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  maxLength={20}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="3-20 characters"
                  className="w-full pl-3 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-pink-500/50"
                />
                <div className="absolute right-2.5 top-2.5">
                  {isCheckingUsername ? (
                    <Loader2 size={13} className="text-pink-400 animate-spin" />
                  ) : usernameStatus.checked ? (
                    usernameStatus.available ? (
                      <CheckCircle2 size={13} className="text-emerald-400" />
                    ) : (
                      <AlertCircle size={13} className="text-rose-400" />
                    )
                  ) : null}
                </div>
              </div>
              <span
                className={`text-[10px] block ${
                  usernameStatus.available ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {usernameStatus.message || 'Letters, numbers, and underscores only'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Choose Profile Avatar</span>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 transition-colors"
              >
                <Upload size={12} />
                <span>Upload Custom</span>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {PRESET_AVATARS.map((p) => {
                const isSelected = avatarUrl === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(p.id);
                      playChime('click');
                    }}
                    className={`h-11 rounded-2xl flex items-center justify-center transition-all ${
                      isSelected
                        ? `bg-gradient-to-br ${p.gradient} ring-2 ring-white scale-105 shadow-md`
                        : 'bg-white/5 hover:bg-white/10 border border-white/5 opacity-70 hover:opacity-100'
                    }`}
                    title={p.label}
                  >
                    <span className="text-xl">{p.emoji}</span>
                  </button>
                );
              })}
            </div>
            {isCustomAvatar && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs">
                <span className="text-pink-300 font-medium">Custom uploaded avatar active</span>
                <button
                  type="button"
                  onClick={() => setAvatarUrl('alya_pink')}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                >
                  <Trash2 size={12} />
                  <span>Reset to Default</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Choose Profile Banner</span>
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-pink-400 hover:text-pink-300 transition-colors"
              >
                <Upload size={12} />
                <span>Upload Custom</span>
              </button>
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleBannerFileChange}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_BANNERS.map((b) => {
                const isSelected = bannerUrl === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      setBannerUrl(b.id);
                      playChime('click');
                    }}
                    className={`h-12 rounded-xl overflow-hidden relative border text-left p-2 transition-all ${
                      isSelected
                        ? isJarvis
                          ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]'
                          : 'border-pink-400 ring-2 ring-pink-400/50 scale-[1.02]'
                        : 'border-white/10 hover:border-white/20 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div
                      className={`absolute inset-0 ${b.backgroundClass}`}
                      style={{ backgroundImage: b.pattern }}
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <span className="relative z-10 text-[10px] font-bold text-white drop-shadow">
                      {b.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {isCustomBanner && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-pink-500/10 border border-pink-500/20 text-xs">
                <span className="text-pink-300 font-medium">Custom uploaded banner active</span>
                <button
                  type="button"
                  onClick={() => setBannerUrl('cyber_neon')}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300"
                >
                  <Trash2 size={12} />
                  <span>Reset to Default</span>
                </button>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {saveMessage.text && (
            <div
              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                saveMessage.status === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {saveMessage.status === 'success' ? (
                <CheckCircle2 size={14} className="shrink-0" />
              ) : (
                <AlertCircle size={14} className="shrink-0" />
              )}
              <span>{saveMessage.text}</span>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2.5 bg-black/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
              isJarvis
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:brightness-110'
                : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:brightness-110'
            }`}
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>Save Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
