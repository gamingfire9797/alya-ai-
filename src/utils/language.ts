import { LanguageMode, CommunicationStyleProfile } from '../types';

// Unambiguous Romanized Hindi / Hinglish tokens used in conversational dialogue
const HINGLISH_TOKENS = new Set([
  'kya', 'kyun', 'kyu', 'kaise', 'kaisa', 'kaisi', 'kab', 'kahan', 'kidhar', 'kon', 'kaun',
  'kisne', 'kisko', 'kiska', 'kiski', 'kuch', 'koi', 'sab', 'sabko', 'sabse',
  'hai', 'hain', 'hoon', 'tha', 'thi', 'hoga', 'hogi', 'hoge', 'nikla', 'nikli',
  'raha', 'rahi', 'rahe', 'kar', 'karo', 'kare', 'karein', 'karna', 'karte', 'karti', 'kiya',
  'mujhe', 'mujhko', 'mera', 'meri', 'mere', 'tum', 'tumhe', 'tumhara', 'tumhari', 'tumhare',
  'tujhe', 'tera', 'teri', 'tere', 'aap', 'aapko', 'aapka', 'aapki', 'aapke',
  'hum', 'humein', 'humko', 'hamara', 'hamari', 'hamare', 'apna', 'apni', 'apne',
  'unhe', 'unko', 'unka', 'iska', 'iski', 'iske', 'isko', 'usko', 'uska', 'uski',
  'yahan', 'wahan', 'idhar', 'udhar', 'abhi', 'pehle', 'baad', 'saath', 'bina', 'liye',
  'theek', 'thik', 'accha', 'achha', 'achcha', 'badhiya', 'badiya', 'bohot', 'bahut', 'bohat',
  'sahi', 'mast', 'kaafi', 'kafi', 'zyada', 'jyada', 'thoda', 'thodi', 'bilkul', 'zaroor', 'pakka',
  'nahi', 'nahin', 'haan', 'hanji', 'shukriya', 'dhanyawad', 'namaste', 'pranam',
  'batao', 'bataiye', 'bata', 'bolo', 'boliye', 'bol', 'suno', 'sunao', 'dekh', 'dekho', 'dekhte',
  'ruko', 'ruk', 'soch', 'socho', 'sochte', 'samajh', 'samjha', 'samjhi', 'samjhao',
  'pata', 'maloom', 'lagta', 'lagti', 'lagte', 'chahiye', 'chahte', 'chahti',
  'yaar', 'bhai', 'bhaiya', 'dost', 'didi', 'boss', 'arey', 'arre', 'oye', 'wah', 'waah',
  'chalo', 'chal', 'chalte', 'aaj', 'kal', 'parson', 'kabhi',
  'baat', 'baatein', 'kaam', 'din', 'raat', 'subah', 'shaam', 'waqt', 'samay', 'madad', 'zaroorat',
  'toh', 'aur', 'lekin', 'magar', 'kyunki', 'phir', 'fir', 'waise', 'shayad', 'matlab',
  'bhi', 'mein', 'wala', 'wali', 'wale', 'mazaa', 'maza', 'mazedaar', 'jugaad', 'tension',
  'keh', 'kehna', 'kehte', 'kehti', 'mila', 'mili', 'milega', 'milegi', 'hogaya', 'ata', 'aata', 'aati'
]);

// Strong Hinglish conversational starters/markers that immediately signal Hinglish even in a mostly-English sentence
const STRONG_HINGLISH_MARKERS = new Set([
  'arey', 'arre', 'achha', 'accha', 'achcha', 'toh', 'ruko', 'chalo', 'yaar', 'bhai',
  'kya', 'kaise', 'kaisa', 'kaafi', 'bohot', 'bahut', 'mast', 'batao', 'dekho', 'suno',
  'haan', 'nahi', 'theek', 'bilkul', 'samajh', 'mujhe', 'tum', 'aap', 'main'
]);

// Devanagari script range
const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

export interface DetectionResult {
  mode: LanguageMode;
  confidence: number;
  hinglishScore: number;
  hasDevanagari: boolean;
  wordCount: number;
  reason: string;
}

export class LanguageEngine {
  /**
   * Detect dominant language mode of a single utterance: 'hindi' | 'hinglish' | 'english' | 'other'
   */
  static detectLanguage(text: string): DetectionResult {
    const clean = (text || '').trim();
    if (!clean) {
      return {
        mode: 'english',
        confidence: 0.5,
        hinglishScore: 0,
        hasDevanagari: false,
        wordCount: 0,
        reason: 'Empty input defaults to English',
      };
    }

    const hasDevanagari = DEVANAGARI_REGEX.test(clean);
    if (hasDevanagari) {
      return {
        mode: 'hindi',
        confidence: 0.95,
        hinglishScore: 0.9,
        hasDevanagari: true,
        wordCount: clean.split(/\s+/).length,
        reason: 'Contains Devanagari script',
      };
    }

    // Split words and sanitize
    const words = clean
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1);

