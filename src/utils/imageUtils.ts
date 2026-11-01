// Image handling, validation, compression and preset assets for Alya AI
export interface PresetAvatar {
  id: string;
  label: string;
  emoji: string;
  gradient: string;
  border: string;
  shadow: string;
}

export interface PresetBanner {
  id: string;
  label: string;
  backgroundClass: string;
  pattern: string;
  accent: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'alya_pink',
    label: 'Alya Sakura',
    emoji: '🌸',
    gradient: 'from-pink-500 via-rose-500 to-purple-600',
    border: 'border-pink-400',
    shadow: 'shadow-[0_0_20px_rgba(244,114,182,0.5)]',
  },
  {
    id: 'jarvis_gold',
    label: 'Jarvis Core',
    emoji: '⚡',
    gradient: 'from-amber-400 via-amber-500 to-yellow-600',
    border: 'border-amber-400',
    shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
  },
  {
    id: 'cyber_fox',
    label: 'Cyber Fox',
    emoji: '🦊',
    gradient: 'from-orange-500 via-rose-500 to-amber-600',
    border: 'border-orange-400',
    shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
  },
  {
    id: 'cosmic_star',
    label: 'Cosmic Star',
    emoji: '⭐',
    gradient: 'from-indigo-500 via-purple-500 to-pink-500',
    border: 'border-purple-400',
    shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]',
  },
  {
    id: 'tactical_bot',
    label: 'Tactical Drone',
    emoji: '🤖',
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    border: 'border-cyan-400',
    shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]',
  },
  {
    id: 'sakura_dream',
    label: 'Sakura Dream',
    emoji: '🌺',
    gradient: 'from-rose-400 via-pink-500 to-fuchsia-600',
    border: 'border-rose-400',
    shadow: 'shadow-[0_0_20px_rgba(251,113,133,0.5)]',
  },
  {
    id: 'neon_rider',
    label: 'Neon Cyber',
    emoji: '🚀',
    gradient: 'from-teal-400 via-emerald-500 to-cyan-600',
    border: 'border-teal-400',
    shadow: 'shadow-[0_0_20px_rgba(45,212,191,0.5)]',
  },
  {
    id: 'quantum_owl',
    label: 'Quantum Owl',
    emoji: '🦉',
    gradient: 'from-violet-500 via-purple-600 to-indigo-800',
    border: 'border-violet-400',
    shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.5)]',
  },
];

export const PRESET_BANNERS: PresetBanner[] = [
  {
    id: 'cyber_neon',
    label: 'Cyber Neon Wave',
    backgroundClass: 'bg-gradient-to-r from-purple-900 via-pink-900 to-[#181124]',
    pattern: 'radial-gradient(circle at 20% 50%, rgba(244, 114, 182, 0.3) 0%, transparent 60%)',
    accent: '#ec4899',
  },
  {
    id: 'golden_grid',
    label: 'Tactical Amber Grid',
    backgroundClass: 'bg-gradient-to-r from-amber-950 via-yellow-900 to-[#1c1829]',
    pattern: 'radial-gradient(circle at 80% 50%, rgba(245, 158, 11, 0.35) 0%, transparent 60%)',
    accent: '#f59e0b',
  },
  {
    id: 'sakura_night',
    label: 'Tokyo Sakura Night',
    backgroundClass: 'bg-gradient-to-r from-pink-950 via-rose-950 to-indigo-950',
    pattern: 'radial-gradient(circle at 50% 30%, rgba(251, 113, 133, 0.3) 0%, transparent 65%)',
    accent: '#f43f5e',
  },
  {
    id: 'cosmic_abyss',
    label: 'Deep Cosmic Nebula',
    backgroundClass: 'bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950',
    pattern: 'radial-gradient(circle at 70% 40%, rgba(99, 102, 241, 0.35) 0%, transparent 65%)',
    accent: '#818cf8',
  },
  {
    id: 'emerald_matrix',
    label: 'Quantum Emerald',
    backgroundClass: 'bg-gradient-to-r from-emerald-950 via-teal-950 to-[#0e1726]',
    pattern: 'radial-gradient(circle at 30% 60%, rgba(16, 185, 129, 0.3) 0%, transparent 60%)',
    accent: '#10b981',
  },
  {
    id: 'synth_sunset',
    label: 'Synthwave Sunset',
    backgroundClass: 'bg-gradient-to-r from-fuchsia-950 via-red-950 to-amber-950',
    pattern: 'radial-gradient(circle at 50% 80%, rgba(236, 72, 153, 0.35) 0%, transparent 60%)',
    accent: '#f472b6',
  },
];

export function validateImageFile(file: File, maxSizeMB = 5): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Please upload a valid image file (JPEG, PNG, or WebP).',
    };
  }
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Image file is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`,
    };
  }
  return { valid: true };
}

export function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 600,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas 2d context.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
        } catch {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image file for compression.'));
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };
    reader.readAsDataURL(file);
  });
}
