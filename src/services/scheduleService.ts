/**
 * Schedule Service
 * Handles QR code scheduling logic including activation windows and recurring patterns
 */

export interface QRSchedule {
  id: string;
  qr_id: string;
  activation_date: string | null;
  activation_time: string | null;
  expiration_date: string | null;
  expiration_time: string | null;
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleCheckResult {
  isActive: boolean;
  error?: 'not_active' | 'schedule_expired';
  reason?: string;
}

/**
 * Check if a QR code schedule is currently active
 * Handles one-time schedules and recurring patterns
 */
export function checkScheduleActive(schedule: QRSchedule | null): ScheduleCheckResult {
  if (!schedule) {
    // No schedule means always active
    return { isActive: true };
  }

  const now = new Date();
  const timezone = schedule.timezone || 'UTC';

  // For recurring schedules, we check differently
  if (schedule.recurring && schedule.recurring !== 'none') {
    return checkRecurringSchedule(schedule, now, timezone);
  }

  // One-time schedule check
  return checkOneTimeSchedule(schedule, now, timezone);
}

/**
 * Check one-time schedule activation window
 */
function checkOneTimeSchedule(
  schedule: QRSchedule,
  now: Date,
  timezone: string
): ScheduleCheckResult {
  // Check activation date/time
  if (schedule.activation_date) {
    const activationDateTime = combineDateTime(
      schedule.activation_date,
      schedule.activation_time,
      timezone
    );

    if (activationDateTime && now < activationDateTime) {
      return {
        isActive: false,
        error: 'not_active',
        reason: `QR code activates at ${activationDateTime.toISOString()}`,
      };
    }
  }

  // Check expiration date/time
  if (schedule.expiration_date) {
    const expirationDateTime = combineDateTime(
      schedule.expiration_date,
      schedule.expiration_time,
      timezone
    );

    if (expirationDateTime && now > expirationDateTime) {
      return {
        isActive: false,
        error: 'schedule_expired',
        reason: `QR code expired at ${expirationDateTime.toISOString()}`,
      };
    }
  }

  return { isActive: true };
}

/**
 * Check recurring schedule (daily, weekly, monthly)
 */
function checkRecurringSchedule(
  schedule: QRSchedule,
  now: Date,
  timezone: string
): ScheduleCheckResult {
  // Convert current time to schedule's timezone for accurate comparison
  const nowInTimezone = convertToTimezone(now, timezone);

  // Get activation and expiration times (if set)
  const activationTime = schedule.activation_time;
  const expirationTime = schedule.expiration_time;

  // Check if today is within the allowed days based on recurring pattern
  const recurringResult = checkRecurringPattern(schedule.recurring!, nowInTimezone);
  if (!recurringResult.isActive) {
    return {
      isActive: false,
      error: 'not_active',
      reason: recurringResult.reason,
    };
  }

  // Check time-of-day restrictions
  if (activationTime || expirationTime) {
    const currentTime = formatTime(nowInTimezone);

    if (activationTime && currentTime < activationTime) {
      return {
        isActive: false,
        error: 'not_active',
        reason: `QR code activates daily at ${activationTime}`,
      };
    }

    if (expirationTime && currentTime > expirationTime) {
      return {
        isActive: false,
        error: 'schedule_expired',
        reason: `QR code expires daily at ${expirationTime}`,
      };
    }
  }

  return { isActive: true };
}

/**
 * Check if the current day matches the recurring pattern
 */
function checkRecurringPattern(
  recurring: 'daily' | 'weekly' | 'monthly',
  date: Date
): { isActive: boolean; reason?: string } {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const dateOfMonth = date.getDate();

  switch (recurring) {
    case 'daily':
      // Always active on any day
      return { isActive: true };

    case 'weekly':
      // Active Monday-Friday (business days)
      if (day === 0 || day === 6) {
        return {
          isActive: false,
          reason: 'QR code is only active on weekdays (Monday-Friday)',
        };
      }
      return { isActive: true };

    case 'monthly':
      // Active on 1st of each month
      if (dateOfMonth !== 1) {
        return {
          isActive: false,
          reason: 'QR code is only active on the 1st of each month',
        };
      }
      return { isActive: true };

    default:
      return { isActive: true };
  }
}

/**
 * Combine date and time strings into a Date object
 */
function combineDateTime(
  dateStr: string | null,
  timeStr: string | null,
  timezone: string
): Date | null {
  if (!dateStr) return null;

  const time = timeStr || '00:00:00';
  const dateTimeStr = `${dateStr}T${time}`;

  try {
    // Parse as local time in the specified timezone
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Convert a Date to the specified timezone
 * Note: This is a simplified version. In production, use a library like date-fns-tz
 */
function convertToTimezone(date: Date, timezone: string): Date {
  if (timezone === 'UTC') {
    return new Date(date.toISOString());
  }

  // For simplicity, we'll use the browser/Node's Intl API if available
  // This converts the display time to the target timezone
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    const second = parts.find(p => p.type === 'second')?.value;

    if (year && month && day && hour && minute && second) {
      return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    }
  } catch {
    // Fall back to original date if timezone conversion fails
  }

  return date;
}

/**
 * Format a Date as HH:mm:ss time string
 */
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Fetch schedule for a QR code from Supabase
 * This is a type definition - actual query is done in the Astro file
 */
export async function fetchQRSchedule(
  supabase: any,
  qrId: string
): Promise<QRSchedule | null> {
  const { data, error } = await supabase
    .from('qr_schedules')
    .select('*')
    .eq('qr_id', qrId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as QRSchedule;
}
