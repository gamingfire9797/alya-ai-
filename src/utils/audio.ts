import { VoiceStyle } from '../types';
import { LanguageEngine } from './language';
import { apiFetch } from './apiConfig';

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContext = new AudioCtx();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch (_) {
    return null;
  }
}

// Development latency tracker for performance investigation
export interface VoiceLatencyMetrics {
  sttFinalized: number;
  aiRequestStart: number;
  aiFirstChunk: number;
  aiResponseComplete: number;
  ttsRequestStart: number;
  ttsResponseReceived: number;
  audioPlayStart: number;
  audioPlayEnd: number;
}

export const VoiceLatencyTracker = {
  activeSessionId: 0,
  metrics: {
    sttFinalized: 0,
    aiRequestStart: 0,
    aiFirstChunk: 0,
    aiResponseComplete: 0,
    ttsRequestStart: 0,
    ttsResponseReceived: 0,
    audioPlayStart: 0,
    audioPlayEnd: 0,
  } as VoiceLatencyMetrics,
  start(id = Date.now()) {
    this.activeSessionId = id;
    this.metrics = {
      sttFinalized: performance.now(),
      aiRequestStart: 0,
      aiFirstChunk: 0,
      aiResponseComplete: 0,
      ttsRequestStart: 0,
      ttsResponseReceived: 0,
      audioPlayStart: 0,
      audioPlayEnd: 0,
    };
  },
  record(stage: keyof VoiceLatencyMetrics) {
    this.metrics[stage] = performance.now();
    const m = this.metrics;

    if (stage === 'aiFirstChunk' && m.aiRequestStart) {
      const ttft = Math.round(m.aiFirstChunk - m.aiRequestStart);
      console.log(`[Latency] Time-to-First-Token (TTFT): ${ttft}ms`);
    } else if (stage === 'aiResponseComplete' && m.aiRequestStart) {
      const aiTotal = Math.round(m.aiResponseComplete - m.aiRequestStart);
      console.log(`[Latency] AI Generation Complete: ${aiTotal}ms`);
    } else if (stage === 'ttsResponseReceived' && m.ttsRequestStart) {
      const ttsGen = Math.round(m.ttsResponseReceived - m.ttsRequestStart);
      console.log(`[Latency] TTS Audio Synthesis: ${ttsGen}ms`);
    } else if (stage === 'audioPlayStart') {
      const ttft = m.aiFirstChunk && m.aiRequestStart ? Math.round(m.aiFirstChunk - m.aiRequestStart) : 0;
      const ttsGen = m.ttsResponseReceived && m.ttsRequestStart ? Math.round(m.ttsResponseReceived - m.ttsRequestStart) : 0;
      const totalToSpeech = m.sttFinalized ? Math.round(m.audioPlayStart - m.sttFinalized) : 0;
      console.log(`[Latency] Audio Playback Started | TTFT: ${ttft}ms | TTS: ${ttsGen}ms | Total Voice Pipeline: ${totalToSpeech}ms`);
    }
  },
  getSummary() {
    const m = this.metrics;
    return {
      aiGenerationMs: m.aiResponseComplete && m.aiRequestStart ? Math.round(m.aiResponseComplete - m.aiRequestStart) : 0,
      ttsSynthesisMs: m.ttsResponseReceived && m.ttsRequestStart ? Math.round(m.ttsResponseReceived - m.ttsRequestStart) : 0,
      timeToFirstAudioMs: m.audioPlayStart && m.sttFinalized ? Math.round(m.audioPlayStart - m.sttFinalized) : 0,
    };
  },
};

// Procedural sound effects for companion interactions
export function playChime(type: 'heart' | 'send' | 'receive' | 'click' | 'switch' | 'listen_start' | 'listen_stop') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'heart') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'receive') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'listen_start') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.09); // G5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'listen_stop') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'switch') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (_) {}
}

