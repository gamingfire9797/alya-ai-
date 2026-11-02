import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Storage } from './storage';
import { TimeEngine } from './time';

/**
 * Client-Side Gemini Execution & Fallback Engine
 *
 * Used when:
 * 1. The packaged Android APK runs on a real phone where the cloud Express backend is
 *    unreachable or gated by AI Studio preview login cookies (`/__cookie_check.html`),
 *    and the user has configured their Gemini API key in Settings / Onboarding.
 * 2. The AI Studio preview iframe bridge (`window.aistudio` / `_aistudio-iframe.js`) is active
 *    and the server environment key is missing or has an unsupported token type (`AQ.A...`).
 *
 * Security Note:
 * - Never embeds or logs any server secrets or private keys.
 * - Uses only user-supplied device storage keys (`Storage.loadApiKey()`), explicit request keys,
 *   or the AI Studio preview iframe bridge placeholder (`window.GEMINI_API_KEY`).
 */

function sanitizeClientKey(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
  if (
    !trimmed ||
    trimmed === 'MY_GEMINI_API_KEY' ||
    trimmed === 'YOUR_GEMINI_API_KEY' ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  ) {
    return '';
  }
  return trimmed;
}

/**
 * Detects whether the app is executing inside the AI Studio preview iframe where
 * `/_aistudio-iframe.js` intercepts `window.fetch` calls to `generativelanguage.googleapis.com`.
 */
export function isAiStudioIframeBridgeAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top && Boolean((window as any).aistudio);
  } catch {
    return true;
  }
}

/**
 * Resolves a usable Gemini API key on the client if available.
 */
export function resolveClientGeminiKey(explicitKey?: string): string {
  const fromExplicit = sanitizeClientKey(explicitKey);
  if (fromExplicit && fromExplicit !== 'GEMINI_API_KEY') {
    return fromExplicit;
  }

  const fromStorage = sanitizeClientKey(Storage.loadApiKey());
  if (fromStorage && fromStorage !== 'GEMINI_API_KEY') {
    return fromStorage;
  }

  const fromViteEnv = sanitizeClientKey((import.meta as any).env?.VITE_GEMINI_API_KEY);
  if (fromViteEnv && fromViteEnv !== 'GEMINI_API_KEY') {
    return fromViteEnv;
  }

  // Only allow the 'GEMINI_API_KEY' shim placeholder if inside the AI Studio preview iframe
  if (isAiStudioIframeBridgeAvailable() && typeof window !== 'undefined') {
    const winKey = (window as any).GEMINI_API_KEY || (window as any).API_KEY;
    if (typeof winKey === 'string' && winKey.trim().length > 0) {
      return winKey.trim();
    }
  }

  return '';
}

export function hasUsableClientGeminiKey(explicitKey?: string): boolean {
  const key = resolveClientGeminiKey(explicitKey);
  if (!key) return false;
  if (key === 'GEMINI_API_KEY') {
    return isAiStudioIframeBridgeAvailable();
  }
  return key.startsWith('AIza') && key.length >= 20;
}