    if (words.length === 0) {
      return {
        mode: 'english',
        confidence: 0.5,
        hinglishScore: 0,
        hasDevanagari: false,
        wordCount: 0,
        reason: 'No alphabetic words detected',
      };
    }

    let hinglishCount = 0;
    let strongMarkerCount = 0;
    for (const word of words) {
      if (HINGLISH_TOKENS.has(word)) {
        hinglishCount++;
      }
      if (STRONG_HINGLISH_MARKERS.has(word) && word !== 'main') {
        strongMarkerCount++;
      }
    }
    // Check if "main" is used in a Hindi context (e.g. "main theek", "main hoon", "main bhi", "main kar")
    if (/\bmain\s+(theek|thik|hoon|hu|bhi|toh|nahi|kar|aa|ja|soch|dekh|sun|bol|samajh|khush|ready|yahin)\b/i.test(clean)) {
      hinglishCount++;
      strongMarkerCount++;
    }

    const hinglishRatio = hinglishCount / words.length;

    // Classification logic:
    // 1. Multiple Hinglish words, or >= 15% Hinglish tokens, or any strong Hinglish marker in a conversational sentence
    if (
      hinglishCount >= 2 ||
      (hinglishCount >= 1 && hinglishRatio >= 0.15) ||
      (strongMarkerCount >= 1 && words.length <= 12)
    ) {
      return {
        mode: 'hinglish',
        confidence: Math.min(1, 0.65 + hinglishRatio * 0.35),
        hinglishScore: Math.max(hinglishRatio, 0.3),
        hasDevanagari: false,
        wordCount: words.length,
        reason: `Detected ${hinglishCount} Hinglish markers (${Math.round(hinglishRatio * 100)}% of words)`,
      };
    }