// Procedural Ambient sound generator (Rain, Lo-Fi Hum, Cafe, Nature)
class AmbientSoundEngine {
  private noiseNode: AudioNode | null = null;
  private isPlaying = false;

  start(type: 'rain' | 'lofi' | 'cafe' | 'nature', volume = 0.3) {
    this.stop();
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      if (type === 'rain') {
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
      } else if (type === 'lofi') {
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 2;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 800;
      }
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.25, ctx.currentTime);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      this.noiseNode = noise;
      this.isPlaying = true;
    } catch (_) {}
  }

  stop() {
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
        this.noiseNode.disconnect();
      } catch (_) {}
      this.noiseNode = null;
    }
    this.isPlaying = false;
  }

  active() {
    return this.isPlaying;
  }
}

export const ambientEngine = new AmbientSoundEngine();

export interface TTSOptions {
  volume?: number;
  speed?: number;
  pitch?: number;
  languageMode?: 'english' | 'hinglish' | 'hindi' | 'other';
  emotion?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

// Abbreviations that should not trigger a sentence split when followed by a period
const NON_TERMINAL_ABBREVIATIONS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|fig|no|vol|rev|est|approx)\.$/i;

/**
 * High-Performance Companion TTS Engine
 * Features:
 * - Chunk-aware fast streaming playback for rapid perceived response
 * - Smart sentence & clause boundary segmentation (protects decimals, abbreviations, and short exclamations)
 * - In-memory LRU audio caching + in-flight request deduplication
 * - Expressive emotion & Hinglish/Hindi metadata forwarding
 * - Fast graceful device fallback to Web Speech
 */
export class CompanionTTS {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentAudio: HTMLAudioElement | null = null;
  private static sharedAudio: HTMLAudioElement | null = null;
  private static activeControllers = new Set<AbortController>();
  private static speakingCallback: ((isSpeaking: boolean) => void) | null = null;
  private static isCurrentlySpeaking = false;
  private static audioCache = new Map<string, { audio: string; mimeType: string }>();
  private static inFlightRequests = new Map<string, Promise<{ audio: string; mimeType: string } | null>>();
  private static cooldownUntil = 0;
  private static speechSessionId = 0;
  private static isMuted = false;

  private static getSharedAudio(): HTMLAudioElement {
    if (!this.sharedAudio && typeof window !== 'undefined') {
      this.sharedAudio = new Audio();
      this.sharedAudio.preload = 'auto';
    }
    return this.sharedAudio!;
  }

  static setSpeakingListener(cb: (isSpeaking: boolean) => void) {
    this.speakingCallback = cb;
  }

  static notifySpeakingState(speaking: boolean) {
    this.isCurrentlySpeaking = speaking;
    if (this.speakingCallback) {
      this.speakingCallback(speaking);
    }
  }

  static getSessionId(): number {
    return this.speechSessionId;
  }

  static setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  static getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Stop any playing audio and abort all in-flight TTS requests immediately
   */
  static stop(triggerCallback = true) {
    this.speechSessionId++;
    for (const controller of this.activeControllers) {
      try {
        controller.abort();
      } catch (_) {}
    }
    this.activeControllers.clear();
    this.inFlightRequests.clear();

    if (this.currentAudio) {
      try {
        this.currentAudio.onplay = null;
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
      } catch (_) {}
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (_) {}
    }
    this.isCurrentlySpeaking = false;
    if (triggerCallback && this.speakingCallback) {
      this.speakingCallback(false);
    }
  }

  /**
   * Unlock Web Audio & Speech synthesis on mobile/safari user gesture
   */
  static unlockAudio() {
    if (typeof window === 'undefined') return;
    try {
      getAudioContext();
      if (this.synth && this.synth.paused) {
        this.synth.resume();
      }
    } catch (_) {}
  }

  /**
   * Clean speech text and normalize for natural pronunciation
   */
  static cleanSpeechText(text: string): string {
    return LanguageEngine.normalizeForSpeech(text);
  }

