/**
 * TopVeda Canonical Timezone Utilities
 * Standardizes all date/time parsing and formatting to Asia/Kolkata (India Standard Time - UTC+05:30)
 * Architecture Rules:
 * 1. Database and APIs store and transmit canonical UTC ISO-8601 timestamps.
 * 2. User input in scheduling forms (e.g. 9:00 PM) is explicitly interpreted as Asia/Kolkata (IST).
 * 3. All student, teacher, admin, super-admin, and notification displays format timestamps in Asia/Kolkata (IST).
 */

export const APP_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MINUTES = 330; // +05:30 = 330 minutes
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

export type TimezoneInput = string | number | Date | null | undefined;

function toDate(input: TimezoneInput): Date | null {
  if (input === null || input === undefined) return null;
  const d = typeof input === "number" ? new Date(input) : (typeof input === "string" ? new Date(input) : input);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Parses user date and time inputs entered in the Asia/Kolkata (IST) timezone
 * and converts them to a canonical UTC ISO-8601 string.
 *
 * @param dateStr Date in 'YYYY-MM-DD' format
 * @param timeStr Time in 'HH:mm' or 'HH:mm:ss' 24-hour format (e.g. '21:00')
 * @returns Canonical UTC ISO string (e.g. '2026-09-26T15:30:00.000Z' for 21:00 IST)
 */
export function parseISTInputToUTC(dateStr: string, timeStr?: string): string {
  if (!dateStr) {
    throw new Error("Date string is required to parse IST input.");
  }

  const cleanDate = dateStr.trim();
  let cleanTime = (timeStr || "00:00").trim();
  if (cleanTime.length === 5) {
    cleanTime = `${cleanTime}:00`;
  }

  // Construct ISO string with explicit Asia/Kolkata offset (+05:30)
  // Standard JS Date parsing with explicit offset is guaranteed UTC-normalized across all environments
  const istString = `${cleanDate}T${cleanTime}+05:30`;
  const parsedDate = new Date(istString);

  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date/time input: "${dateStr}" "${timeStr}".`);
  }

  return parsedDate.toISOString();
}

/**
 * Format a canonical UTC timestamp or Date object into an Asia/Kolkata (IST) string.
 */
export function formatUTCToIST(
  utcIso: TimezoneInput,
  options?: Intl.DateTimeFormatOptions,
  locale = "en-US"
): string {
  const d = toDate(utcIso);
  if (!d) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: APP_TIMEZONE,
    ...options,
  };

  return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
}

/**
 * Formats a live class date in IST (e.g. 'Sep 26, Sat' or 'Sep 26').
 */
export function formatLiveDateIST(
  utcIso: TimezoneInput,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    weekday: "short",
  };
  return formatUTCToIST(utcIso, options ? { ...options } : defaultOptions);
}

/**
 * Formats a live class time in IST (e.g. '9:00 PM').
 */
export function formatLiveTimeIST(
  utcIso: TimezoneInput,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatUTCToIST(utcIso, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

/**
 * Creates canonical time display string for live classes and hero banners.
 * Example: 'Sep 26 • 9:00 PM' or 'Today • 9:00 PM' or 'Sep 26 • 9:00 PM – 10:00 PM'
 */
export function formatLiveTimeDisplay(
  startUtc: TimezoneInput,
  endUtc?: TimezoneInput
): string {
  const startD = toDate(startUtc);
  if (!startD) return "Live Today";

  const datePart = formatUTCToIST(startD, {
    month: "short",
    day: "numeric",
  });

  const startTimePart = formatLiveTimeIST(startD);

  if (endUtc) {
    const endD = toDate(endUtc);
    if (endD) {
      const endTimePart = formatLiveTimeIST(endD);
      return `${datePart} • ${startTimePart} – ${endTimePart}`;
    }
  }

  return `${datePart} • ${startTimePart}`;
}

/**
 * Computes preparation / early-access open time (T-10 minutes) and formats in IST.
 * Example: For 9:00 PM IST start, returns '8:50 PM'.
 */
export function getTMinus10TimeIST(
  startUtc: TimezoneInput,
  prepWindowMinutes = 10
): string {
  const startD = toDate(startUtc);
  if (!startD) return "";

  const prepTimeMs = startD.getTime() - prepWindowMinutes * 60 * 1000;
  return formatLiveTimeIST(new Date(prepTimeMs));
}

/**
 * Converts a UTC timestamp into 'YYYY-MM-DD' in Asia/Kolkata timezone for HTML date input values.
 */
export function getISTDateInput(utcIso: TimezoneInput): string {
  const d = toDate(utcIso);
  if (!d) return "";

  // en-CA locale formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Converts a UTC timestamp into 'HH:mm' in Asia/Kolkata timezone for HTML time input values.
 */
export function getISTTimeInput(utcIso: TimezoneInput): string {
  const d = toDate(utcIso);
  if (!d) return "";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/**
 * Relative date formatter in IST (e.g. 'Today • 9:00 PM', 'Tomorrow • 9:00 PM', or 'Sep 26 • 9:00 PM').
 */
export function formatRelativeIST(utcIso: TimezoneInput): string {
  const d = toDate(utcIso);
  if (!d) return "";

  const now = new Date();
  const targetDateIST = getISTDateInput(d);
  const todayIST = getISTDateInput(now);

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowIST = getISTDateInput(tomorrow);

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayIST = getISTDateInput(yesterday);

  const timePart = formatLiveTimeIST(d);

  if (targetDateIST === todayIST) {
    return `Today • ${timePart}`;
  }
  if (targetDateIST === tomorrowIST) {
    return `Tomorrow • ${timePart}`;
  }
  if (targetDateIST === yesterdayIST) {
    return `Yesterday • ${timePart}`;
  }

  const datePart = formatUTCToIST(d, { month: "short", day: "numeric" });
  return `${datePart} • ${timePart}`;
}

/**
 * Checks if current time is within the early access window (e.g. T-10 minutes to end).
 */
export function isWithinEarlyAccessWindow(
  startUtc: TimezoneInput,
  earlyMinutes = 10
): boolean {
  const startD = toDate(startUtc);
  if (!startD) return false;

  const nowMs = Date.now();
  const earlyAccessMs = startD.getTime() - earlyMinutes * 60 * 1000;
  return nowMs >= earlyAccessMs;
}
