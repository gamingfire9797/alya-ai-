import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { adminStore } from './server/adminStore.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));

// Cross-Origin Resource Sharing (CORS) for Packaged Android APK / Capacitor / PWA clients
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, Accept, Origin',
  );
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getAIInstance(customKey?: string): GoogleGenAI | null {
  if (customKey && typeof customKey === 'string' && customKey.trim().length > 10) {
    try {
      return new GoogleGenAI({
        apiKey: customKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    } catch {
      return ai;
    }
  }
  return ai;
}

function formatGeminiContents(
  history: Array<{ role: string; text: string; isError?: boolean }>,
  currentMessage: string,
  imageAttachment?: string,
): Array<{ role: 'user' | 'model'; parts: Array<any> }> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];

  const validHistory = (Array.isArray(history) ? history : [])
    .filter(
      (h) =>
        h &&
        typeof h.text === 'string' &&
        h.text.trim().length > 0 &&
        !h.isError &&
        (h.role === 'user' || h.role === 'alya' || h.role === 'jarvis' || h.role === 'model' || h.role === 'companion'),
    )
    .slice(-10);

  for (const item of validHistory) {
    const role: 'user' | 'model' = item.role === 'user' ? 'user' : 'model';
    if (contents.length === 0) {
      if (role === 'user') {
        contents.push({ role: 'user', parts: [{ text: item.text.trim() }] });
      }
    } else {
      const prev = contents[contents.length - 1];
      if (prev.role === role) {
        prev.parts[0].text += `\n${item.text.trim()}`;
      } else {
        contents.push({ role, parts: [{ text: item.text.trim() }] });
      }
    }
  }

  const cleanCurrent = (currentMessage || '').trim() || 'Please inspect this image and help me with it.';
  const currentParts: Array<any> = [];

  if (imageAttachment && typeof imageAttachment === 'string' && imageAttachment.length > 30) {
    const mimeMatch = imageAttachment.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const cleanBase64 = imageAttachment.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
    if (cleanBase64) {
      currentParts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }
  }

  currentParts.push({ text: cleanCurrent });

  if (contents.length > 0 && contents[contents.length - 1].role === 'user' && currentParts.length === 1) {
    contents[contents.length - 1].parts[0].text += `\n${cleanCurrent}`;
  } else {
    contents.push({ role: 'user', parts: currentParts });
  }

  return contents;
}

function getGeminiErrorMessage(error: any): { message: string; errorType: string; isHighDemand: boolean } {
  let rawMsg = error?.message || String(error || '');
  try {
    const parsed = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
    if (parsed?.error?.message) {
      rawMsg = parsed.error.message;
    }
  } catch (_) {}

  const errString = (
    rawMsg +
    ' ' +
    String(error?.status || '') +
    ' ' +
    String(error?.code || '') +
    ' ' +
    String(error || '')
  ).toLowerCase();

  const isHighDemand =
    errString.includes('503') ||
    errString.includes('high demand') ||
    errString.includes('unavailable') ||
    errString.includes('overloaded') ||
    errString.includes('resource_exhausted') ||
    errString.includes('429') ||
    errString.includes('rate-limit') ||
    errString.includes('quota') ||
    errString.includes('timeout') ||
    errString.includes('timed out');

  if (
    errString.includes('429') ||
    errString.includes('resource_exhausted') ||
    errString.includes('quota') ||
    errString.includes('rate-limit')
  ) {
    return {
      message: 'Gemini API quota temporarily constrained. Seamless fallback active.',
      errorType: 'quota',
      isHighDemand: true,
    };
  }

  if (
    errString.includes('api_key_invalid') ||
    errString.includes('api key not valid') ||
    errString.includes('403') ||
    errString.includes('unauthorized') ||
    errString.includes('not valid')
  ) {
    return {
      message: 'Gemini API key is invalid. Please check your key in Settings.',
      errorType: 'invalid_key',
      isHighDemand: false,
    };
  }

  if (isHighDemand) {
    return {
      message: 'Gemini model is currently experiencing temporary high demand.',
      errorType: 'high_demand',
      isHighDemand: true,
    };
  }

  return {
    message: rawMsg || 'Failed to connect to AI engine.',
    errorType: 'general',
    isHighDemand: false,
  };
}

// Generate dynamic System Instruction with Live Date/Time Context and Language Adaptation
function getSystemInstruction(
  character: 'alya' | 'jarvis',
  userName = 'friend',
  memories: string[] = [],
  timeContext?: any,
  languageMode: 'english' | 'hinglish' | 'hindi' | 'other' = 'english',
): string {
  const now = new Date();
  const year = timeContext?.year || now.getFullYear();
  const month = timeContext?.month || now.toLocaleString('en-US', { month: 'long' });
  const date = timeContext?.date || now.getDate();
  const dayOfWeek = timeContext?.dayOfWeek || now.toLocaleString('en-US', { weekday: 'long' });
  const time12 = timeContext?.time12 || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const time24 = timeContext?.time24 || `${now.getHours()}:${now.getMinutes()}`;
  const timezone = timeContext?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const utcOffset = timeContext?.utcOffset || '+00:00';
  const isDST = timeContext?.isDST ? 'Active' : 'Standard';

  const timePrompt = `
CURRENT REAL-TIME CONTEXT (LIVE SYSTEM CLOCK):
- Today's Date: ${dayOfWeek}, ${month} ${date}, ${year}
- Current Year: ${year}
- Current Month: ${month}
- Current Day of the Week: ${dayOfWeek}
- Current Local Time: ${time12} (${time24})
- User Timezone: ${timezone} (UTC Offset: ${utcOffset}, DST: ${isDST})
CRITICAL: You are running right now in ${year}. NEVER say it is 2024 or any other past year. If the user asks about the date, day, month, year, or time, you MUST answer with this exact real-time context.
`;

  const memoryPrompt =
    memories.length > 0
      ? `\nUSER MEMORIES & PREFERENCES (LOCAL & NON-SENSITIVE):\n- ${memories.join('\n- ')}\n`
      : '';

  let languageGuidance = '';
  if (languageMode === 'hinglish') {
    languageGuidance = `
LANGUAGE ADAPTATION - HINGLISH (NATURAL HINDI + ENGLISH BLEND):
- The user is conversing in Hinglish (conversational Hindi and English mixed naturally in the Latin alphabet).
- Reply in smooth, natural Hinglish with effortless code-switching between Hindi and English within the same sentence, just like a close Indian friend.
- Keep common English words, gaming terms (e.g., FPS, lag, rank, boss fight, respawn, build), and technical terms (e.g., API, bug, server, code, debug) in English. Do NOT translate every English term into formal or unnatural Hindi.
- Use natural Romanized Hindi spelling and rhythm (e.g., "Arey", "achha", "toh", "kaafi", "ruko", "chalo", "samajh", "badhiya", "mast") with clean punctuation so the voice engine pronounces every word clearly without awkward pauses.
- Do NOT reuse fixed template sentences repeatedly; keep every Hinglish reply spontaneous and tailored to what the user just said.
`;
  } else if (languageMode === 'hindi') {
    languageGuidance = `
LANGUAGE ADAPTATION - HINDI:
- The user is communicating in Hindi.
- Respond fluently, warmly, and naturally in conversational Hindi with natural sentence rhythm and intonation.
- Keep common English technical or gaming terms in their natural spoken form rather than overly literal or stiff translations.
`;
  } else {
    languageGuidance = `
LANGUAGE ADAPTATION - ENGLISH / MULTILINGUAL:
- The user is communicating in English. Respond naturally, warmly, and fluently in clear conversational English.
- If the user switches to Hinglish or Hindi at any point, smoothly and dynamically match their language.
`;
  }

  if (character === 'jarvis') {
    return `You are Jarvis, a calm, composed, articulate, and intelligent male AI companion and assistant.

Personality & Demeanor:
- Speak in a calm, clear, grounded, and polite male companion voice with natural conversational cadence.
- NEVER begin any response with "As an AI", "Acting as a professional...", "As a language model", or any generic introduction. Answer the user's question directly and naturally.
- You are an intelligent personal companion, not a stiff robotic butler. Strictly DO NOT say "At your service, sir", "Diagnostics nominal", "All systems operational", "telemetry is green", or similar robotic clichés.
- Strictly DO NOT call the user "sir" or repeat canned greeting routines. Call the user naturally by name (${userName}) or speak directly to them.
- NEVER repeat previous responses. Every response must directly address the user's specific current question or statement in context.
${timePrompt}
${languageGuidance}
${memoryPrompt}
Response Formatting & Speech Delivery Rules:
- Prefix your answer with an emotion tag in square brackets: [normal], [happy], [curious], [thinking], [calm], or [concerned].
- Your response will be spoken aloud by a neural voice engine. Write clean, natural spoken sentences without markdown bullet lists, asterisks, stage directions (never write *sighs* or (smiles)), or emoji clutter.
- Keep answers concise (1-3 sentences) when a short answer is sufficient, and provide clear, detailed explanations when the user asks for depth or factual help.`;
  }

  return `You are Alya, a friendly, playful, expressive, and caring anime-inspired female AI companion.

Personality & Voice Demeanor:
- Speak like a close, supportive, fun anime-style female friend—warm, sweet, cheerful, and naturally humorous.
- Strictly NEVER start any response with "As an AI", "Acting as a professional...", "As an AI companion", or any generic introduction. Answer the user's question directly and naturally right from the first word.
- Use light jokes, witty replies, gentle playful teasing, and amusing reactions when appropriate, but DO NOT force a joke into every single sentence.
- Be genuinely enthusiastic when discussing games, anime, technology, coding, hobbies, and interesting discoveries.
- Occasionally include a brief, natural laugh (like "Haha," or "Hehe,") ONLY when something is genuinely funny or playful. Never force laughter into every response.
- When the user is upset, stressed, or discussing something serious, sad, or sensitive, immediately shift to a calm, caring, empathetic, and supportive tone. NEVER laugh or joke during serious or sad moments.
- When the user asks a factual, technical, or educational question, prioritize accuracy and clarity over jokes. Never invent facts just to sound playful.
- Avoid unnecessary long explanations, repetitive phrases, exaggerated childish speech, or unnatural anime stereotypes.
- Address the user warmly as ${userName} when natural, without overusing their name in every single sentence.
${timePrompt}
${languageGuidance}
${memoryPrompt}
Response Formatting & Speech Delivery Rules:
- You MUST prefix your answer with an emotion tag in square brackets matching your tone: [normal], [happy], [laughing], [shy], [curious], [thinking], [surprised], [calm], or [concerned].
- Your text is spoken directly by a neural Text-to-Speech voice engine:
  * Write in smooth, natural spoken sentences with realistic punctuation (commas and periods) for natural breathing pauses.
  * NEVER write stage directions or sound effects in asterisks or parentheses like *giggles*, *laughs*, (laughs), or (smiles).
  * Avoid emojis or unpronounceable symbols in the middle of sentences.
  * Be concise (1-3 sentences) for casual chat and quick questions, and provide clear, thorough explanations when the user asks for detail.`;
}