  /**
   * Split a response into natural, well-paced speech segments:
   * - Preserves decimals (e.g. 3.8, 2.5) and common abbreviations (Mr., Dr., e.g., vs.)
   * - Merges short interjections (e.g. "Ohh, nice!", "Haha!") with the following sentence for smooth transitions
   * - Splits overly long sentences (> 220 chars) at natural clause boundaries so TTS never times out
   */
  static splitIntoSentences(text: string): string[] {
    const clean = this.cleanSpeechText(text);
    if (!clean) return [];

    // Protect decimals and common abbreviations using placeholders
    const DOT_PLACEHOLDER = '\uE000';
    const protectedText = clean
      .replace(/(\d)\.(\d)/g, `$1${DOT_PLACEHOLDER}$2`)
      .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|fig|vol|rev|est|approx)\./gi, `$1${DOT_PLACEHOLDER}`)
      .replace(/\b(e\.g|i\.e)\./gi, (m) => m.replace(/\./g, DOT_PLACEHOLDER));

    const rawMatches = protectedText.match(/[^.!?।\n]+(?:[.!?।\n]+|$)/g) || [protectedText];
    const restored = rawMatches
      .map((s) => s.replace(new RegExp(DOT_PLACEHOLDER, 'g'), '.').trim())
      .filter((s) => s.length > 0);

    if (restored.length === 0) return [];

    // Merge short lead-in reactions (< 16 chars, e.g. "Ohh, nice!", "Haha!") with the next sentence
    // so there is no artificial gap after a short reaction
    const merged: string[] = [];
    for (let i = 0; i < restored.length; i++) {
      const current = restored[i];
      if (current.length < 16 && i < restored.length - 1) {
        restored[i + 1] = `${current} ${restored[i + 1]}`;
      } else if (current.length < 12 && merged.length > 0) {
        merged[merged.length - 1] = `${merged[merged.length - 1]} ${current}`;
      } else {
        merged.push(current);
      }
    }

    // Split any excessively long segment (> 220 chars) at natural clause boundaries (, ; —)
    const finalSegments: string[] = [];
    for (const seg of merged) {
      if (seg.length <= 220) {
        finalSegments.push(seg);
      } else {
        const clauses = seg.split(/(?<=[,;—:])\s+/);
        let acc = '';
        for (const clause of clauses) {
          if (!acc) {
            acc = clause;
          } else if (acc.length + 1 + clause.length <= 220) {
            acc = `${acc} ${clause}`;
          } else {
            finalSegments.push(acc.trim());
            acc = clause;
          }
        }
        if (acc.trim()) {
          finalSegments.push(acc.trim());
        }
      }
    }

    return finalSegments;
  }

  /**
   * Primary entry point for speaking AI response.
   * If response contains multiple sentences, it initiates sentence 1 immediately
   * while preloading subsequent sentences in parallel.
   */
  static async speak(
    text: string,
    voiceStyle: VoiceStyle,
    options?: TTSOptions | (() => void)
  ): Promise<void> {
    this.stop(false);
    const currentSessionId = this.speechSessionId;
    const resolvedOptions: TTSOptions = typeof options === 'function' ? { onEnd: options } : (options || {});

    // Extract leading emotion tag if present before cleaning
    const emotionMatch = (text || '').trimStart().match(/^\[(normal|happy|laughing|shy|curious|thinking|surprised|calm|concerned)\]/i);
    const emotion = resolvedOptions.emotion || (emotionMatch ? emotionMatch[1].toLowerCase() : 'normal');

    const cleanSpeech = this.cleanSpeechText(text);

    if (!cleanSpeech) {
      this.notifySpeakingState(false);
      resolvedOptions.onEnd?.();
      return;
    }

    if (this.isMuted) {
      this.notifySpeakingState(false);
      resolvedOptions.onStart?.();
      setTimeout(() => {
        resolvedOptions.onEnd?.();
      }, 80);
      return;
    }

    // Detect language mode of the speech text if not already provided
    const languageMode = resolvedOptions.languageMode || LanguageEngine.detectLanguage(cleanSpeech).mode;
    const sentences = this.splitIntoSentences(cleanSpeech);

    VoiceLatencyTracker.record('ttsRequestStart');

    // If single sentence, speak directly
    if (sentences.length <= 1) {
      await this.speakSingleSentence(currentSessionId, sentences[0] || cleanSpeech, voiceStyle, {
        ...resolvedOptions,
        languageMode,
        emotion,
        onStart: () => {
          this.notifySpeakingState(true);
          resolvedOptions.onStart?.();
        },
        onEnd: () => {
          if (this.speechSessionId === currentSessionId) {
            this.notifySpeakingState(false);
            resolvedOptions.onEnd?.();
          }
        },
        onError: (err) => {
          if (this.speechSessionId === currentSessionId) {
            this.notifySpeakingState(false);
            if (resolvedOptions.onError) {
              resolvedOptions.onError(err);
            } else {
              resolvedOptions.onEnd?.();
            }
          }
        },
      });
      return;
    }

    // For multi-sentence responses: early chunk playback
    // Play sentence 1 immediately, and prefetch sentence 2+
    let currentIndex = 0;
    let hasStartedPlayback = false;

    const playNextSentence = async () => {
      if (this.speechSessionId !== currentSessionId) return;

      if (currentIndex >= sentences.length) {
        this.notifySpeakingState(false);
        resolvedOptions.onEnd?.();
        return;
      }

      const currentSentence = sentences[currentIndex];
      currentIndex++;

      // Preload next sentence in background if exists
      if (currentIndex < sentences.length) {
        this.preloadSentenceAudio(sentences[currentIndex], voiceStyle, languageMode, emotion, currentSessionId);
      }

      await this.speakSingleSentence(currentSessionId, currentSentence, voiceStyle, {
        ...resolvedOptions,
        languageMode,
        emotion,
        onStart: () => {
          if (!hasStartedPlayback) {
            hasStartedPlayback = true;
            this.notifySpeakingState(true);
            resolvedOptions.onStart?.();
          }
        },
        onEnd: () => {
          playNextSentence();
        },
        onError: () => {
          playNextSentence();
        },
      });
    };

    playNextSentence();
  }

  /**
   * Shared deduplicated TTS synthesis fetcher used by both preloading and active playback
   */
  private static fetchSentenceAudio(
    sessionId: number,
    sentence: string,
    voiceStyle: VoiceStyle,
    languageMode: string,
    emotion = 'normal'
  ): Promise<{ audio: string; mimeType: string } | null> {
    const normalizedEmotion = (emotion || 'normal').toLowerCase();
    const cacheKey = `${voiceStyle.id}::${languageMode}::${normalizedEmotion}::${sentence}`;

    const cached = this.audioCache.get(cacheKey);
    if (cached) {
      return Promise.resolve(cached);
    }

    const existingPromise = this.inFlightRequests.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    if (Date.now() < this.cooldownUntil) {
      return Promise.resolve(null);
    }

    const controller = new AbortController();
    this.activeControllers.add(controller);

    const requestPromise = (async () => {
      try {
        const userApiKey = localStorage.getItem('alya_gemini_api_key_v1') || undefined;
        const response = await apiFetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sentence,
            voiceId: voiceStyle.id,
            language: languageMode,
            emotion: normalizedEmotion,
            apiKey: userApiKey,
          }),
          signal: controller.signal,
        });

        if (this.speechSessionId !== sessionId || controller.signal.aborted) return null;
        if (!response.ok) return null;

        const data = await response.json();
        if (this.speechSessionId !== sessionId || controller.signal.aborted) return null;

        if (data.rateLimited || data.fallback || !data.audio) {
          if (data.retryAfterSeconds) {
            this.cooldownUntil = Date.now() + data.retryAfterSeconds * 1000;
          } else if (data.rateLimited) {
            this.cooldownUntil = Date.now() + 20000;
          }
          return null;
        }

        const item = { audio: data.audio, mimeType: data.mimeType || 'audio/wav' };
        if (this.audioCache.size > 100) {
          const oldest = this.audioCache.keys().next().value;
          if (oldest) this.audioCache.delete(oldest);
        }
        this.audioCache.set(cacheKey, item);
        return item;
      } catch (_) {
        return null;
      } finally {
        this.activeControllers.delete(controller);
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Preload audio for a sentence to achieve zero gap between consecutive sentences
   */
  public static preloadSentenceAudio(
    sentence: string,
    voiceStyle: VoiceStyle,
    languageMode: string,
    emotion = 'normal',
    sessionId = this.speechSessionId
  ): void {
    const clean = this.cleanSpeechText(sentence);
    if (!clean) return;
    void this.fetchSentenceAudio(sessionId, clean, voiceStyle, languageMode, emotion);
  }

  /**
   * Speak a single sentence chunk
   */
  public static async speakSingleSentence(
    sessionId: number,
    sentence: string,
    voiceStyle: VoiceStyle,
    options: TTSOptions
  ): Promise<void> {
    if (this.speechSessionId !== sessionId) return;

    const clean = this.cleanSpeechText(sentence);
    if (!clean) {
      options.onEnd?.();
      return;
    }

    const volume = typeof options.volume === 'number' ? Math.max(0, Math.min(1, options.volume)) : 1;
    const speed = typeof options.speed === 'number' ? options.speed : voiceStyle.rate || 1.0;
    const languageMode = options.languageMode || LanguageEngine.detectLanguage(clean).mode;
    const emotion = options.emotion || 'normal';

    const synthesized = await this.fetchSentenceAudio(sessionId, clean, voiceStyle, languageMode, emotion);
    if (this.speechSessionId !== sessionId) return;

    if (synthesized && synthesized.audio) {
      VoiceLatencyTracker.record('ttsResponseReceived');
      await this.playAudioBuffer(
        sessionId,
        synthesized.audio,
        synthesized.mimeType,
        volume,
        speed,
        clean,
        voiceStyle,
        { ...options, languageMode }
      );
      return;
    }

    // Fallback to browser Web Speech if neural TTS was rate-limited or unreachable
    this.fallbackWebSpeech(sessionId, clean, voiceStyle, { ...options, languageMode });
  }

  /**
   * Play base64 audio buffer using reused audio element and safe URL lifecycle
   */
  private static async playAudioBuffer(
    sessionId: number,
    base64Audio: string,
    mimeType: string,
    volume: number,
    speed: number,
    sentence: string,
    voiceStyle: VoiceStyle,
    options: TTSOptions
  ): Promise<void> {
    if (this.speechSessionId !== sessionId) return;

    let objectUrl: string | null = null;
    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}
        objectUrl = null;
      }
    };

    try {
      this.unlockAudio();
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const safeMime = mimeType || 'audio/wav';
      const blob = new Blob([bytes.buffer], { type: safeMime });
      objectUrl = URL.createObjectURL(blob);

      const audio = this.getSharedAudio();
      this.currentAudio = audio;
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.playbackRate = Math.max(0.5, Math.min(2.0, speed));
      audio.src = objectUrl;

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = (cb?: () => void) => {
          if (settled) return;
          settled = true;
          cleanup();
          audio.onplay = null;
          audio.onended = null;
          audio.onerror = null;
          if (this.currentAudio === audio) {
            this.currentAudio = null;
          }
          cb?.();
          resolve();
        };

        audio.onplay = () => {
          if (this.speechSessionId !== sessionId) {
            try { audio.pause(); } catch (_) {}
            finish();
            return;
          }
          VoiceLatencyTracker.record('audioPlayStart');
          this.isCurrentlySpeaking = true;
          options.onStart?.();
        };

        audio.onended = () => {
          finish(() => {
            if (this.speechSessionId === sessionId) {
              VoiceLatencyTracker.record('audioPlayEnd');
              options.onEnd?.();
            }
          });
        };

        audio.onerror = () => {
          finish(() => {
            if (this.speechSessionId === sessionId) {
              this.fallbackWebSpeech(sessionId, sentence, voiceStyle, options);
            }
          });
        };

        audio.play().catch(() => {
          finish(() => {
            if (this.speechSessionId === sessionId) {
              this.fallbackWebSpeech(sessionId, sentence, voiceStyle, options);
            }
          });
        });
      });
    } catch (_) {
      cleanup();
      if (this.speechSessionId === sessionId) {
        this.fallbackWebSpeech(sessionId, sentence, voiceStyle, options);
      }
    }
  }

  /**
   * Create an incremental streaming speaker that triggers early sentence TTS
   * as response tokens arrive, drastically reducing perceived latency.
   */
  static createStreamSpeaker(voiceStyle: VoiceStyle, options: TTSOptions): StreamSpeaker {
    this.stop(false);
    return new StreamSpeaker(this.speechSessionId, voiceStyle, options);
  }

  /**
   * Browser Web Speech Synthesis fallback with native Hindi/Hinglish/English voice selection
   */
  private static fallbackWebSpeech(
    sessionId: number,
    cleanSpeech: string,
    voiceStyle: VoiceStyle,
    options: TTSOptions
  ) {
    if (this.speechSessionId !== sessionId) return;
    if (!this.synth) {
      options.onEnd?.();
      return;
    }

    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanSpeech);
      utterance.volume = typeof options.volume === 'number' ? Math.max(0, Math.min(1, options.volume)) : 1;
      utterance.rate = typeof options.speed === 'number' ? Math.max(0.75, Math.min(1.35, options.speed)) : (voiceStyle.rate || 1);
      // Use gentle feminine pitch for Alya in Web Speech fallback without sounding squeaky
      const defaultPitch = voiceStyle.gender === 'female' ? (voiceStyle.pitch || 1.05) : (voiceStyle.pitch || 0.92);
      utterance.pitch = typeof options.pitch === 'number' && options.pitch !== 1.0 ? options.pitch : defaultPitch;

      const isHindiOrHinglish = options.languageMode === 'hindi' || options.languageMode === 'hinglish';
      const voices = this.synth.getVoices();

      if (voices.length > 0) {
        if (isHindiOrHinglish) {
          const indianFemaleVoice = voices.find(
            (v) =>
              (v.lang === 'hi-IN' || v.lang === 'en-IN' || v.lang.startsWith('hi') || v.name.includes('India') || v.name.includes('हिन्दी')) &&
              (voiceStyle.gender === 'female'
                ? v.name.includes('Swara') || v.name.includes('Neerja') || v.name.includes('Lekha') || v.name.includes('Veena') || v.name.includes('Google हिन्दी') || !v.name.includes('Male')
                : true)
          ) || voices.find((v) => v.lang === 'en-IN' || v.lang === 'hi-IN');

          if (indianFemaleVoice) {
            utterance.voice = indianFemaleVoice;
            utterance.lang = indianFemaleVoice.lang;
          } else {
            utterance.lang = options.languageMode === 'hindi' ? 'hi-IN' : 'en-IN';
          }
        } else {
          if (voiceStyle.gender === 'female') {
            const femaleVoice = voices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (v.name.includes('Aria') ||
                  v.name.includes('Jenny') ||
                  v.name.includes('Samantha') ||
                  v.name.includes('Google US English') ||
                  v.name.includes('Google UK English Female') ||
                  v.name.includes('Victoria') ||
                  v.name.includes('Female'))
            ) || voices.find((v) => v.lang.startsWith('en') && !v.name.includes('Male'));
            if (femaleVoice) utterance.voice = femaleVoice;
          } else {
            const isDeep = voiceStyle.id === 'jarvis_deep';
            const maleVoice = voices.find(
              (v) =>
                v.lang.startsWith('en') &&
                (isDeep
                  ? v.name.includes('Daniel') || v.name.includes('Guy') || v.name.includes('Oliver') || v.name.includes('Male')
                  : v.name.includes('Alex') || v.name.includes('Male'))
            ) || voices.find((v) => v.lang.startsWith('en'));
            if (maleVoice) utterance.voice = maleVoice;
          }
        }
      }

      utterance.onstart = () => {
        if (this.speechSessionId !== sessionId) {
          try { this.synth?.cancel(); } catch (_) {}
          return;
        }
        VoiceLatencyTracker.record('audioPlayStart');
        this.isCurrentlySpeaking = true;
        options.onStart?.();
      };

      utterance.onend = () => {
        if (this.speechSessionId === sessionId) {
          VoiceLatencyTracker.record('audioPlayEnd');
          options.onEnd?.();
        }
      };

      utterance.onerror = () => {
        if (this.speechSessionId === sessionId) {
          options.onError?.();
        }
      };

      this.synth.speak(utterance);
    } catch (_) {
      options.onEnd?.();
    }
  }

  static isSpeaking(): boolean {
    return this.isCurrentlySpeaking || (!!this.synth && this.synth.speaking);
  }
}

