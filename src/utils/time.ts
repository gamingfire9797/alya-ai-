import { TimeContext } from '../types';
import { apiFetch } from './apiConfig';

let serverTimeOffsetMs = 0; // offset between local client clock and server if calibrated

/**
 * Centralized Time Engine
 * Dynamically resolves browser/device system date, time, timezone, and DST.
 * Never hardcodes any year, month, day, or timezone.
 */
export class TimeEngine {
  /**
   * Get the user's actual system timezone using standard browser Intl API.
   * Resolves e.g. "Asia/Kolkata" for India, "America/New_York" for US East, etc.
   */
  static getTimezone(): string {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && typeof tz === 'string' && tz.trim().length > 0) {
        return tz;
      }
    } catch (_) {}
    return 'UTC';
  }

  /**
   * Get the effective Date object, adjusted for any calibrated server offset.
   */
  static getNow(): Date {
    const now = Date.now() + serverTimeOffsetMs;
    return new Date(now);
  }

  /**
   * Calculate UTC Offset string in format "+05:30", "-07:00", etc.
   */
  static getUtcOffsetString(date = this.getNow()): string {
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Detect if Daylight Saving Time (DST) is active for the current timezone.
   */
  static isDaylightSavingTime(date = this.getNow()): boolean {
    try {
      const jan = new Date(date.getFullYear(), 0, 1);
      const jul = new Date(date.getFullYear(), 6, 1);
      const standardOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
      return date.getTimezoneOffset() < standardOffset;
    } catch (_) {
      return false;
    }
  }

  /**
   * Retrieve short timezone code/name (e.g. IST, EDT, PST, UTC).
   */
  static getTimezoneShort(date = this.getNow(), timeZone = this.getTimezone()): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        timeZoneName: 'short',
      });
      const parts = formatter.formatToParts(date);
      const tzPart = parts.find((p) => p.type === 'timeZoneName');
      if (tzPart && tzPart.value) {
        return tzPart.value;
      }
    } catch (_) {}
    return this.getUtcOffsetString(date);
  }

  /**
   * Determine natural greeting part of day.
   */
  static getGreetingTime(hours: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hours >= 5 && hours < 12) return 'morning';
    if (hours >= 12 && hours < 17) return 'afternoon';
    if (hours >= 17 && hours < 22) return 'evening';
    return 'night';
  }

  /**
   * Get complete structured TimeContext.
   */
  static getFullContext(targetDate = this.getNow()): TimeContext {
    const tz = this.getTimezone();
    const tzShort = this.getTimezoneShort(targetDate, tz);
    const utcOffset = this.getUtcOffsetString(targetDate);
    const isDST = this.isDaylightSavingTime(targetDate);

    const year = targetDate.getFullYear();
    const monthNumber = targetDate.getMonth() + 1;

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const month = monthNames[targetDate.getMonth()] || 'Unknown';

    const dayNames = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ];
    const dayOfWeek = dayNames[targetDate.getDay()] || 'Unknown';

    const date = targetDate.getDate();

    // 12-hour format e.g. "07:15 AM"
    const time12 = targetDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // 24-hour format e.g. "19:15"
    const hours24 = String(targetDate.getHours()).padStart(2, '0');
    const minutes = String(targetDate.getMinutes()).padStart(2, '0');
    const time24 = `${hours24}:${minutes}`;

    const greetingTime = this.getGreetingTime(targetDate.getHours());

    return {
      year,
      month,
      monthNumber,
      date,
      dayOfWeek,
      time12,
      time24,
      timezone: tz,
      timezoneShort: tzShort,
      utcOffset,
      isDST,
      greetingTime,
      isoString: targetDate.toISOString(),
    };
  }

  /**
   * Format message timestamp for chat UI (e.g. "7:14 AM" or "10:30 PM")
   */
  static formatChatTimestamp(date = this.getNow()): string {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Format header / status bar clock (e.g. "07:14" or "14:30")
   */
  static formatHeaderClock(date = this.getNow()): string {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Format readable human date (e.g. "Thursday, Oct 8, 2026")
   */
  static formatHumanDate(date = this.getNow()): string {
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Generate live context block to inject into AI conversation.
   * Sent with every message to ensure Gemini ALWAYS knows the exact dynamic real time.
   */
  static getAIPromptContext(date = this.getNow()): string {
    const ctx = this.getFullContext(date);
    return [
      `[LIVE REAL-TIME CONTEXT]`,
      `Current Date: ${ctx.dayOfWeek}, ${ctx.month} ${ctx.date}, ${ctx.year}`,
      `Current Year: ${ctx.year}`,
      `Current Month: ${ctx.month} (${ctx.monthNumber})`,
      `Current Day: ${ctx.dayOfWeek}`,
      `Current Time: ${ctx.time12} (${ctx.time24} in 24h format)`,
      `User Timezone: ${ctx.timezone} (${ctx.timezoneShort}, UTC offset ${ctx.utcOffset})`,
      `Daylight Saving: ${ctx.isDST ? 'Active' : 'Standard'}`,
      `Time of Day: ${ctx.greetingTime}`,
      `Note: Always use this dynamic live context whenever questions ask about the year, current date, day, month, time, or schedule. Never use 2024 or outdated years.`,
    ].join('\n');
  }

  /**
   * Validate or calibrate with server time API.
   * Fallback service to prevent user clock desynchronization.
   */
  static async calibrateWithServer(): Promise<void> {
    try {
      const clientStart = Date.now();
      const res = await apiFetch('/api/time');
      if (!res.ok) return;
      const data = await res.json();
      const clientEnd = Date.now();
      const roundTrip = clientEnd - clientStart;
      if (typeof data.timestamp === 'number') {
        const estimatedServerTime = data.timestamp + Math.round(roundTrip / 2);
        const difference = estimatedServerTime - clientEnd;
        // If client clock differs by more than 2 minutes from server, calibrate
        if (Math.abs(difference) > 120000) {
          serverTimeOffsetMs = difference;
        }
      }
    } catch (_) {
      // Gracefully continue using browser system clock
    }
  }
}