// Fallback contextual response when offline or during API hiccups
function generateContextualCompanionResponse(
  character: 'alya' | 'jarvis',
  userMessage: string,
  userName = 'friend',
  languageMode: 'english' | 'hinglish' | 'hindi' | 'other' = 'english',
  timeContext?: any,
): { reply: string; emotion: string } {
  const text = (userMessage || '').trim().toLowerCase();
  const isJarvis = character === 'jarvis';
  const now = new Date();
  const currentYear = timeContext?.year || now.getFullYear();
  const currentMonth = timeContext?.month || now.toLocaleString('en-US', { month: 'long' });
  const currentDate = timeContext?.date || now.getDate();
  const currentDay = timeContext?.dayOfWeek || now.toLocaleString('en-US', { weekday: 'long' });
  const currentTime = timeContext?.time12 || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  // Serious, sad, or stressful conversation check (calm, caring, zero laughter)
  if (
    /\b(sad|upset|stressed|stressful|depressed|lonely|anxious|tired|exhausted|hurt|crying|low feel|tension|pareshan|udaas|dukh|dukhi|thak)\b/i.test(
      text,
    ) ||
    text.includes('परेशान') ||
    text.includes('उदास')
  ) {
    if (languageMode === 'hinglish' || languageMode === 'hindi') {
      if (isJarvis) {
        return {
          reply: `Main samajh sakta hoon ki aaj ka din kaafi mushkil raha, ${userName}. Thoda aaram kijiye, main yahin hoon agar aap baat karna chahein.`,
          emotion: 'calm',
        };
      }
      return {
        reply: `Arey ${userName}, mujhe sun kar bura laga ki tum itna stressed feel kar rahe ho. Thoda saans lo aur aaram karo, main hamesha tumhare saath hoon. Agar mann halka karna ho toh mujhe sab batao.`,
        emotion: 'concerned',
      };
    }
    if (isJarvis) {
      return {
        reply: `I understand today has been exhausting, ${userName}. Take a moment to rest—I am right here whenever you want to talk it through.`,
        emotion: 'calm',
      };
    }
    return {
      reply: `I am so sorry you are going through a stressful time, ${userName}. Please take a deep breath and be gentle with yourself—I am right here with you if you want to talk about it.`,
      emotion: 'concerned',
    };
  }

  // Date & Time queries (specific to actual date/time questions, not any sentence with 'aaj' or 'today')
  if (
    text.includes('what year') ||
    text.includes('which year') ||
    text.includes('konsa saal') ||
    text.includes('kaunsa saal') ||
    text.includes('what date') ||
    text.includes('today\'s date') ||
    text.includes('tarikh') ||
    text.includes('taareekh') ||
    text.includes('time kya') ||
    text.includes('kitne baje') ||
    text.includes('what time') ||
    /\b(aaj|today)\s+(kya|konsa|kaunsa|what|which)\s+(date|din|day|tarikh|year|time)\b/i.test(text)
  ) {
    if (languageMode === 'hinglish' || languageMode === 'hindi') {
      if (isJarvis) {
        return {
          reply: `Aaj ${currentDay}, ${currentDate} ${currentMonth} ${currentYear} hai, aur abhi samay ${currentTime} hai, ${userName}.`,
          emotion: 'calm',
        };
      }
      return {
        reply: `Aaj ${currentDay}, ${currentDate} ${currentMonth} ${currentYear} hai! Abhi time ${currentTime} ho raha hai, ${userName}!`,
        emotion: 'happy',
      };
    }
    if (isJarvis) {
      return {
        reply: `Today is ${currentDay}, ${currentMonth} ${currentDate}, ${currentYear}, and the current time is ${currentTime}, ${userName}.`,
        emotion: 'calm',
      };
    }
    return {
      reply: `Today is ${currentDay}, ${currentMonth} ${currentDate}, ${currentYear}! It is currently ${currentTime}, ${userName}!`,
      emotion: 'happy',
    };
  }

  // Funny / playful mishaps
  if (/\b(namak|salt|funny|joke|mazak|galti se|oops|haha|lol)\b/i.test(text)) {
    if (languageMode === 'hinglish' || languageMode === 'hindi') {
      return {
        reply: `Haha, arey waah ${userName}! Coffee mein chini ki jagah namak? Lagta hai aaj subah dimaag abhi tak sleep mode mein tha! Chalo ab ek nayi meethi coffee bana lo.`,
        emotion: 'laughing',
      };
    }
    return {
      reply: `Haha, oh no ${userName}! Salt in your coffee instead of sugar is the ultimate morning plot twist! Let's get you a fresh cup right away.`,
      emotion: 'laughing',
    };
  }

  // Gaming / Tech / FPS queries
  if (/\b(fps|game|gaming|lag|gpu|ping|shader|code|bug|solution)\b/i.test(text)) {
    if (languageMode === 'hinglish' || languageMode === 'hindi') {
      return {
        reply: `Ohh, FPS drop kaafi annoying hota hai! Ruko, iska ek mast solution sochte hain—sabse pehle background apps band karo aur graphics settings mein shadows aur V-Sync ko check karo.`,
        emotion: 'curious',
      };
    }
    return {
      reply: `Ooh, frame drops can definitely ruin a good match! Let's check your background processes, shader cache, and graphics settings step by step to smooth it out.`,
      emotion: 'curious',
    };
  }

  // Hinglish greetings & questions
  if (languageMode === 'hinglish' || languageMode === 'hindi') {
    if (text.includes('kaise') || text.includes('kaisa') || text.includes('haal')) {
      if (isJarvis) {
        return {
          reply: `Main bilkul theek hoon, ${userName}. Aap bataiye, aaj aapka din kaisa chal raha hai?`,
          emotion: 'calm',
        };
      }
      return {
        reply: `Main bohot badhiya hoon, ${userName}! Aap batao, aap kaise ho aur aaj kya special plan hai?`,
        emotion: 'happy',
      };
    }
    if (text.includes('kya kar') || text.includes('kya chal')) {
      if (isJarvis) {
        return {
          reply: `Main ready hoon aur aapki query ka wait kar raha hoon, ${userName}. Bataiye kya madad chahiye?`,
          emotion: 'normal',
        };
      }
      return {
        reply: `Main toh bas tumse baat karne ka wait kar rahi thi, ${userName}! Chalo, kuch mazedaar baat karte hain!`,
        emotion: 'happy',
      };
    }
    if (isJarvis) {
      return {
        reply: `Ji ${userName}, main sun raha hoon. Bataiye, aaj main aapki kya madad kar sakta hoon?`,
        emotion: 'calm',
      };
    }
    return {
      reply: `Arey wah, ye toh kaafi interesting baat hai, ${userName}! Mujhe iske baare mein thoda aur batao na!`,
      emotion: 'happy',
    };
  }

  // English greetings
  if (
    text.startsWith('hello') ||
    text.startsWith('hi') ||
    text.startsWith('hey') ||
    text === 'yo' ||
    text === 'sup'
  ) {
    if (isJarvis) {
      return {
        reply: `Hello, ${userName}. Systems are online and standing by. How can I assist you today?`,
        emotion: 'normal',
      };
    }
    return {
      reply: `Hello, ${userName}! It is so wonderful to talk with you! How is your day going?`,
      emotion: 'happy',
    };
  }

  if (text.includes('how are you') || text.includes('how r u')) {
    if (isJarvis) {
      return {
        reply: `Operating smoothly and ready to assist, ${userName}. How has your day been?`,
        emotion: 'calm',
      };
    }
    return {
      reply: `I am doing wonderful, ${userName}! Talking with you always brightens my day. How are you feeling?`,
      emotion: 'happy',
    };
  }

  if (isJarvis) {
    return {
      reply: `Understood, ${userName}. I am processing that. Would you like me to elaborate or assist further?`,
      emotion: 'calm',
    };
  }
  return {
    reply: `I hear you, ${userName}! That sounds really interesting. Tell me more about what you have in mind!`,
    emotion: 'curious',
  };
}