/**
 * StreamSpeaker - Incremental streaming speech processor
 * Consumes SSE streaming text chunks as they arrive from Gemini,
 * detects completed sentences without breaking decimals/abbreviations,
 * triggers TTS in parallel, and maintains continuous audio playback without overlapping.
 */
export class StreamSpeaker {
  private sessionId: number;
  private voiceStyle: VoiceStyle;
  private options: TTSOptions;
  private buffer = '';
  private sentencesQueue: string[] = [];
  private isPlayingQueue = false;
  private isDoneStreaming = false;
  private hasStartedPlayback = false;
  private hasFinishedPlayback = false;
  private currentEmotion: string;

  constructor(sessionId: number, voiceStyle: VoiceStyle, options: TTSOptions) {
    this.sessionId = sessionId;
    this.voiceStyle = voiceStyle;
    this.options = options;
    this.currentEmotion = options.emotion || 'normal';
  }

  setEmotion(emotion: string) {
    if (emotion) {
      this.currentEmotion = emotion.toLowerCase();
    }
  }

  feedChunk(chunk: string) {
    if (!chunk || CompanionTTS.getSessionId() !== this.sessionId) return;
    this.buffer += chunk;

    // Extract complete sentences where punctuation (. ! ? । or newline) is followed by whitespace
    while (true) {
      const match = this.buffer.match(/^([\s\S]*?[.!?।\n]+)(\s+[\s\S]*)$/);
      if (!match) break;

      const candidate = match[1].trim();
      const rest = match[2];

      // Do not split in the middle of a decimal (e.g. "3.") or common abbreviation (e.g. "Mr.", "e.g.")
      if (/\d\.$/.test(candidate) && /^\s*\d/.test(rest)) {
        break;
      }
      if (NON_TERMINAL_ABBREVIATIONS.test(candidate)) {
        break;
      }

      // Wait if candidate is a very short reaction (< 14 chars like "Haha!" or "Ohh, nice!")
      // so it merges naturally with the following clause
      const cleanedCandidate = CompanionTTS.cleanSpeechText(candidate);
      if (cleanedCandidate.length < 14) {
        break;
      }

      this.buffer = rest.trimStart();
      this.enqueue(cleanedCandidate);
    }

    // If buffer grows very long (> 220 chars) without sentence-ending punctuation, split at last comma/clause
    if (this.buffer.length > 220) {
      const clauseMatch = this.buffer.match(/^([\s\S]{120,220}[,;—:])\s+([\s\S]*)$/);
      if (clauseMatch) {
        const clause = CompanionTTS.cleanSpeechText(clauseMatch[1]);
        this.buffer = clauseMatch[2];
        if (clause) {
          this.enqueue(clause);
        }
      }
    }
  }