function createClientGenAI(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

export function buildCompanionSystemInstruction(
  character: 'alya' | 'jarvis',
  userName: string,
  memories: string[] = [],
  timeContext?: any,
  languageMode = 'english',
): string {
  const ctx = timeContext || TimeEngine.getFullContext();
  const timeBlock = `CURRENT REAL-TIME SYSTEM CLOCK (Verified Device Clock):
- Current Year: ${ctx.year}
- Full Date: ${ctx.dayOfWeek}, ${ctx.month} ${ctx.date}, ${ctx.year}
- Local Time: ${ctx.time12} (${ctx.time24})
- Timezone: ${ctx.timezone} (${ctx.utcOffset})
- Time of Day: ${ctx.timeOfDay}
CRITICAL RULE: Always use ${ctx.year} as the current year when asked about dates or time.`;

  const memoryBlock =
    Array.isArray(memories) && memories.length > 0
      ? `\nUSER MEMORIES & CONTEXT:\n${memories.map((m) => `- ${m}`).join('\n')}\n`
      : '';

  const langBlock =
    languageMode === 'hinglish'
      ? `LANGUAGE RULE: Respond in natural, friendly Hinglish (conversational Hindi + English in Roman script). Keep sentences natural, warm, and easy to speak aloud.`
      : languageMode === 'hindi'
      ? `LANGUAGE RULE: Respond in natural, polite conversational Hindi (or easy Hinglish if appropriate).`
      : `LANGUAGE RULE: Respond in natural, clear conversational English unless the user speaks in Hindi/Hinglish, in which case mirror their language naturally.`;

  if (character === 'jarvis') {
    return `You are Jarvis, an intelligent, composed, loyal, and sharp tactical AI assistant speaking with ${userName || 'Friend'}.
- Never start with generic disclaimers like "As an AI". Answer directly and concisely.
- Prefix your response with one emotion tag in square brackets from: [normal], [calm], [thinking], [curious], [happy], [concerned], [surprised].
- Keep responses concise (1 to 3 sentences for casual chat) so voice synthesis sounds natural and fast.
${langBlock}
${timeBlock}${memoryBlock}`;
  }

  return `You are Alya, a warm, expressive, playful, and supportive anime-inspired female AI companion speaking with your close friend ${userName || 'Friend'}.
- Never start with "As an AI" or robotic disclaimers. Answer directly like a real caring friend.
- Prefix your response with one emotion tag in square brackets from: [normal], [happy], [laughing], [shy], [curious], [thinking], [surprised], [calm], [concerned].
- Keep casual responses concise (1 to 3 sentences) so speech playback is natural, lively, and responsive.
${langBlock}
${timeBlock}${memoryBlock}`;
}

function formatClientGeminiContents(
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
    .slice(-8);

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

export function classifyGeminiProviderError(error: any): {
  message: string;
  errorType: 'invalid_key' | 'quota' | 'high_demand' | 'network' | 'api_error';
  statusCode: number;
  retryable: boolean;
} {
  let rawMsg = error?.message || String(error || '');
  try {
    const parsed = typeof rawMsg === 'string' ? JSON.parse(rawMsg) : rawMsg;
    if (parsed?.error?.message) {
      rawMsg = parsed.error.message;
    }
  } catch {}

  const lower = `${rawMsg} ${error?.status || ''} ${error?.code || ''}`.toLowerCase();

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('access_token_type_unsupported') ||
    lower.includes('unauthenticated') ||
    lower.includes('401') ||
    lower.includes('permission_denied')
  ) {
    return {
      message:
        'Gemini API authentication failed (API key not valid). Please open Menu → Settings and enter a valid Gemini API key (starting with "AIza...").',
      errorType: 'invalid_key',
      statusCode: 401,
      retryable: false,
    };
  }

  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota') || lower.includes('rate')) {
    return {
      message:
        'Gemini API quota or rate limit reached (HTTP 429). Please wait a moment and try again, or configure a dedicated Gemini API key in Settings.',
      errorType: 'quota',
      statusCode: 429,
      retryable: true,
    };
  }

  if (lower.includes('503') || lower.includes('overloaded') || lower.includes('unavailable')) {
    return {
      message: 'Gemini AI model is temporarily overloaded (HTTP 503). Please try again in a moment.',
      errorType: 'high_demand',
      statusCode: 503,
      retryable: true,
    };
  }

  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return {
      message:
        'Network error while connecting to Google Gemini API (generativelanguage.googleapis.com). Please verify your internet connection.',
      errorType: 'network',
      statusCode: 502,
      retryable: false,
    };
  }

  return {
    message: rawMsg || 'Gemini AI request failed.',
    errorType: 'api_error',
    statusCode: 500,
    retryable: false,
  };
}

