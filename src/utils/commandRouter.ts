/**
 * Local Voice & Text Command Router for Alya AI Companion
 * Executes app launches, Android intents, sensitive action confirmations,
 * and screen/search awareness routing with sub-5ms local latency.
 */

import { AndroidAppDefinition, AndroidBridgeService } from './androidBridge';
import { ExpressionType, LanguageMode } from '../types';
import { LanguageEngine } from './language';

export interface SearchSourceItem {
  title: string;
  url: string;
  snippet: string;
}

export interface PendingClarification {
  candidates: AndroidAppDefinition[];
  searchQuery?: string;
  createdAt: number;
}

export interface PendingConfirmation {
  id: string;
  actionType: 'send_message' | 'phone_call' | 'delete_data' | 'purchase_payment' | 'account_change';
  title: string;
  description: string;
  targetApp?: AndroidAppDefinition;
  targetUrl?: string;
  createdAt: number;
}

export type RoutedActionResult =
  | {
      handled: false;
    }
  | {
      handled: true;
      type:
        | 'app_launched'
        | 'app_not_found'
        | 'app_clarification_needed'
        | 'google_search_and_ground'
        | 'screen_inspect'
        | 'screen_websites_list'
        | 'screen_website_detail'
        | 'screen_page_summary'
        | 'sensitive_confirmation_required'
        | 'sensitive_action_confirmed'
        | 'sensitive_action_cancelled'
        | 'floating_avatar_toggle'
        | 'background_service_control';
      reply: string;
      emotion: ExpressionType;
      language: LanguageMode;
      launchedApp?: AndroidAppDefinition;
      searchQuery?: string;
      websiteIndex?: number; // 0-based (0 = first website, 1 = second, etc.)
      pendingClarification?: PendingClarification | null;
      pendingConfirmation?: PendingConfirmation | null;
      floatingVisible?: boolean;
      backgroundServiceCommand?: 'start' | 'pause' | 'stop';
      navigateScreen?: 'settings' | 'screen_tools' | 'phone_control';
    };