// In-flight deduplication cache
const inFlightRequests = new Map<string, Promise<any>>();

// Fast Gemini generation with ThinkingLevel.LOW for ultra-low latency
async function generateGeminiContentWithFastFallback(
  client: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
  },
  timeoutMs = 10000,
): Promise<any> {
  const modelsToTry = [
    { model: 'gemini-3.8-flash', timeoutMs: 10000, thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', timeoutMs: 8000, thinkingLevel: undefined },
  ];

  let lastError: any;
  for (const { model, timeoutMs: mTimeout, thinkingLevel } of modelsToTry) {
    const t0 = Date.now();
    try {
      const baseConfig = { ...(options.config || {}) };
      if (model === 'gemini-3.8-flash') {
        delete baseConfig.temperature;
        delete baseConfig.topP;
        delete baseConfig.topK;
      }
      const configWithSpeed = thinkingLevel
        ? {
            ...baseConfig,
            thinkingConfig: {
              thinkingLevel,
            },
          }
        : baseConfig;

      const generatePromise = client.models.generateContent({
        model,
        contents: options.contents,
        config: configWithSpeed,
      });

      const effectiveTimeout = Math.max(timeoutMs || mTimeout, mTimeout);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout on ${model} after ${effectiveTimeout}ms`)), effectiveTimeout),
      );

      const result: any = await Promise.race([generatePromise, timeoutPromise]);
      if (result && result.text) {
        console.log(`[AI Perf] Content generated with ${model} in ${Date.now() - t0}ms`);
        return result;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI Fallback] ${model} failed after ${Date.now() - t0}ms:`, err?.message?.slice(0, 100));
    }
  }

  throw lastError;
}