    return {
      mode: 'english',
      confidence: 0.85,
      hinglishScore: hinglishRatio,
      hasDevanagari: false,
      wordCount: words.length,
      reason: 'Standard English vocabulary detected',
    };
  }

  /**
   * Normalize text specifically for natural TTS pronunciation in English, Hinglish, and Hindi.
   * Preserves conversational meaning while removing unpronounceable symbols/emojis and fixing
   * common Romanized Hindi phonetic ambiguities.
   */
  static normalizeForSpeech(text: string, mode: LanguageMode = 'english'): string {
    if (!text) return '';

    let s = text
      // Remove leading emotion tags like [happy], [laughing], [calm]
      .replace(/^\[[a-zA-Z_-]+\]\s*/i, '')
      // Remove any inline bracketed tags like [thinking] or [laugh]
      .replace(/\[(normal|happy|laughing|shy|curious|thinking|surprised|calm|concerned|giggle|laughs|sighs)\]/gi, '')
      // Remove asterisk or parenthetical stage directions like *giggles*, *laughs*, (laughs), (smiles)
      .replace(/\*[^*]{1,30}\*/g, ' ')
      .replace(/\((laughs|laughing|giggles|giggling|chuckles|smiles|smiling|sighs|gasps|blushes|winks|teasing)\)/gi, ' ')
      // Strip emojis and decorative pictographs so TTS never reads emoji descriptions aloud
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}✦✧♡♥★☆⚡🌸💖✨]/gu, ' ')
      // Remove raw URLs
      .replace(/https?:\/\/\S+/gi, '')
      // Strip markdown formatting characters while keeping the words inside
      .replace(/[*_#`~>]/g, '')
      // Convert bullet markers at line starts into natural pauses
      .replace(/(?:^|\n)\s*[•\-]\s+/g, '. ')
      // Normalize elongated vocalizations while preserving capitalization
      .replace(/\b(A+r+e+y+|A+r+r+e+)\b/g, 'Arey')
      .replace(/\b(a+r+e+y+|a+r+r+e+)\b/g, 'arey')
      .replace(/\b(A+c+h+h*a+)\b/g, 'Achha')
      .replace(/\b(a+c+h+h*a+)\b/g, 'achha')
      .replace(/\b(H+a+a+n+)\b/g, 'Haan')
      .replace(/\b(h+a+a+n+)\b/g, 'haan')
      .replace(/\b(O+h+h+)\b/g, 'Ohh')
      .replace(/\b(o+h+h+)\b/g, 'ohh')
      .replace(/\b(H+m+m+)\b/g, 'Hmm')
      .replace(/\b(h+m+m+)\b/g, 'hmm')
      .replace(/\b(H+e+h+e+(?:h+e+)*)\b/g, 'Hehe')
      .replace(/\b(h+e+h+e+(?:h+e+)*)\b/g, 'hehe')
      .replace(/\b(H+a+h+a+(?:h+a+)*)\b/g, 'Haha')
      .replace(/\b(h+a+h+a+(?:h+a+)*)\b/g, 'haha')
      // Normalize spaced ellipses or multiple dots/exclamations
      .replace(/\.{2,}/g, '... ')
      .replace(/!{2,}/g, '!')
      .replace(/\?{2,}/g, '?')
      // Ensure space after sentence punctuation when followed by a letter (preserving decimals like 3.8 and abbreviations like e.g. / i.e.)
      .replace(/([!?।])\s*([A-Za-z\u0900-\u097F])/g, '$1 $2')
      .replace(/\b(e\.g|i\.e)\./gi, (m) => m.toLowerCase() === 'e.g.' ? 'for example,' : 'that is,')
      .replace(/([A-Za-z]{2,})\.([A-Z][a-z])/g, '$1. $2')
      .replace(/\s+/g, ' ')
      .trim();

    // Common technical & gaming abbreviations for natural spoken delivery
    s = s
      .replace(/\bUI\/UX\b/g, 'U I U X')
      .replace(/\bNPCs\b/g, 'N P Cs')
      .replace(/\bNPC\b/g, 'N P C')
      .replace(/\bFPS\b/g, 'F P S')
      .replace(/\bRPG\b/g, 'R P G')
      .replace(/\bGPU\b/g, 'G P U')
      .replace(/\bCPU\b/g, 'C P U')
      .replace(/\bAPI\b/g, 'A P I');

    return s.trim();
  }

  /**
   * Determine speech recognition language code to optimize browser STT accuracy.
   * Chrome/Edge performs significantly better for Indian users/Hinglish when set to 'en-IN'.
   */
  static getSTTLanguage(detectedMode: LanguageMode, userPreferred?: string): string {
    if (userPreferred === 'hindi' || detectedMode === 'hindi') {
      return 'hi-IN';
    }
    if (userPreferred === 'hinglish' || detectedMode === 'hinglish') {
      return 'en-IN'; // en-IN handles Hinglish phonetic loanwords best in Web Speech API
    }
    return 'en-US';
  }

  /**
   * Produce dynamic language instructions for AI prompt based on latest message
   * and owner communication history.
   */
  static getPromptInstruction(
    detected: DetectionResult,
    ownerStyle?: Partial<CommunicationStyleProfile>
  ): string {
    const mode = detected.mode;

    if (mode === 'hinglish') {
      return [
        `CRITICAL LANGUAGE & TONE DIRECTIVE:`,
        `- The user is speaking in HINGLISH (a natural blend of Hindi and English written in the Latin alphabet).`,
        `- Reply in natural, effortless Hinglish with smooth code-switching between Hindi and English within the same sentence.`,
        `- Keep English gaming terms, technical terms, and everyday English words in English—do NOT translate every English term into stiff or formal Hindi.`,
        `- Write Romanized Hindi clearly with natural rhythm and punctuation so it sounds great when spoken aloud.`,
      ].join('\n');
    }

    if (mode === 'hindi') {
      return [
        `CRITICAL LANGUAGE DIRECTIVE:`,
        `- The user is communicating in HINDI.`,
        `- Respond fluently, warmly, and naturally in conversational Hindi, keeping common technical or gaming terms natural.`,
      ].join('\n');
    }

    return [
      `CRITICAL LANGUAGE DIRECTIVE:`,
      `- The user is communicating in ENGLISH.`,
      `- Respond naturally, warmly, and fluently in ENGLISH.`,
      `- If the user switches to Hinglish or Hindi at any point, smoothly adapt to their language.`,
    ].join('\n');
  }

  /**
   * Update communication style profile based on new message
   */
  static updateStyleProfile(
    current: CommunicationStyleProfile | undefined,
    newMessage: string
  ): CommunicationStyleProfile {
    const detection = this.detectLanguage(newMessage);
    const existing: CommunicationStyleProfile = current || {
      dominantLanguage: 'english',
      hinglishAffinity: 0.3,
      hindiAffinity: 0.1,
      englishAffinity: 0.6,
      formality: 'casual',
      preferredPacing: 'natural',
      lastUpdated: new Date().toISOString(),
    };

    const alpha = 0.25; // smoothing factor
    let newHinglish = existing.hinglishAffinity;
    let newHindi = existing.hindiAffinity;
    let newEnglish = existing.englishAffinity;

    if (detection.mode === 'hinglish') {
      newHinglish = Math.min(1, newHinglish + alpha * (1 - newHinglish));
      newEnglish = Math.max(0, newEnglish - alpha * 0.5);
    } else if (detection.mode === 'hindi') {
      newHindi = Math.min(1, newHindi + alpha * (1 - newHindi));
    } else {
      newEnglish = Math.min(1, newEnglish + alpha * (1 - newEnglish));
      newHinglish = Math.max(0, newHinglish - alpha * 0.3);
    }

    const maxScore = Math.max(newHinglish, newHindi, newEnglish);
    const dominant: LanguageMode =
      maxScore === newHinglish
        ? 'hinglish'
        : maxScore === newHindi
        ? 'hindi'
        : 'english';

    return {
      dominantLanguage: dominant,
      hinglishAffinity: Number(newHinglish.toFixed(2)),
      hindiAffinity: Number(newHindi.toFixed(2)),
      englishAffinity: Number(newEnglish.toFixed(2)),
      formality: existing.formality,
      preferredPacing: existing.preferredPacing,
      lastUpdated: new Date().toISOString(),
    };
  }
}
