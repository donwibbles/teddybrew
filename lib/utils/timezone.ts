/**
 * Centralized timezone utilities for event time handling.
 *
 * Events store times as UTC with an IANA timezone field.
 * These helpers handle validation, conversion, and display.
 */

/** Validate that a string is a recognized IANA timezone identifier. */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a datetime-local input value (e.g. "2025-06-15T14:30") interpreted
 * in the given IANA timezone to a UTC ISO string.
 *
 * The approach: treat the input as if it were UTC, then compute the real
 * offset at that date in the target timezone by round-tripping through
 * toLocaleString. This correctly handles DST transitions because the offset
 * is resolved for the *target* date, not "now".
 */
export function localDateTimeToUTC(
  localDateTime: string,
  timezone: string
): string {
  const [datePart, timePart] = localDateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  // Pretend the local values are UTC so we have a stable epoch reference
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // Render that instant in the target timezone to discover the offset
  const inTz = new Date(
    utcGuess.toLocaleString("en-US", { timeZone: timezone })
  );
  const offsetMs = utcGuess.getTime() - inTz.getTime();

  return new Date(utcGuess.getTime() + offsetMs).toISOString();
}

/**
 * Format a UTC Date in a specific IANA timezone using Intl.DateTimeFormat.
 * Useful for server components that need timezone-aware display.
 */
export function formatEventTime(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    ...options,
  }).format(new Date(date));
}

/**
 * Get the current "now" as a datetime-local string in the given IANA timezone,
 * suitable for use as the `min` attribute on `<input type="datetime-local">`.
 */
export function getMinDateTimeForTimezone(timezone: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value || "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Common IANA timezones for the selector dropdown. */
export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Toronto", label: "Toronto (ET)" },
  { value: "America/Vancouver", label: "Vancouver (PT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Europe/Berlin", label: "Berlin (CET)" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Asia/Seoul", label: "Seoul (KST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST)" },
  { value: "America/Sao_Paulo", label: "Sao Paulo (BRT)" },
  { value: "America/Mexico_City", label: "Mexico City (CST)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Africa/Cairo", label: "Cairo (EET)" },
  { value: "UTC", label: "UTC" },
];