  finish() {
    if (CompanionTTS.getSessionId() !== this.sessionId) return;
    this.isDoneStreaming = true;
    const remaining = this.buffer.trim();
    this.buffer = '';

    if (remaining.length > 0) {
      const segments = CompanionTTS.splitIntoSentences(remaining);
      for (const seg of segments) {
        this.enqueue(seg);
      }
    }

    if (!this.isPlayingQueue && this.sentencesQueue.length === 0) {
      this.completePlayback();
    }
  }

  private enqueue(cleanSentence: string) {
    if (!cleanSentence || CompanionTTS.getSessionId() !== this.sessionId) return;
    const detectedLang = LanguageEngine.detectLanguage(cleanSentence).mode;
    const effectiveLang =
      this.options.languageMode && this.options.languageMode !== 'english'
        ? this.options.languageMode
        : detectedLang;

    this.sentencesQueue.push(cleanSentence);

    // Immediately prefetch audio for this sentence chunk in parallel
    CompanionTTS.preloadSentenceAudio(
      cleanSentence,
      this.voiceStyle,
      effectiveLang,
      this.currentEmotion,
      this.sessionId
    );

    if (!this.isPlayingQueue) {
      void this.playNext();
    }
  }

  private completePlayback() {
    if (this.hasFinishedPlayback) return;
    this.hasFinishedPlayback = true;
    this.isPlayingQueue = false;
    if (CompanionTTS.getSessionId() === this.sessionId) {
      CompanionTTS.notifySpeakingState(false);
      this.options.onEnd?.();
    }
  }