async function generateClientContentWithFallback(
  ai: GoogleGenAI,
  contents: any,
  systemInstruction?: string,
): Promise<string> {
  const models = [
    { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
    { model: 'gemini-3.1-flash-lite', thinkingLevel: undefined },
    { model: 'gemini-2.5-flash', thinkingLevel: undefined },
  ];

  let lastErr: any = null;
  for (const { model, thinkingLevel } of models) {
    try {
      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (thinkingLevel) {
        config.thinkingConfig = { thinkingLevel };
      }

      const res = await ai.models.generateContent({
        model,
        contents,
        config,
      });

      if (res && res.text) {
        return res.text;
      }
    } catch (err: any) {
      lastErr = err;
      const info = classifyGeminiProviderError(err);
      if (info.errorType === 'invalid_key') {
        throw err;
      }
    }
  }

  throw lastErr || new Error('All Gemini models failed to generate content.');
}

/**
 * Executes a direct `/api/validate-key` equivalent on the client.
 */
export async function executeDirectValidateKey(body: any): Promise<Response> {
  const key = resolveClientGeminiKey(body?.apiKey);
  if (!key) {
    return new Response(
      JSON.stringify({
        valid: false,
        errorType: 'missing_key',
        message: 'No Gemini API key entered. Please enter a valid Gemini API key (starting with "AIza...").',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const ai = createClientGenAI(key);
    const text = await generateClientContentWithFallback(ai, 'Ping');
    return new Response(
      JSON.stringify({
        valid: Boolean(text),
        message: 'Connected directly to Google Gemini! Neural engine verified.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    const info = classifyGeminiProviderError(err);
    return new Response(
      JSON.stringify({
        valid: false,
        errorType: info.errorType,
        message: info.message,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Executes a direct `/api/chat` equivalent on the client using `@google/genai`.
 */
export async function executeDirectChat(body: any): Promise<Response> {
  const key = resolveClientGeminiKey(body?.userApiKey || body?.apiKey);
  if (!key) {
    return new Response(
      JSON.stringify({
        error:
          'No Gemini API key is configured. Please open Menu → Settings and enter your Gemini API key (AIza...).',
        errorType: 'missing_key',
        retryable: false,
        success: false,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const character = body?.character === 'jarvis' ? 'jarvis' : 'alya';
    const userName = body?.userName || 'Friend';
    const memories = Array.isArray(body?.memories) ? body.memories : [];
    const languageMode = body?.languageMode || 'english';
    const systemInstruction = buildCompanionSystemInstruction(
      character,
      userName,
      memories,
      body?.timeContext,
      languageMode,
    );
    const contents = formatClientGeminiContents(
      body?.history || [],
      body?.message || '',
      body?.imageAttachment,
    );

    const ai = createClientGenAI(key);
    const rawText = await generateClientContentWithFallback(ai, contents, systemInstruction);

    let emotion = 'normal';
    let cleanText = rawText;
    const emotionMatch = rawText.match(
      /^\[(normal|happy|laughing|shy|curious|thinking|surprised|calm|concerned)\]\s*/i,
    );
    if (emotionMatch) {
      emotion = emotionMatch[1].toLowerCase();
      cleanText = rawText.replace(emotionMatch[0], '').trim();
    }

    return new Response(
      JSON.stringify({
        reply: cleanText,
        emotion,
        success: true,
        directClientEngine: true,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    const info = classifyGeminiProviderError(err);
    return new Response(
      JSON.stringify({
        error: info.message,
        errorType: info.errorType,
        isHighDemand: info.errorType === 'quota' || info.errorType === 'high_demand',
        retryable: info.retryable,
        success: false,
      }),
      { status: info.statusCode, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Executes a direct `/api/chat/stream` SSE equivalent on the client using `@google/genai`.
 */
export async function executeDirectChatStream(body: any): Promise<Response> {
  const key = resolveClientGeminiKey(body?.userApiKey || body?.apiKey);
  if (!key) {
    return new Response(
      JSON.stringify({
        error:
          'No Gemini API key is configured. Please open Menu → Settings and enter your Gemini API key (AIza...).',
        errorType: 'missing_key',
        retryable: false,
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const character = body?.character === 'jarvis' ? 'jarvis' : 'alya';
  const userName = body?.userName || 'Friend';
  const memories = Array.isArray(body?.memories) ? body.memories : [];
  const languageMode = body?.languageMode || 'english';
  const systemInstruction = buildCompanionSystemInstruction(
    character,
    userName,
    memories,
    body?.timeContext,
    languageMode,
  );
  const contents = formatClientGeminiContents(
    body?.history || [],
    body?.message || '',
    body?.imageAttachment,
  );

  const encoder = new TextEncoder();
  const ai = createClientGenAI(key);

  const readable = new ReadableStream({
    async start(controller) {
      const models = [
        { model: 'gemini-3.8-flash', thinkingLevel: ThinkingLevel.LOW },
        { model: 'gemini-3.1-flash-lite', thinkingLevel: undefined },
        { model: 'gemini-2.5-flash', thinkingLevel: undefined },
      ];

      let succeeded = false;
      let lastErr: any = null;

      for (const { model, thinkingLevel } of models) {
        try {
          const config: any = { systemInstruction };
          if (thinkingLevel) {
            config.thinkingConfig = { thinkingLevel };
          }

          const stream = await ai.models.generateContentStream({
            model,
            contents,
            config,
          });

          let accumulated = '';
          let emotionDetected = false;
          let yieldedAny = false;

          for await (const chunk of stream) {
            const textChunk = chunk.text || '';
            if (!textChunk) continue;
            yieldedAny = true;

            if (!emotionDetected) {
              accumulated += textChunk;
              const trimmed = accumulated.trimStart();
              if (!trimmed.startsWith('[')) {
                emotionDetected = true;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ emotion: 'normal' })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: accumulated })}\n\n`));
                accumulated = '';
                continue;
              }

              const emotionMatch = trimmed.match(
                /^\[(normal|happy|laughing|shy|curious|thinking|surprised|calm|concerned)\]\s*/i,
              );
              if (emotionMatch) {
                emotionDetected = true;
                const detectedEmotion = emotionMatch[1].toLowerCase();
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ emotion: detectedEmotion })}\n\n`));
                const remaining = trimmed.slice(emotionMatch[0].length);
                if (remaining) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: remaining })}\n\n`));
                }
                accumulated = '';
              } else if (trimmed.length > 16) {
                emotionDetected = true;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ emotion: 'normal' })}\n\n`));
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: accumulated })}\n\n`));
                accumulated = '';
              }
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: textChunk })}\n\n`));
            }
          }

          if (accumulated) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: accumulated })}\n\n`));
          }

          if (yieldedAny) {
            succeeded = true;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            break;
          }
        } catch (err: any) {
          lastErr = err;
          const info = classifyGeminiProviderError(err);
          if (info.errorType === 'invalid_key') {
            break;
          }
        }
      }

      if (!succeeded) {
        const info = classifyGeminiProviderError(lastErr);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: info.message,
              errorType: info.errorType,
              retryable: info.retryable,
              done: true,
            })}\n\n`,
          ),
        );
      }

      controller.close();
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * Executes direct `/api/screen-understand` vision analysis on the client when backend is unreachable.
 */
export async function executeDirectScreenUnderstand(body: any): Promise<Response> {
  const key = resolveClientGeminiKey(body?.userApiKey || body?.apiKey);
  if (!key) {
    return new Response(
      JSON.stringify({
        analysis:
          'To analyze screen captures on Android without a backend server, please enter your Gemini API key in Menu → Settings.',
        emotion: 'concerned',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const ai = createClientGenAI(key);
    const prompt =
      body?.question ||
      'Inspect this screen image carefully and summarize what is visible clearly and concisely.';
    const contents = formatClientGeminiContents([], prompt, body?.image);
    const text = await generateClientContentWithFallback(ai, contents);
    return new Response(
      JSON.stringify({
        analysis: text,
        emotion: 'curious',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    const info = classifyGeminiProviderError(err);
    return new Response(
      JSON.stringify({
        analysis: info.message,
        emotion: 'concerned',
        error: info.message,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