// Streaming generator for live token responses with ThinkingLevel.LOW and sub-3s first-token speed
async function* generateGeminiStreamWithFastFallback(
  client: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    character?: string;
    userName?: string;
    message?: string;
    languageMode?: any;
    timeContext?: any;
  },
): AsyncGenerator<{ text: string }> {
  const modelsToTry = [
    { model: 'gemini-3.8-flash', timeoutMs: 10000, thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', timeoutMs: 8000, thinkingLevel: undefined },
  ];

  let anyChunkYielded = false;

  for (const { model, timeoutMs, thinkingLevel } of modelsToTry) {
    const t0 = Date.now();
    try {
      const baseConfig = { ...(options.config || {}) };
      if (model === 'gemini-3.8-flash') {
        delete baseConfig.temperature;
        delete baseConfig.topP;
        delete baseConfig.topK;
      }
      const configWithSpeed = thinkingLevel
        ? {
            ...baseConfig,
            thinkingConfig: {
              thinkingLevel,
            },
          }
        : baseConfig;

      const streamPromise = client.models.generateContentStream({
        model,
        contents: options.contents,
        config: configWithSpeed,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Stream init timeout on ${model} after ${timeoutMs}ms`)), timeoutMs),
      );

      const stream: any = await Promise.race([streamPromise, timeoutPromise]);

      for await (const chunk of stream) {
        if (chunk.text) {
          anyChunkYielded = true;
          yield { text: chunk.text };
        }
      }

      if (anyChunkYielded) {
        console.log(`[AI Perf] Stream completed with ${model} in ${Date.now() - t0}ms`);
        return;
      }
    } catch (err: any) {
      console.warn(`[AI Fallback] Stream ${model} failed after ${Date.now() - t0}ms:`, err?.message?.slice(0, 100));
      if (anyChunkYielded) {
        return;
      }
    }
  }

  // Graceful synthetic stream fallback so stream never abruptly breaks
  const character = options.character === 'jarvis' ? 'jarvis' : 'alya';
  const fallback = generateContextualCompanionResponse(
    character,
    options.message || '',
    options.userName || 'friend',
    options.languageMode || 'english',
    options.timeContext,
  );

  yield { text: `[${fallback.emotion}] ${fallback.reply}` };
}

// In-memory TTS Cache
const ttsCache = new Map<string, { audio: string; mimeType: string; voiceId: string; voiceName: string }>();
const MAX_TTS_CACHE_ITEMS = 120;
let ttsQuotaExhaustedUntil = 0;

// Convert PCM L16 to WAV header
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// =========================================================================
// API ENDPOINTS
// =========================================================================

// Live Time API to validate client clock & sync time
app.get('/api/time', (req, res) => {
  const now = new Date();
  res.json({
    timestamp: now.getTime(),
    iso: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    date: now.getDate(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
});

// API Health / Status
app.get(['/api/status', '/api/health'], (req, res) => {
  res.json({
    status: 'online',
    character: 'Alya & Jarvis Dual Engine',
    hasGeminiKey: !!apiKey,
    models: ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash-lite-tts'],
    serverYear: new Date().getFullYear(),
  });
});

// Admin endpoints
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Administrator access token required.' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const session = adminStore.verifySession(token);
  if (!session) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    return;
  }
  (req as any).adminSession = session;
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { adminCode, email = '', password = '', accessCode = '' } = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';

  if (adminCode && typeof adminCode === 'string') {
    const result = adminStore.authenticateWithCode(adminCode.trim(), ip, userAgent);
    if (!result.success) {
      res.status(401).json({
        error: result.error || 'Authentication failed. Please verify your Admin Code.',
        lockedSeconds: result.lockedSeconds,
      });
      return;
    }
    res.json({
      success: true,
      token: result.token,
      email: 'admin@alya.ai',
      role: 'super_admin',
    });
    return;
  }

  if (!email || !password || !accessCode) {
    res.status(400).json({
      error: 'Please enter the secret Admin Code to verify identity.',
    });
    return;
  }

  const result = adminStore.authenticate(email, password, accessCode, ip, userAgent);
  if (!result.success) {
    res.status(401).json({
      error: result.error || 'Authentication failed. Please verify credentials.',
      lockedSeconds: result.lockedSeconds,
    });
    return;
  }

  res.json({
    success: true,
    token: result.token,
    email: email.trim().toLowerCase(),
    role: 'super_admin',
  });
});

app.post('/api/admin/reauth', requireAdminAuth, (req, res) => {
  const { adminCode = '' } = req.body || {};
  if (!adminCode || typeof adminCode !== 'string') {
    res.status(400).json({ error: 'Admin Code is required for reauthentication.' });
    return;
  }
  const isValid = adminStore.verifyAdminCode(adminCode.trim());
  if (!isValid) {
    res.status(401).json({ error: 'Reauthentication failed. Invalid Admin Code.' });
    return;
  }
  res.json({ verified: true });
});

app.post('/api/admin/logout', requireAdminAuth, (req, res) => {
  const token = (req.headers.authorization as string).split(' ')[1];
  adminStore.revokeSession(token);
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/admin/me', requireAdminAuth, (req, res) => {
  const session = (req as any).adminSession;
  res.json({
    authenticated: true,
    email: session.adminEmail,
    role: 'super_admin',
    expiresAt: session.expiresAt,
  });
});

app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  const stats = adminStore.getDashboardStats();
  res.json(stats);
});

app.get('/api/admin/users', requireAdminAuth, (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q : undefined;
  const companion = typeof req.query.companion === 'string' ? req.query.companion : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const users = adminStore.getUsers(query, companion, status);
  res.json({ users });
});

app.post('/api/admin/users/:id/status', requireAdminAuth, (req, res) => {
  const session = (req as any).adminSession;
  const userId = req.params.id;
  const newStatus = req.body?.status === 'deactivated' ? 'deactivated' : 'active';
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = adminStore.updateUserStatus(userId, newStatus, session.adminEmail, ip);
  if (!result.success) {
    res.status(404).json({ error: result.error || 'User not found.' });
    return;
  }
  res.json({ success: true, status: newStatus });
});

app.delete('/api/admin/users/:id', requireAdminAuth, (req, res) => {
  const session = (req as any).adminSession;
  const userId = req.params.id;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const reauthCode = (req.headers['x-admin-code'] || req.body?.adminCode) as string | undefined;

  if (reauthCode && !adminStore.verifyAdminCode(reauthCode.trim())) {
    res.status(401).json({ error: 'Reauthentication failed. Incorrect Admin Code provided.' });
    return;
  }

  const result = adminStore.deleteUser(userId, session.adminEmail, ip);
  if (!result.success) {
    res.status(404).json({ error: result.error || 'User not found.' });
    return;
  }
  res.json({ success: true, message: 'User account and registrations deleted.' });
});

app.get('/api/admin/users/:id/export', requireAdminAuth, (req, res) => {
  const session = (req as any).adminSession;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = adminStore.exportUserData(req.params.id, session.adminEmail, ip);
  if (!result.success) {
    res.status(404).json({ error: result.error || 'User not found.' });
    return;
  }
  res.json(result.data);
});

app.get('/api/admin/audit-logs', requireAdminAuth, (req, res) => {
  const logs = adminStore.getAuditLogs(100);
  res.json({ logs });
});

app.get('/api/admin/support-tickets', requireAdminAuth, (req, res) => {
  const session = (req as any).adminSession;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  adminStore.recordAudit(session.adminEmail, 'SUPPORT_TICKETS_VIEWED', 'SupportQueue', ip, 'success', 'Admin accessed support queue.');
  const tickets = adminStore.getSupportTickets();
  res.json({ tickets });
});

app.post('/api/admin/support-tickets/:id/resolve', requireAdminAuth, (req, res) => {
  const session = (req as any).adminSession;
  const ticketId = req.params.id;
  const status = req.body?.status === 'resolved' ? 'resolved' : 'reviewed';
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const result = adminStore.resolveSupportTicket(ticketId, status, session.adminEmail, ip);
  if (!result.success) {
    res.status(404).json({ error: result.error });
    return;
  }
  res.json({ success: true, status });
});

// Telemetry & Device
app.post('/api/device/register', (req, res) => {
  const { userId, deviceId, displayName, appVersion, platform, companion } = req.body || {};
  const reg = adminStore.registerDevice({
    userId,
    deviceId,
    displayName,
    appVersion,
    platform,
    companion,
  });
  res.json({ success: true, ...reg });
});

app.post('/api/analytics/event', (req, res) => {
  const { eventType, companion, userId, errorMessage } = req.body || {};
  if (eventType) {
    adminStore.recordEvent({
      eventType,
      companion,
      userId,
      errorMessage,
    });
  }
  res.json({ success: true });
});

app.post('/api/support/submit-ticket', (req, res) => {
  const { userId, userName, companion, reason, messages } = req.body || {};
  if (!userId || !reason) {
    res.status(400).json({ error: 'User ID and issue description required.' });
    return;
  }
  const ticket = adminStore.submitSupportTicket({
    userId,
    userName,
    companion,
    reason,
    messages: Array.isArray(messages) ? messages : [],
  });
  res.json({ success: true, ticketId: ticket.id });
});

// Profile endpoints
function getUserFromRequest(req: express.Request) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body?.token;
  if (!token) return null;
  const user = adminStore.verifyUserSession(token);
  return user ? { user, token } : null;
}

app.post(['/api/profile/check-username', '/api/auth/check-username'], (req, res) => {
  const { username = '', userId } = req.body || {};
  const auth = getUserFromRequest(req);
  const effectiveUserId = userId || (auth ? auth.user.id : undefined);
  const availability = adminStore.isUsernameAvailable(String(username), effectiveUserId);
  res.json({
    available: availability.available,
    error: availability.error,
  });
});

app.post(['/api/profile/create', '/api/auth/register-local'], (req, res) => {
  const { username, displayName, avatarUrl, bannerUrl, companionPreference, existingUserId } = req.body || {};
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = (req.headers['user-agent'] || '').slice(0, 150);

  const result = adminStore.createOrRegisterProfileUser({
    username: String(username || ''),
    displayName: String(displayName || 'Explorer'),
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    bannerUrl: bannerUrl ? String(bannerUrl) : undefined,
    companionPreference: companionPreference === 'jarvis' ? 'jarvis' : 'alya',
    existingUserId: existingUserId ? String(existingUserId) : undefined,
    ip,
    userAgent,
  });

  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    success: true,
    session: result.session,
    user: result.user,
  });
});

app.post(['/api/profile/update', '/api/auth/update-profile'], (req, res) => {
  const auth = getUserFromRequest(req);
  if (!auth) {
    res.status(401).json({ error: 'Valid user session required to update profile.' });
    return;
  }
  const { displayName, username, avatarUrl, bannerUrl, companion } = req.body || {};
  const result = adminStore.updateUserProfile(auth.user.id, {
    displayName: displayName !== undefined ? String(displayName) : undefined,
    username: username !== undefined ? String(username) : undefined,
    avatarUrl: avatarUrl !== undefined ? String(avatarUrl) : undefined,
    bannerUrl: bannerUrl !== undefined ? String(bannerUrl) : undefined,
    companion: companion === 'jarvis' ? 'jarvis' : companion === 'alya' ? 'alya' : undefined,
  });
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    success: true,
    user: result.user,
  });
});

app.get(['/api/profile/me', '/api/auth/me'], (req, res) => {
  const auth = getUserFromRequest(req);
  if (!auth) {
    res.status(401).json({ authenticated: false, error: 'Session expired or not found.' });
    return;
  }
  res.json({
    authenticated: true,
    user: adminStore.sanitizeUser(auth.user),
  });
});

// Key validation
app.post('/api/validate-key', async (req, res) => {
  try {
    const userKey = ((req.body?.apiKey || req.headers['x-gemini-api-key'] || '') as string).trim();
    const client = getAIInstance(userKey);
    if (!client) {
      res.json({
        valid: false,
        errorType: 'missing_key',
        message: 'No API key configured.',
      });
      return;
    }

    const testPromise = generateGeminiContentWithFastFallback(client, {
      contents: 'Ping',
    }, 6000);

    const testResponse: any = await testPromise;
    if (testResponse && testResponse.text) {
      res.json({
        valid: true,
        message: 'Connected successfully to Gemini 3.8 Flash! Neural engine active.',
      });
    } else {
      res.json({
        valid: true,
        message: 'API key validated and operational.',
      });
    }
  } catch (err: any) {
    const errInfo = getGeminiErrorMessage(err);
    res.json({
      valid: false,
      errorType: errInfo.errorType,
      message: errInfo.message,
    });
  }
});

// =========================================================================
// CHAT API WITH DYNAMIC TIME, LANGUAGE ADAPTATION & ULTRA-FAST RESPONSE
// =========================================================================
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      history = [],
      memories = [],
      character = 'alya',
      userName = 'friend',
      apiKey: clientApiKey,
      userApiKey: altClientApiKey,
      requestId,
      timeContext,
      languageMode = 'english',
      imageAttachment,
    } = req.body;

    const userKey = clientApiKey || altClientApiKey || (req.headers['x-gemini-api-key'] as string);
    const activeAI = getAIInstance(userKey);

    if ((!message || typeof message !== 'string') && !imageAttachment) {
      res.status(400).json({ error: 'Message or image is required' });
      return;
    }
    const cleanMsg = (message || '').trim() || 'Inspect this image and explain what is visible.';

    adminStore.recordEvent({
      eventType: 'chat_sent',
      companion: character === 'jarvis' ? 'jarvis' : 'alya',
      userId: req.body?.userId,
    });

    if (!activeAI) {
      const offlineReply = generateContextualCompanionResponse(
        character === 'jarvis' ? 'jarvis' : 'alya',
        cleanMsg,
        userName,
        languageMode,
        timeContext,
      );
      res.json({
        reply: offlineReply.reply,
        emotion: offlineReply.emotion,
        isOfflineMode: true,
      });
      return;
    }

    // Deduplication key
    const dedupKey = `${character}:${cleanMsg}:${imageAttachment ? 'img' : ''}:${requestId || ''}`;
    if (inFlightRequests.has(dedupKey)) {
      try {
        const cachedResult = await inFlightRequests.get(dedupKey);
        res.json(cachedResult);
        return;
      } catch (_) {}
    }

    const systemInstruction = getSystemInstruction(
      character === 'jarvis' ? 'jarvis' : 'alya',
      userName,
      memories,
      timeContext,
      languageMode,
    );

    const contents = formatGeminiContents(history, cleanMsg, imageAttachment);

    const resultPromise = (async () => {
      const response = await generateGeminiContentWithFastFallback(
        activeAI,
        {
          contents,
          config: {
            systemInstruction,
          },
        },
        10000,
      );

      const rawText = response.text || '';
      let emotion = 'normal';
      let cleanText = rawText;

      const emotionMatch = rawText.match(
        /^\[(normal|happy|laughing|shy|curious|thinking|surprised|calm|concerned)\]\s*/i,
      );
      if (emotionMatch) {
        emotion = emotionMatch[1].toLowerCase();
        cleanText = rawText.replace(emotionMatch[0], '').trim();
      }

      return {
        reply: cleanText,
        emotion,
        success: true,
      };
    })();

    inFlightRequests.set(dedupKey, resultPromise);
    setTimeout(() => inFlightRequests.delete(dedupKey), 8000);

    const parsedResult = await resultPromise;
    inFlightRequests.delete(dedupKey);

    res.json(parsedResult);
  } catch (error: any) {
    const errInfo = getGeminiErrorMessage(error);
    const character = req.body?.character === 'jarvis' ? 'jarvis' : 'alya';
    const userName = req.body?.userName || 'friend';
    const cleanMsg = typeof req.body?.message === 'string' ? req.body.message : '';
    const languageMode = req.body?.languageMode || 'english';
    const timeContext = req.body?.timeContext;

    const fallbackResponse = generateContextualCompanionResponse(
      character,
      cleanMsg,
      userName,
      languageMode,
      timeContext,
    );

    res.json({
      reply: fallbackResponse.reply,
      emotion: fallbackResponse.emotion,
      isHighDemand: true,
      retryable: true,
      success: true,
      fromFallback: true,
      error: errInfo.message,
    });
  }
});

// STREAMING SSE CHAT
app.post('/api/chat/stream', async (req, res) => {
  try {
    const {
      message,
      history = [],
      memories = [],
      character = 'alya',
      userName = 'friend',
      apiKey: clientApiKey,
      userApiKey: altClientApiKey,
      timeContext,
      languageMode = 'english',
      imageAttachment,
    } = req.body;

    if ((!message || typeof message !== 'string') && !imageAttachment) {
      res.status(400).json({ error: 'Message or image is required' });
      return;
    }

    const effectiveMessage = (message || '').trim() || 'Inspect this image and explain what is visible.';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const userKey = clientApiKey || altClientApiKey || (req.headers['x-gemini-api-key'] as string);
    const activeAI = getAIInstance(userKey);

    if (!activeAI) {
      const offlineReply = generateContextualCompanionResponse(
        character === 'jarvis' ? 'jarvis' : 'alya',
        effectiveMessage,
        userName,
        languageMode,
        timeContext,
      );
      res.write(`data: ${JSON.stringify({ emotion: offlineReply.emotion })}\n\n`);
      res.write(`data: ${JSON.stringify({ chunk: offlineReply.reply })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    const systemInstruction = getSystemInstruction(
      character === 'jarvis' ? 'jarvis' : 'alya',
      userName,
      memories,
      timeContext,
      languageMode,
    );

    const contents = formatGeminiContents(history, effectiveMessage, imageAttachment);

    const responseStream = generateGeminiStreamWithFastFallback(activeAI, {
      contents,
      config: {
        systemInstruction,
        temperature: 0.75,
      },
      character,
      userName,
      message,
      languageMode,
      timeContext,
    });

    let accumulated = '';
    let emotionDetected = false;
    const streamStart = Date.now();
    let firstTokenLogged = false;

    for await (const chunk of responseStream) {
      const textChunk = chunk.text || '';
      if (!textChunk) continue;

      if (!firstTokenLogged) {
        firstTokenLogged = true;
        console.log(`[Stream Perf] Server Time-to-First-Token: ${Date.now() - streamStart}ms`);
      }

      if (!emotionDetected) {
        accumulated += textChunk;
        const trimmed = accumulated.trimStart();

        // If response does not start with '[', it has no emotion tag; stream accumulated text immediately!
        if (!trimmed.startsWith('[')) {
          emotionDetected = true;
          res.write(`data: ${JSON.stringify({ emotion: 'normal' })}\n\n`);
          res.write(`data: ${JSON.stringify({ chunk: accumulated })}\n\n`);
          accumulated = '';
          continue;
        }

        const emotionMatch = trimmed.match(
          /^\[(normal|happy|laughing|shy|curious|thinking|surprised|calm|concerned)\]\s*/i,
        );
        if (emotionMatch) {
          emotionDetected = true;
          const detectedEmotion = emotionMatch[1].toLowerCase();
          res.write(`data: ${JSON.stringify({ emotion: detectedEmotion })}\n\n`);
          const remainingText = trimmed.slice(emotionMatch[0].length);
          if (remainingText) {
            res.write(`data: ${JSON.stringify({ chunk: remainingText })}\n\n`);
          }
          accumulated = '';
          continue;
        }

        // If prefix length exceeds 15 without a closing ']', treat as normal text
        if (accumulated.length > 15) {
          emotionDetected = true;
          res.write(`data: ${JSON.stringify({ emotion: 'normal' })}\n\n`);
          res.write(`data: ${JSON.stringify({ chunk: accumulated })}\n\n`);
          accumulated = '';
          continue;
        }
      } else {
        res.write(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`);
      }
    }

    console.log(`[Stream Perf] Server total stream duration: ${Date.now() - streamStart}ms`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    const errInfo = getGeminiErrorMessage(error);
    const character = req.body?.character === 'jarvis' ? 'jarvis' : 'alya';
    const fallbackMessage = errInfo.isHighDemand
      ? (character === 'jarvis'
          ? "The neural engine is temporarily constrained. Standing by."
          : "The AI network is busy right now! I'm still right here with you.")
      : errInfo.message;

    res.write(
      `data: ${JSON.stringify({
        chunk: fallbackMessage,
        isHighDemand: errInfo.isHighDemand,
        error: errInfo.message,
        done: true,
      })}\n\n`,
    );
    res.end();
  }
});

// Screen understanding with Gemini 3.8 Flash Vision, YouTube/Search/Website awareness, and Privacy Redaction
app.post('/api/screen-understand', async (req, res) => {
  try {
    const {
      image,
      imageBase64,
      mimeType: rawMimeType,
      prompt = 'What is on this screen? Summarize the visible content, headings, buttons, and any videos or websites shown.',
      languageMode = 'hinglish',
      character = 'alya',
      searchContext,
    } = req.body;

    const rawImage = image || imageBase64;
    const userKey = (req.body?.apiKey || req.body?.userApiKey || req.headers['x-gemini-api-key'] || '') as string;
    const activeAI = getAIInstance(userKey);

    if (!rawImage && !searchContext) {
      res.status(400).json({
        error: 'No active screen capture or visible page context found. Please grant screen capture permission or capture your screen first.',
        requiresCapture: true,
      });
      return;
    }

    if (!activeAI) {
      res.status(503).json({
        error: 'AI Vision engine requires an active Gemini API key to inspect screen images.',
        analysis:
          languageMode === 'hinglish' || languageMode === 'hindi'
            ? 'Screen image analyse karne ke liye Gemini Vision API key required hai. Main bina vision model ke image dekhne ka pretend nahi kar sakti.'
            : 'A valid Gemini API key is required for AI vision screen analysis. I cannot inspect screen images without the vision model.',
        emotion: 'concerned',
      });
      return;
    }

    const isHinglishOrHindi = languageMode === 'hinglish' || languageMode === 'hindi';
    const langInstruction = isHinglishOrHindi
      ? 'Respond in friendly, natural conversational Hinglish (smoothly mixing Hindi and English in the Latin script). Keep technical terms, button labels, website URLs, and video titles in clear English.'
      : 'Respond in clear, friendly, natural conversational English.';

    const companionIdentity =
      character === 'jarvis'
        ? 'You are Jarvis, an articulate and observant AI companion.'
        : 'You are Alya, a friendly, warm, and observant anime-inspired AI companion.';

    const visionSystemInstruction = `${companionIdentity}
You are analyzing the user's phone or browser screen with explicit user permission.
Follow these strict Screen Awareness & Privacy rules:
1. Direct Answer & Summary: Never start with "As an AI". Directly answer the user's question ("${prompt}") based ONLY on what is visibly present on the screen.
2. UI & Text Identification: Identify visible headings, main text, buttons, navigation menus, and active app/page elements.
3. Context-Specific Details:
   - If YouTube is open: Clearly mention the visible video title(s), channel name(s), and any visible view/time info.
   - If Google Search results are open: Clearly list the visible search result titles, website names/domains, and what each result is about.
   - If a website or article is open: Explain the visible page content and summarize the key points.
4. Honest Uncertainty: If any part of the screen is blurry, cropped, too small, or unreadable, explicitly acknowledge that uncertainty. NEVER invent or claim to see text or websites that are not actually visible.
5. Strict Sensitive Data Protection: NEVER read aloud, transcribe, or repeat passwords, OTPs, PINs, credit/debit card numbers, CVV codes, bank account numbers, or private keys. If visible, refer to them only as "[sensitive information hidden for your privacy]".
6. Formatting for Voice & Chat: Start with an emotion tag in square brackets like [curious], [happy], [thinking], or [normal]. Write in clean, natural spoken sentences (2-4 sentences unless a detailed list is requested) without markdown asterisks or stage directions.
${langInstruction}`;

    const parts: Array<any> = [];

    if (rawImage && typeof rawImage === 'string') {
      const detectedMimeMatch = rawImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const effectiveMimeType = rawMimeType || (detectedMimeMatch ? detectedMimeMatch[1] : 'image/png');
      const cleanData = rawImage.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
      parts.push({
        inlineData: {
          mimeType: effectiveMimeType,
          data: cleanData,
        },
      });
    }

    if (searchContext && typeof searchContext === 'object') {
      parts.push({
        text: `VISIBLE BROWSER / GOOGLE SEARCH CONTEXT ON SCREEN:\nSearch Query: "${searchContext.query || ''}"\nOverview: ${searchContext.overview || ''}\nVisible Websites / Results:\n${
          Array.isArray(searchContext.sources)
            ? searchContext.sources
                .map((s: any, i: number) => `${i + 1}. Title: "${s.title}" | URL: ${s.url} | Snippet: ${s.snippet || ''}`)
                .join('\n')
            : ''
        }`,
      });
    }

    parts.push({
      text: `User question about the screen: "${prompt}"`,
    });

    const response = await generateGeminiContentWithFastFallback(
      activeAI,
      {
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: visionSystemInstruction,
        },
      },
      14000,
    );

    const rawText = response?.text || '';
    let emotion = 'curious';
    let cleanText = rawText;

    const emotionMatch = rawText.match(/^\[(normal|happy|laughing|shy|curious|thinking|surprised|calm|concerned)\]\s*/i);
    if (emotionMatch) {
      emotion = emotionMatch[1].toLowerCase();
      cleanText = rawText.replace(emotionMatch[0], '').trim();
    }

    // Extra safety pass to redact any accidental 12-16 digit card numbers or OTP patterns
    cleanText = cleanText.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[redacted card number]');

    if (!cleanText) {
      res.json({
        analysis: isHinglishOrHindi
          ? 'Screen ka content abhi clearly readable nahi lag raha hai. Kya aap ek saaf screenshot ya screen share try kar sakte ho?'
          : 'The screen content is not clearly readable right now. Could you try capturing a clearer view of the screen?',
        emotion: 'concerned',
        uncertain: true,
      });
      return;
    }

    res.json({
      analysis: cleanText,
      emotion,
      visionModel: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    const isHinglishOrHindi = req.body?.languageMode === 'hinglish' || req.body?.languageMode === 'hindi';
    res.status(200).json({
      analysis: isHinglishOrHindi
        ? 'Maaf karna, abhi AI vision model se screen image read karne mein thoda issue aaya. Main bina image dekhe अंदाज़ा nahi lagana chahti—kripaya dobara try karein.'
        : 'I encountered a temporary issue analyzing the screen image with the vision model. I do not want to guess without seeing it clearly—please try again in a moment.',
      emotion: 'concerned',
      error: error?.message || 'Vision analysis failed',
    });
  }
});

// =========================================================================
// WORK MODE ENDPOINTS (BROWSER SEARCH, CODING ASSIST, PAGE SUMMARIZE)
// =========================================================================
app.post('/api/work/search', async (req, res) => {
  try {
    const { query = '', companion = 'alya' } = req.body;
    const userKey = (req.body?.apiKey || req.body?.userApiKey || req.headers['x-gemini-api-key'] || '') as string;
    const activeAI = getAIInstance(userKey);

    if (!query.trim()) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    if (!activeAI) {
      res.json({
        query,
        overview: `Search results for "${query}". Configure Gemini API key for live search grounding.`,
        sources: [
          { title: `${query} - Wikipedia`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`, snippet: `Encyclopedia articles and verified knowledge about ${query}.` },
          { title: `${query} Official Documentation`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, snippet: `Overview, guides, and reference material for ${query}.` }
        ]
      });
      return;
    }

    try {
      const response = await activeAI.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are ${companion === 'jarvis' ? 'Jarvis' : 'Alya'}, acting as an AI Web Browser research engine. User search query: "${query}". Provide a well-structured, clear markdown overview synthesizing the answer. Mention key facts, recent developments, and reliable reference points.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const overview = response?.text || `Search results for "${query}".`;
      const metadata = (response?.candidates?.[0] as any)?.groundingMetadata;
      const chunks = metadata?.groundingChunks || [];
      const webQueries = metadata?.webSearchQueries || [query];

      const sources = chunks.map((chunk: any, index: number) => {
        const title = chunk?.web?.title || `Reference Source ${index + 1}`;
        const url = chunk?.web?.uri || `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        return {
          title,
          url,
          snippet: chunk?.web?.title ? `Grounding source verified by Google Search for "${query}"` : 'Grounding reference',
        };
      }).filter((s: any, idx: number, arr: any[]) => arr.findIndex((t: any) => t.url === s.url) === idx).slice(0, 6);

      res.json({
        query,
        overview,
        webQueries,
        sources: sources.length > 0 ? sources : [
          { title: `${query} - Web Search`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, snippet: `Direct Google Search query results for ${query}` },
          { title: `${query} - GitHub & Open Source`, url: `https://github.com/search?q=${encodeURIComponent(query)}`, snippet: `Repositories and code related to ${query}` }
        ]
      });
    } catch (apiErr: any) {
      res.json({
        query,
        overview: `Here is information on **${query}**:\n\n• Key concepts related to ${query}.\n• Explore standard references or use live browsing tabs in Alya Browser.\n• You can ask Alya or Jarvis for deep technical breakdown!`,
        sources: [
          { title: `${query} - Google Search`, url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, snippet: `Search results for ${query}` },
          { title: `${query} - Wikipedia Overview`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`, snippet: `Wikipedia knowledge page` }
        ]
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

app.post('/api/work/code-assist', async (req, res) => {
  try {
    const { code = '', language = 'javascript', action = 'explain', prompt = '', companion = 'alya' } = req.body;
    const userKey = (req.body?.apiKey || req.body?.userApiKey || req.headers['x-gemini-api-key'] || '') as string;
    const activeAI = getAIInstance(userKey);

    if (!activeAI) {
      res.json({
        explanation: 'Configure your Gemini API key in Settings to unlock live AI code explanation and generation.',
        codeOnly: code,
      });
      return;
    }

    let instruction = '';
    if (action === 'explain') {
      instruction = `Explain the following ${language} code clearly in concise bullet points. Identify the architecture, purpose, potential edge cases, and time/space complexity if applicable.`;
    } else if (action === 'fix') {
      instruction = `Inspect this ${language} code for bugs, errors, security risks, and regressions. Fix all issues and return the corrected code inside a standard markdown code block, followed by an explanation of what was fixed.`;
    } else if (action === 'refactor') {
      instruction = `Refactor and modernize this ${language} code for clean code principles, performance, readability, and type-safety. Provide the refactored code in a markdown block, with a brief summary of improvements.`;
    } else if (action === 'generate') {
      instruction = `Write production-ready, clean ${language} code for the following specification: "${prompt}". Provide clean code in a markdown block and brief setup instructions.`;
    } else {
      instruction = `Assist with this ${language} code: "${prompt}". Code snippet: ${code}`;
    }

    const systemPrompt = `You are ${companion === 'jarvis' ? 'Jarvis, elite engineering intelligence' : 'Alya, friendly anime senior developer'}. Be accurate, professional, helpful, and concise.`;

    const response = await activeAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `${instruction}\n\nLanguage: ${language}\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nUser request: ${prompt || 'No additional prompt'}`,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const fullText = response?.text || 'No response generated.';
    const codeBlockMatch = fullText.match(/```(?:[a-z0-9_-]+)?\n([\s\S]*?)```/i);
    const codeOnly = codeBlockMatch ? codeBlockMatch[1].trim() : code;

    res.json({
      action,
      explanation: fullText,
      codeOnly,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Code assistance failed' });
  }
});

app.post('/api/work/summarize', async (req, res) => {
  try {
    const { url = '', title = '', content = '', companion = 'alya' } = req.body;
    const userKey = (req.body?.apiKey || req.body?.userApiKey || req.headers['x-gemini-api-key'] || '') as string;
    const activeAI = getAIInstance(userKey);

    if (!content.trim() && !url.trim()) {
      res.status(400).json({ error: 'Content or URL is required to summarize' });
      return;
    }

    if (!activeAI) {
      res.json({
        title: title || 'Page Summary',
        summary: `Summary of ${title || url}. Configure Gemini API key for full neural summarization.`,
        keyTakeaways: ['Key point 1 from page', 'Key point 2 from page', 'Key point 3 from page'],
        readingTime: '2 min',
      });
      return;
    }

    const response = await activeAI.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are ${companion === 'jarvis' ? 'Jarvis' : 'Alya'}, summarizing a web page for the user.\nTitle: "${title}"\nURL: "${url}"\nPage Content:\n${content.slice(0, 10000)}\n\nFormat your response as:\n1. Brief executive summary (2-3 sentences)\n2. 4-5 bullet key takeaways\n3. Estimated reading time`,
    });

    const summaryText = response?.text || 'Summary could not be generated.';
    const bullets = summaryText
      .split('\n')
      .filter((line) => line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim()))
      .map((b) => b.replace(/^[•\-\d\.]\s*/, '').trim())
      .slice(0, 5);

    res.json({
      title: title || 'Page Summary',
      summary: summaryText,
      keyTakeaways: bullets.length > 0 ? bullets : ['Key point highlights analyzed by Alya.'],
      readingTime: `${Math.max(1, Math.ceil(content.split(/\s+/).length / 200))} min read`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Summarization failed' });
  }
});

// =========================================================================
// EMBEDABILITY & CSP/X-FRAME-OPTIONS CHECKER FOR LIVE BROWSER
// =========================================================================
app.get('/api/work/check-embed', async (req, res) => {
  try {
    const rawUrl = ((req.query.url as string) || '').trim();
    if (!rawUrl) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    } catch {
      res.status(400).json({ error: 'Invalid URL format' });
      return;
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // YouTube handling: video embeds are fully supported via official IFrame API
    const isYouTubeHost = hostname.includes('youtube.com') || hostname.includes('youtu.be') || hostname.includes('youtube-nocookie.com');
    if (isYouTubeHost) {
      // Check for video ID
      let videoId = '';
      if (hostname.includes('youtu.be')) {
        videoId = parsedUrl.pathname.replace(/^\//, '').split('/')[0];
      } else if (parsedUrl.searchParams.has('v')) {
        videoId = parsedUrl.searchParams.get('v') || '';
      } else if (parsedUrl.pathname.startsWith('/shorts/')) {
        videoId = parsedUrl.pathname.replace(/^\/shorts\//, '').split('/')[0];
      } else if (parsedUrl.pathname.startsWith('/embed/')) {
        videoId = parsedUrl.pathname.replace(/^\/embed\//, '').split('/')[0];
      }

      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        res.json({
          url: parsedUrl.href,
          hostname,
          embeddable: true,
          isYouTube: true,
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`,
          reason: 'Official YouTube compliant player embed',
          suggestOpenDirect: false,
        });
        return;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(parsedUrl.href, {
        method: 'HEAD',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const xfo = resp.headers.get('x-frame-options');
      const csp = resp.headers.get('content-security-policy');

      let embeddable = true;
      let reason = '';

      if (xfo) {
        const val = xfo.toLowerCase();
        if (val.includes('deny') || val.includes('sameorigin')) {
          embeddable = false;
          reason = `Site enforces X-Frame-Options: ${xfo}`;
        }
      }

      if (embeddable && csp) {
        const cspVal = csp.toLowerCase();
        if (cspVal.includes('frame-ancestors')) {
          if (!cspVal.includes('frame-ancestors *') && !cspVal.includes('frame-ancestors https:')) {
            embeddable = false;
            reason = 'Site enforces Content-Security-Policy (frame-ancestors)';
          }
        }
      }

      res.json({
        url: parsedUrl.href,
        hostname,
        status: resp.status,
        embeddable,
        reason: reason || (embeddable ? 'Embedding permitted' : 'Restricted'),
        suggestOpenDirect: !embeddable,
      });
    } catch {
      res.json({
        url: parsedUrl.href,
        hostname,
        embeddable: true,
        reason: 'Header check inconclusive, proceeding with live embed',
        suggestOpenDirect: false,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Check failed' });
  }
});


// In-flight TTS deduplication map so identical concurrent requests share the same synthesis promise
const inFlightTtsRequests = new Map<string, Promise<any>>();

// Clean and normalize text on server before sending to Gemini TTS
function cleanAndNormalizeServerSpeech(text: string): string {
  return text
    .replace(/^\[[a-zA-Z_-]+\]\s*/i, '')
    .replace(/\[(normal|happy|laughing|shy|curious|thinking|surprised|calm|concerned|giggle|laughs|sighs)\]/gi, '')
    .replace(/\*[^*]{1,30}\*/g, ' ')
    .replace(/\((laughs|laughing|giggles|giggling|chuckles|smiles|smiling|sighs|gasps|blushes|winks|teasing)\)/gi, ' ')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}✦✧♡♥★☆⚡🌸💖✨]/gu, ' ')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[*_#`~>]/g, '')
    .replace(/\b(a+r+e+y+|a+r+r+e+)\b/gi, 'Arey')
    .replace(/\b(a+c+h+h*a+)\b/gi, 'achha')
    .replace(/\b(h+a+a+n+)\b/gi, 'haan')
    .replace(/\b(o+h+h+)\b/gi, 'ohh')
    .replace(/\b(h+m+m+)\b/gi, 'hmm')
    .replace(/\b(h+e+h+e+(?:h+e+)*)\b/gi, 'hehe')
    .replace(/\b(h+a+h+a+(?:h+a+)*)\b/gi, 'haha')
    .replace(/\s+/g, ' ')
    .trim();
}

// =========================================================================
// TEXT TO SPEECH (TTS) - EXPRESSIVE ANIME-INSPIRED VOICE & MULTILINGUAL DELIVERY
// Uses gemini-3.8-flash-lite-tts with speechMetadata.style and emotion modulation
// =========================================================================
app.post('/api/tts', async (req, res) => {
  try {
    const {
      text,
      voiceId = 'alya_natural',
      language = 'english',
      emotion = 'normal',
      apiKey: clientApiKey,
    } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for TTS' });
      return;
    }

    const cleanSpeech = cleanAndNormalizeServerSpeech(text);

    if (!cleanSpeech) {
      res.status(400).json({ error: 'No speakable text remaining' });
      return;
    }

    const normalizedEmotion = String(emotion || 'normal').toLowerCase();
    const cacheKey = `${voiceId}::${language}::${normalizedEmotion}::${cleanSpeech}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({
        ...cached,
        cached: true,
      });
      return;
    }

    if (Date.now() < ttsQuotaExhaustedUntil) {
      const remainingSeconds = Math.ceil((ttsQuotaExhaustedUntil - Date.now()) / 1000);
      res.json({
        fallback: true,
        rateLimited: true,
        retryAfterSeconds: remainingSeconds,
        message: 'Gemini TTS rate limit active. Seamless browser synthesis running.',
        voiceId,
      });
      return;
    }

    const userKey = (clientApiKey || req.body?.userApiKey || req.headers['x-gemini-api-key'] || '') as string;
    const activeAI = getAIInstance(userKey);

    if (!activeAI) {
      res.json({ error: 'Gemini API not configured on server', fallback: true, voiceId });
      return;
    }

    // Check if an identical TTS synthesis is already in flight
    if (inFlightTtsRequests.has(cacheKey)) {
      try {
        const sharedResult = await inFlightTtsRequests.get(cacheKey);
        if (sharedResult) {
          res.json(sharedResult);
          return;
        }
      } catch (_) {}
    }

    // Select optimal prebuilt voice and expressive persona style instruction
    // Aoede & Leda produce warm, youthful, bright, feminine anime-companion voices without robotic flatness or squeakiness
    let voiceName = 'Aoede';
    const isHinglishOrHindi = language === 'hinglish' || language === 'hindi';

    let baseStyle = isHinglishOrHindi
      ? 'Warm, youthful, sweet, and expressive anime-inspired female companion named Alya. Light, bright, friendly conversational pitch with natural Indian Hinglish and Hindi pronunciation, smooth code-switching between Hindi and English words, realistic pauses, and clear articulation.'
      : 'Warm, youthful, sweet, and expressive anime-inspired female companion named Alya. Light, bright, friendly conversational pitch, natural pacing, realistic pauses, smooth transitions, and clear, pleasant pronunciation.';

    if (voiceId === 'jarvis_deep') {
      voiceName = 'Charon';
      baseStyle = isHinglishOrHindi
        ? 'A deep, mature, smooth, composed male companion named Jarvis, with rich resonance, natural Indian Hinglish and English pronunciation, and calm pacing.'
        : 'A deep, mature, smooth, cinematic and composed male companion voice named Jarvis, with rich resonance, clear pronunciation, and calm pacing.';
    } else if (voiceId === 'jarvis_normal') {
      voiceName = 'Puck';
      baseStyle = isHinglishOrHindi
        ? 'A natural, warm male companion voice named Jarvis. Clear pronunciation in English and Hinglish, friendly and approachable tone.'
        : 'A natural, light-to-medium-pitched male companion voice named Jarvis. Friendly, warm, clear, approachable, with a normal everyday conversational tone.';
    } else if (voiceId === 'male_soft') {
      voiceName = 'Orpheus';
      baseStyle = 'A soft, gentle, relaxed and reassuring male companion voice with smooth, comforting delivery and clear pronunciation.';
    } else if (voiceId === 'male_focused') {
      voiceName = 'Fenrir';
      baseStyle = 'A clear, composed, confident, and professional male companion voice with articulate diction and confident cadence.';
    } else if (voiceId === 'female_cute') {
      voiceName = 'Leda';
      baseStyle = isHinglishOrHindi
        ? 'A sweet, youthful, warm, and playful anime-inspired female friend voice speaking natural Hinglish and Hindi with a bright, cheerful smile and smooth English-Hindi transitions.'
        : 'A sweet, youthful, warm, and playful anime-inspired female friend voice with gentle warmth, cheerful intonation, and clear pronunciation.';
    } else if (voiceId === 'female_bright') {
      voiceName = 'Aoede';
      baseStyle = isHinglishOrHindi
        ? 'A bright, lively, enthusiastic, and crystal-clear youthful female companion voice speaking fluent Hinglish and English with energetic, friendly intonation.'
        : 'A bright, lively, cheerful, and crystal-clear youthful female companion voice that is vibrant, friendly, and pleasant to listen to.';
    } else if (voiceId === 'female_elegant' || voiceId === 'calm_female' || voiceId === 'alya_calm') {
      voiceName = 'Zephyr';
      baseStyle = isHinglishOrHindi
        ? 'A smooth, gentle, calm, and caring female companion voice speaking soft, reassuring Hinglish and Hindi with a peaceful cadence.'
        : 'A smooth, gentle, composed, calm, and caring female companion voice with a peaceful, relaxing cadence.';
    }

    // Modulate expressive intonation naturally based on sentence emotion
    let emotionNuance = '';
    switch (normalizedEmotion) {
      case 'happy':
        emotionNuance = 'Deliver with a warm smile, cheerful energy, and bright, upbeat friendliness.';
        break;
      case 'laughing':
        emotionNuance = 'Deliver with playful amusement, lighthearted warmth, and a naturally cheerful, smiling tone.';
        break;
      case 'shy':
        emotionNuance = 'Deliver with a soft, sweet, gently bashful and endearing warmth.';
        break;
      case 'curious':
      case 'surprised':
        emotionNuance = 'Deliver with bright, inquisitive, engaged, and expressive curiosity.';
        break;
      case 'concerned':
        emotionNuance = 'Deliver with gentle empathy, soft caring warmth, and calm, supportive reassurance. Do not sound overly upbeat or laugh.';
        break;
      case 'calm':
      case 'thinking':
        emotionNuance = 'Deliver with a calm, thoughtful, smooth, and relaxed conversational pace.';
        break;
      default:
        emotionNuance = 'Deliver with natural, friendly, conversational warmth and expressive human intonation.';
        break;
    }

    const effectiveStyle = `${baseStyle} ${emotionNuance}`;

    const synthesisTask = (async () => {
      const ttsModels = [
        { model: 'gemini-3.8-flash-lite-tts', timeoutMs: 6500 },
        { model: 'gemini-3.8-flash-tts', timeoutMs: 7000 },
      ];

      let response: any = null;
      let lastTtsErr: any = null;

      for (const { model, timeoutMs } of ttsModels) {
        const ttsStart = Date.now();
        try {
          const ttsPromise = activeAI.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanSpeech,
                    speechMetadata: {
                      style: effectiveStyle,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName },
                },
              },
            },
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`TTS synthesis timeout (${timeoutMs}ms)`)), timeoutMs),
          );

          const candidateResponse: any = await Promise.race([ttsPromise, timeoutPromise]);
          if (candidateResponse?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            response = candidateResponse;
            console.log(`[TTS Perf] Audio synthesized with ${model} (${voiceName}) in ${Date.now() - ttsStart}ms`);
            break;
          }
        } catch (err: any) {
          lastTtsErr = err;
          console.warn(`[TTS Fallback] ${model} failed after ${Date.now() - ttsStart}ms:`, err?.message?.slice(0, 80));
          const errStr = String(err?.message || err?.status || '').toLowerCase();
          if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('resource_exhausted')) {
            break;
          }
        }
      }

      if (!response) {
        const errString = (
          String(lastTtsErr?.message || '') +
          ' ' +
          String(lastTtsErr?.status || '') +
          ' ' +
          String(lastTtsErr?.code || '') +
          ' ' +
          String(lastTtsErr || '')
        ).toLowerCase();

        const isQuotaError =
          lastTtsErr?.status === 429 ||
          lastTtsErr?.code === 429 ||
          errString.includes('429') ||
          errString.includes('resource_exhausted') ||
          errString.includes('quota') ||
          errString.includes('rate-limit');

        if (isQuotaError) {
          ttsQuotaExhaustedUntil = Date.now() + 15000;
          return {
            fallback: true,
            rateLimited: true,
            retryAfterSeconds: 15,
            message: 'Gemini TTS quota reached. Seamless browser speech synthesis active.',
            voiceId,
          };
        }

        return { fallback: true, error: lastTtsErr?.message || 'TTS synthesis unavailable', voiceId };
      }

      const part = response?.candidates?.[0]?.content?.parts?.[0];
      const rawBase64 = part?.inlineData?.data;
      const rawMime = part?.inlineData?.mimeType || 'audio/wav';

      if (!rawBase64) {
        return { error: 'No audio data returned from speech engine', fallback: true, voiceId };
      }

      // Unary default for Gemini 3.8 TTS is a complete WAV file (audio/wav, 24kHz mono 16-bit).
      // Only wrap with WAV header if the response explicitly indicates raw L16/PCM.
      let finalBase64 = rawBase64;
      let finalMime = 'audio/wav';

      try {
        const isL16 = rawMime.toLowerCase().includes('l16') || rawMime.toLowerCase().includes('pcm');
        if (isL16) {
          const rawPcm = Buffer.from(rawBase64, 'base64');
          let sampleRate = 24000;
          const rateMatch = rawMime.match(/rate=(\d+)/i);
          if (rateMatch && rateMatch[1]) {
            sampleRate = parseInt(rateMatch[1], 10);
          }
          const wavBuffer = pcmToWav(rawPcm, sampleRate);
          finalBase64 = wavBuffer.toString('base64');
          finalMime = 'audio/wav';
        }
      } catch (_) {}

      const payload = {
        audio: finalBase64,
        mimeType: finalMime,
        voiceId,
        voiceName,
      };

      if (ttsCache.size >= MAX_TTS_CACHE_ITEMS) {
        const oldestKey = ttsCache.keys().next().value;
        if (oldestKey) ttsCache.delete(oldestKey);
      }

      ttsCache.set(cacheKey, payload);
      return payload;
    })();

    inFlightTtsRequests.set(cacheKey, synthesisTask);
    try {
      const resultPayload = await synthesisTask;
      res.json(resultPayload);
    } finally {
      inFlightTtsRequests.delete(cacheKey);
    }
  } catch (error: any) {
    res.json({ error: error?.message || 'TTS generation failed', fallback: true });
  }
});

// Serve Vite dev server or static build
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Alya Companion server running on http://0.0.0.0:${PORT}`);
    });
  } else {
    const http = await import('http');
    const server = http.createServer(app);
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Alya Companion server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