  private async playNext() {
    if (CompanionTTS.getSessionId() !== this.sessionId) {
      this.isPlayingQueue = false;
      return;
    }

    if (this.sentencesQueue.length === 0) {
      this.isPlayingQueue = false;
      if (this.isDoneStreaming) {
        this.completePlayback();
      }
      return;
    }

    this.isPlayingQueue = true;
    const sentence = this.sentencesQueue.shift()!;
    const detectedLang = LanguageEngine.detectLanguage(sentence).mode;
    const effectiveLang =
      this.options.languageMode && this.options.languageMode !== 'english'
        ? this.options.languageMode
        : detectedLang;

    if (CompanionTTS.getMuted()) {
      if (!this.hasStartedPlayback) {
        this.hasStartedPlayback = true;
        this.options.onStart?.();
      }
      setTimeout(() => {
        void this.playNext();
      }, 50);
      return;
    }

    // Preload next queued sentence in background
    if (this.sentencesQueue.length > 0) {
      const nextSentence = this.sentencesQueue[0];
      const nextLang =
        this.options.languageMode && this.options.languageMode !== 'english'
          ? this.options.languageMode
          : LanguageEngine.detectLanguage(nextSentence).mode;
      CompanionTTS.preloadSentenceAudio(
        nextSentence,
        this.voiceStyle,
        nextLang,
        this.currentEmotion,
        this.sessionId
      );
    }

    await CompanionTTS.speakSingleSentence(this.sessionId, sentence, this.voiceStyle, {
      ...this.options,
      languageMode: effectiveLang,
      emotion: this.currentEmotion,
      onStart: () => {
        if (!this.hasStartedPlayback) {
          this.hasStartedPlayback = true;
          CompanionTTS.notifySpeakingState(true);
          this.options.onStart?.();
        }
      },
      onEnd: () => {
        void this.playNext();
      },
      onError: () => {
        void this.playNext();
      },
    });
  }
}

