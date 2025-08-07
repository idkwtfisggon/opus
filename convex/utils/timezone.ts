/**
 * Timezone utility functions for consistent date handling
 */

/**
 * Convert UTC timestamp to user's timezone date string (YYYY-MM-DD)
 */
export function toUserTimezoneDate(utcTimestamp: number, userTimezone: string = 'UTC'): string {
  try {
    const date = new Date(utcTimestamp);
    
    // Use Intl.DateTimeFormat for proper timezone conversion
    const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA gives YYYY-MM-DD format
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    return formatter.format(date);
  } catch (error) {
    console.error('Timezone conversion error:', error);
    // Fallback to UTC
    return new Date(utcTimestamp).toISOString().split('T')[0];
  }
}

/**
 * Convert UTC timestamp to user's timezone with full date/time info
 */
export function toUserTimezone(utcTimestamp: number, userTimezone: string = 'UTC'): Date {
  try {
    // Create a new Date object representing the same moment in the user's timezone
    const utcDate = new Date(utcTimestamp);
    
    // Get the timezone offset in minutes
    const tempDate = new Date(utcDate.toLocaleString("en-US", { timeZone: userTimezone }));
    const offset = tempDate.getTime() - utcDate.getTime();
    
    return new Date(utcTimestamp + offset);
  } catch (error) {
    console.error('Timezone conversion error:', error);
    return new Date(utcTimestamp);
  }
}

/**
 * Calculate days between two dates in user's timezone
 */
export function daysBetweenInTimezone(
  startTimestamp: number, 
  endTimestamp: number, 
  userTimezone: string = 'UTC',
  inclusive: boolean = true
): number {
  const startDate = toUserTimezoneDate(startTimestamp, userTimezone);
  const endDate = toUserTimezoneDate(endTimestamp, userTimezone);
  
  const startDateObj = new Date(startDate + 'T00:00:00.000Z');
  const endDateObj = new Date(endDate + 'T00:00:00.000Z');
  
  const daysDiff = Math.floor((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
  
  return inclusive ? daysDiff + 1 : daysDiff;
}

/**
 * Get start of day timestamp in user's timezone
 */
export function getStartOfDayInTimezone(date: Date, userTimezone: string = 'UTC'): number {
  try {
    const year = date.toLocaleDateString('en', { timeZone: userTimezone, year: 'numeric' });
    const month = date.toLocaleDateString('en', { timeZone: userTimezone, month: '2-digit' });
    const day = date.toLocaleDateString('en', { timeZone: userTimezone, day: '2-digit' });
    
    const startOfDay = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
    return startOfDay.getTime();
  } catch (error) {
    console.error('Start of day conversion error:', error);
    return date.getTime();
  }
}

/**
 * Detect user's timezone from browser
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Timezone detection error:', error);
    return 'UTC';
  }
}

/**
 * Common timezone mappings for validation
 */
export const COMMON_TIMEZONES = [
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Kuala_Lumpur',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'UTC'
];

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}