export class VoiceCommandRouter {
  /**
   * Evaluate user utterance/message locally before sending to cloud LLM.
   * Returns { handled: false } if it is a normal conversation turn.
   */
  static evaluateCommand(
    rawInput: string,
    options: {
      character: 'alya' | 'jarvis';
      userName: string;
      pendingClarification?: PendingClarification | null;
      pendingConfirmation?: PendingConfirmation | null;
      onInternalNavigate?: (screen: 'settings' | 'screen_tools') => void;
    }
  ): RoutedActionResult {
    const clean = (rawInput || '').trim();
    if (!clean) return { handled: false };

    const detection = LanguageEngine.detectLanguage(clean);
    const lang = detection.mode;
    const isHinglishOrHindi = lang === 'hinglish' || lang === 'hindi';
    const isJarvis = options.character === 'jarvis';

    // Remove wake-word prefix like "Alya,", "Hey Alya", "Jarvis,", "Suno Alya"
    const strippedWake = clean
      .replace(/^(?:hey|hi|hello|arey|suno|oye)?\s*(?:alya|jarvis|आल्या|जार्विस)[,!:.\s-]*/i, '')
      .trim();

    const lower = strippedWake.toLowerCase();

    // =========================================================================
    // 1. RESOLVE PENDING SENSITIVE ACTION CONFIRMATION (If active within 2 mins)
    // =========================================================================
    if (
      options.pendingConfirmation &&
      Date.now() - options.pendingConfirmation.createdAt < 120000
    ) {
      const isConfirm =
        /^(?:haan|ha|yes|yep|sure|ok|okay|confirm|kar do|kardo|bhej do|bhejdo|proceed|go ahead|हाँ|जी हाँ|कर दो)(?:\s+(?:confirm|kar do|please|alya|jarvis))*[.!]*$/i.test(
          lower
        );
      const isCancel =
        /^(?:nahi|na|no|nope|cancel|stop|mat karo|rehnde|rehne do|abort|नहीं|मत करो|कैंसल)(?:\s+(?:karo|please|alya|jarvis))*[.!]*$/i.test(
          lower
        );

      if (isConfirm) {
        const pending = options.pendingConfirmation;
        if (pending.targetApp) {
          AndroidBridgeService.launchApp(pending.targetApp, {
            onInternalNavigate: options.onInternalNavigate,
          });
        }
        const reply = isHinglishOrHindi
          ? `Theek hai ${options.userName}, aapke confirmation ke baad maine ${pending.title} open kar diya hai. Final step aap wahan check karke complete kar sakte ho.`
          : `Confirmed, ${options.userName}. I have opened ${pending.title} for you so you can review and complete the final step safely.`;
        return {
          handled: true,
          type: 'sensitive_action_confirmed',
          reply,
          emotion: 'normal',
          language: lang,
          pendingConfirmation: null,
        };
      }

      if (isCancel) {
        const reply = isHinglishOrHindi
          ? `Samajh gayi! Maine "${options.pendingConfirmation.title}" action cancel kar diya hai.`
          : `Got it! I have cancelled the "${options.pendingConfirmation.title}" action.`;
        return {
          handled: true,
          type: 'sensitive_action_cancelled',
          reply,
          emotion: 'calm',
          language: lang,
          pendingConfirmation: null,
        };
      }
    }

    // =========================================================================
    // 2. RESOLVE PENDING APP CLARIFICATION (If active within 90 seconds)
    // =========================================================================
    if (
      options.pendingClarification &&
      Date.now() - options.pendingClarification.createdAt < 90000
    ) {
      const { candidates, searchQuery } = options.pendingClarification;
      if (/^(?:cancel|rehne do|chhodo|none|koi nahi|stop)$/i.test(lower)) {
        return {
          handled: true,
          type: 'sensitive_action_cancelled',
          reply: isHinglishOrHindi
            ? 'Theek hai, app launch cancel kar diya!'
            : 'Okay, cancelled the app launch!',
          emotion: 'normal',
          language: lang,
          pendingClarification: null,
        };
      }

      let chosen: AndroidAppDefinition | undefined;
      if (/\b(pehla|first|1st|one|ek)\b/i.test(lower)) {
        chosen = candidates[0];
      } else if (/\b(doosra|dusra|second|2nd|two|do)\b/i.test(lower) && candidates[1]) {
        chosen = candidates[1];
      } else if (/\b(teesra|third|3rd|three|teen)\b/i.test(lower) && candidates[2]) {
        chosen = candidates[2];
      } else {
        chosen = candidates.find(
          (c) =>
            c.name.toLowerCase() === lower ||
            lower.includes(c.name.toLowerCase()) ||
            c.aliases.some((a) => lower.includes(a))
        );
      }

      if (chosen) {
        AndroidBridgeService.launchApp(chosen, {
          searchQuery,
          onInternalNavigate: options.onInternalNavigate,
        });
        const reply = isHinglishOrHindi
          ? `Badhiya! ${chosen.name} open kar rahi hoon. Main yahin hoon agar kuch aur chahiye ho!`
          : `Awesome! Opening ${chosen.name} now. I'm right here if you need anything else!`;
        return {
          handled: true,
          type: 'app_launched',
          reply,
          emotion: 'happy',
          language: lang,
          launchedApp: chosen,
          pendingClarification: null,
        };
      }
    }

    // =========================================================================
    // 3. FLOATING AVATAR & BACKGROUND SERVICE COMMANDS
    // =========================================================================
    if (
      /\b(floating\s+avatar|floating\s+alya|floating\s+widget|mini\s+alya|overlay\s+widget|minimize\s+mode)\b/i.test(
        lower
      )
    ) {
      const turnOff = /\b(off|band|close|hide|disable|hatao|stop)\b/i.test(lower);
      const visible = !turnOff;
      const reply = visible
        ? isHinglishOrHindi
          ? 'Floating Alya avatar on kar diya hai! Aap ise screen par kahin bhi drag kar sakte ho aur tap karke mujhse baat kar sakte ho.'
          : 'Floating Alya avatar is now active! You can drag it anywhere along the screen edges and tap it to talk with me.'
        : isHinglishOrHindi
        ? 'Floating Alya widget hide kar diya hai.'
        : 'Floating Alya widget is now hidden.';
      return {
        handled: true,
        type: 'floating_avatar_toggle',
        reply,
        emotion: 'happy',
        language: lang,
        floatingVisible: visible,
      };
    }

    if (/\b(background\s+service|foreground\s+service|continuous\s+mode|background\s+companion)\b/i.test(lower)) {
      let cmd: 'start' | 'pause' | 'stop' = 'start';
      if (/\b(pause|roko|hold)\b/i.test(lower)) cmd = 'pause';
      else if (/\b(stop|band|off|disable|close)\b/i.test(lower)) cmd = 'stop';

      const reply =
        cmd === 'start'
          ? isHinglishOrHindi
            ? 'Background companion service start ho gayi hai! App minimize hone par bhi main aapki madad ke liye ready rahungi.'
            : 'Background companion service is now active! I will stay ready to help you even when the app is minimized.'
          : cmd === 'pause'
          ? isHinglishOrHindi
            ? 'Background companion service pause kar di gayi hai. Jab chahein resume kar lena!'
            : 'Background companion service is paused. Resume anytime you need me!'
          : isHinglishOrHindi
          ? 'Background companion service stop kar di gayi hai.'
          : 'Background companion service has been stopped.';

      return {
        handled: true,
        type: 'background_service_control',
        reply,
        emotion: 'normal',
        language: lang,
        backgroundServiceCommand: cmd,
      };
    }

    // =========================================================================
    // 4. SENSITIVE / CONSEQUENTIAL PHONE ACTIONS (Confirmation Gate)
    // =========================================================================
    const sensitiveSendMatch =
      lower.match(
        /\b(?:send\s+(?:a\s+)?(?:whatsapp|message|sms|text|mail|email)|(?:whatsapp|message|sms|email|mail)\s+(?:bhejo|bhej\s+do|send\s+karo|kar\s+do))\b/i
      ) ||
      lower.match(/\b(?:delete|erase|remove|format)\s+(?:all\s+)?(?:files?|photos?|messages?|account|data)\b/i) ||
      lower.match(/\b(?:buy|purchase|order|pay|payment\s+karo|paise\s+bhejo|transfer\s+money)\b/i);

    if (sensitiveSendMatch) {
      let actionType: PendingConfirmation['actionType'] = 'send_message';
      let title = 'Send Message / External Communication';
      let targetApp = AndroidBridgeService.matchApp('whatsapp').app;

      if (/\b(delete|erase|remove|format)\b/i.test(lower)) {
        actionType = 'delete_data';
        title = 'Delete Files / Device Data';
        targetApp = undefined;
      } else if (/\b(buy|purchase|order|pay|payment|paise|transfer)\b/i.test(lower)) {
        actionType = 'purchase_payment';
        title = 'Financial / Purchase Action';
        targetApp = undefined;
      } else if (/\b(email|mail|gmail)\b/i.test(lower)) {
        title = 'Compose Email in Gmail';
        targetApp = AndroidBridgeService.matchApp('gmail').app;
      }

      const pendingConfirmation: PendingConfirmation = {
        id: `conf_${Date.now()}`,
        actionType,
        title,
        description: strippedWake,
        targetApp,
        createdAt: Date.now(),
      };

      const reply = isHinglishOrHindi
        ? `Ruko ${options.userName}! "${title}" ek sensitive action hai. Aapki safety ke liye main bina explicit permission ke koi message send, payment ya file delete nahi karti. Kya aap confirm karte hain? "Haan confirm" ya "Cancel" bolein.`
        : `Hold on, ${options.userName}! "${title}" is a sensitive action. For your security, I never send messages, make purchases, or delete files without your explicit confirmation. Say "Confirm" to proceed or "Cancel" to stop.`;

      return {
        handled: true,
        type: 'sensitive_confirmation_required',
        reply,
        emotion: 'concerned',
        language: lang,
        pendingConfirmation,
      };
    }

    // =========================================================================
    // 5. SCREEN AWARENESS & VISIBLE WEBSITES / SEARCH QUERIES
    // =========================================================================
    // 5a. Specific N-th website question: "Pehli website kis baare mein hai?", "What is the first website about?"
    const nthWebsiteMatch = lower.match(
      /\b(pehli|pahli|first|1st|doosri|dusri|second|2nd|teesri|tisri|third|3rd)\s+(?:website|site|link|result|page)\b/i
    );
    if (nthWebsiteMatch) {
      const token = nthWebsiteMatch[1].toLowerCase();
      let idx = 0;
      if (['doosri', 'dusri', 'second', '2nd'].includes(token)) idx = 1;
      else if (['teesri', 'tisri', 'third', '3rd'].includes(token)) idx = 2;

      return {
        handled: true,
        type: 'screen_website_detail',
        websiteIndex: idx,
        reply: '',
        emotion: 'curious',
        language: lang,
      };
    }

    // 5b. List visible websites: "Screen par kaun-kaun si websites dikh rahi hain?"
    if (
      /\b(kaun[\s-]*kaun\s+si|kaunsi|konsi|which|what)\s+(?:websites?|sites?|links?|search\s+results?)\b/i.test(
        lower
      ) ||
      /\b(?:websites?|sites?|search\s+results?)\s+(?:dikh\s+rahi|visible|on\s+(?:the\s+)?screen)\b/i.test(lower)
    ) {
      return {
        handled: true,
        type: 'screen_websites_list',
        reply: '',
        emotion: 'curious',
        language: lang,
      };
    }

    // 5c. Page / Screen Summary: "Is page ka summary batao", "Summarize this page"
    if (
      /\b(?:is\s+(?:page|screen|website|article)\s+ka\s+summary|page\s+summary|summarize\s+(?:this\s+)?(?:page|screen|website|article)|is\s+page\s+ko\s+explain\s+karo)\b/i.test(
        lower
      )
    ) {
      return {
        handled: true,
        type: 'screen_page_summary',
        reply: '',
        emotion: 'thinking',
        language: lang,
      };
    }

    // 5d. General Screen Awareness: "Alya, meri screen par kya dikh raha hai?", "What is on my screen?"
    if (
      /\b(?:meri\s+screen\s+par\s+kya|screen\s+par\s+kya\s+(?:dikh|hai|chal)|screen\s+dekho|screen\s+dekh\s+kar|what(?:'s|\s+is)\s+on\s+my\s+screen|inspect\s+(?:my\s+)?screen|read\s+(?:my\s+)?screen| मेरी\s+स्क्रीन\s+पर\s+क्या)\b/i.test(
        lower
      )
    ) {
      return {
        handled: true,
        type: 'screen_inspect',
        reply: '',
        emotion: 'curious',
        language: lang,
      };
    }

    // =========================================================================
    // 6. COMBINED APP + SEARCH COMMANDS
    //    e.g., "Google kholo aur Minecraft shaders search karo"
    //    e.g., "YouTube kholo aur anime lofi search karo"
    // =========================================================================
    const combinedSearchPatterns = [
      // "Google kholo aur Minecraft shaders search karo"
      /^(?:google|chrome)\s+(?:kholo|open\s+karo|chalu\s+karo|open)\s+(?:aur|and|then|phir)\s+(.+?)\s+(?:search\s+karo|dhundo|search|khojo)[.!]*$/i,
      // "Google par Minecraft shaders search karo"
      /^(?:google|chrome)\s+(?:par|pe|mein|me|on)\s+(.+?)\s+(?:search\s+karo|dhundo|search|khojo)[.!]*$/i,
      // "Search Minecraft shaders on Google"
      /^(?:search|google\s+search)\s+(?:for\s+)?(.+?)\s+(?:on\s+google|in\s+google|on\s+chrome|par\s+search\s+karo)[.!]*$/i,
      // "Minecraft shaders google par search karo"
      /^(.+?)\s+(?:google|chrome)\s+(?:par|pe|mein)\s+(?:search\s+karo|dhundo|khojo)[.!]*$/i,
    ];

    for (const pattern of combinedSearchPatterns) {
      const m = strippedWake.match(pattern);
      if (m && m[1]) {
        const searchQuery = m[1].replace(/^['"]|['"]$/g, '').trim();
        const googleApp = AndroidBridgeService.matchApp('google').app!;
        AndroidBridgeService.launchApp(googleApp, { searchQuery });
        return {
          handled: true,
          type: 'google_search_and_ground',
          searchQuery,
          launchedApp: googleApp,
          reply: '',
          emotion: 'curious',
          language: lang,
        };
      }
    }

    const youtubeSearchPatterns = [
      /^(?:youtube|yt)\s+(?:kholo|open\s+karo|open)\s+(?:aur|and|then|phir)\s+(.+?)\s+(?:search\s+karo|chalao|play\s+karo|lagao|search|play)[.!]*$/i,
      /^(?:youtube|yt)\s+(?:par|pe|mein|on)\s+(.+?)\s+(?:search\s+karo|chalao|play\s+karo|lagao|search|play)[.!]*$/i,
      /^(?:play|search)\s+(.+?)\s+on\s+(?:youtube|yt)[.!]*$/i,
    ];

    for (const pattern of youtubeSearchPatterns) {
      const m = strippedWake.match(pattern);
      if (m && m[1]) {
        const searchQuery = m[1].replace(/^['"]|['"]$/g, '').trim();
        const ytApp = AndroidBridgeService.matchApp('youtube').app!;
        AndroidBridgeService.launchApp(ytApp, { searchQuery });
        const reply = isHinglishOrHindi
          ? `YouTube open karke "${searchQuery}" search kar diya hai! Batao kaunsa video dekhna pasand karoge?`
          : `I opened YouTube and searched for "${searchQuery}"! Let me know which video you'd like to check out!`;
        return {
          handled: true,
          type: 'app_launched',
          launchedApp: ytApp,
          searchQuery,
          reply,
          emotion: 'happy',
          language: lang,
        };
      }
    }

    // =========================================================================
    // 7. DIRECT ANDROID APP LAUNCH COMMANDS
    //    Examples:
    //    - "Alya, YouTube kholo."
    //    - "Google kholo."
    //    - "Chrome open karo."
    //    - "Settings kholo."
    //    - "Gallery open karo."
    //    - "Phone mein installed [app name] kholo."
    // =========================================================================
    const appOpenPatterns = [
      // "Phone mein installed [app name] kholo / open karo"
      /^(?:mere\s+)?(?:phone|mobile|device)\s+(?:mein|me|par)\s+(?:installed\s+)?(.+?)\s+(?:app\s+)?(?:kholo|khol\s+do|open\s+karo|open\s+kar\s+do|chalu\s+karo|launch\s+karo|start\s+karo)[.!]*$/i,
      // "[app name] kholo / open karo / launch karo / chalu karo"
      /^(.+?)\s+(?:app\s+)?(?:kholo|khol\s+do|kholiye|open\s+karo|open\s+kar\s+do|launch\s+karo|chalu\s+karo|खोलो|ओपन\s+करो)[.!]*$/i,
      // "Open / Launch [app name]"
      /^(?:please\s+)?(?:open|launch|start)\s+(?:the\s+)?(?:installed\s+)?(.+?)(?:\s+app|\s+application)?(?:\s+on\s+my\s+phone)?[.!]*$/i,
      // "Kholo [app name]"
      /^(?:kholo|khol\s+do)\s+(.+?)(?:\s+app)?[.!]*$/i,
    ];

    for (const pattern of appOpenPatterns) {
      const m = strippedWake.match(pattern);
      if (m && m[1]) {
        const candidateText = m[1].trim();
        // Guard against conversational phrases like "apna dil kholo" or "ek naya topic start karo"
        if (
          candidateText.split(/\s+/).length <= 5 &&
          !/\b(dil|mann|dimag|eyes|ankhein|darwaza|door|window|khidki|account|secret|topic|baat|conversation|story|joke)\b/i.test(
            candidateText
          )
        ) {
          const matchResult = AndroidBridgeService.matchApp(candidateText);

          if (matchResult.status === 'exact' && matchResult.app) {
            AndroidBridgeService.launchApp(matchResult.app, {
              onInternalNavigate: options.onInternalNavigate,
            });
            const appName = matchResult.app.name;
            const reply = isHinglishOrHindi
              ? isJarvis
                ? `${appName} launch kar diya gaya hai, ${options.userName}. Main background mein active hoon.`
                : `Chalo, ${appName} open kar diya hai! Main yahin hoon, kuch bhi puchna ho toh bas bolna!`
              : isJarvis
              ? `Launching ${appName}, ${options.userName}. Standing by for your next command.`
              : `Opening ${appName} for you right now! I'm still right here with you if you need anything!`;

            return {
              handled: true,
              type: 'app_launched',
              launchedApp: matchResult.app,
              reply,
              emotion: 'happy',
              language: lang,
            };
          }

          if (matchResult.status === 'ambiguous' && matchResult.candidates && matchResult.candidates.length > 1) {
            const names = matchResult.candidates.map((c) => c.name).join(' ya ');
            const namesEn = matchResult.candidates.map((c) => c.name).join(' or ');
            const pendingClarification: PendingClarification = {
              candidates: matchResult.candidates,
              createdAt: Date.now(),
            };
            const reply = isHinglishOrHindi
              ? `Aapke phone mein "${matchResult.rawQuery}" se milte-julte multiple apps hain: ${names}. Batao kaunsa open karun?`
              : `I found multiple apps matching "${matchResult.rawQuery}": ${namesEn}. Which one would you like me to open?`;

            return {
              handled: true,
              type: 'app_clarification_needed',
              pendingClarification,
              reply,
              emotion: 'curious',
              language: lang,
            };
          }

          if (matchResult.status === 'not_found') {
            const cleanQueryName = matchResult.rawQuery
              .replace(/\b(installed|phone|mein|me|app|application)\b/gi, '')
              .trim();
            const reply = isHinglishOrHindi
              ? `Arey ${options.userName}, mujhe aapke phone mein "${cleanQueryName}" naam ka installed app nahi mila. Agar ye kisi alag naam se hai toh Phone Control mein add kar sakte ho, ya bolo toh main Play Store par search kar doon?`
              : `Hmm, I couldn't find an installed app named "${cleanQueryName}" on your phone, ${options.userName}. You can register custom package names in Phone Control, or let me know if you want me to search for it on the Play Store!`;

            return {
              handled: true,
              type: 'app_not_found',
              reply,
              emotion: 'concerned',
              language: lang,
            };
          }
        }
      }
    }

    return { handled: false };
  }
}
