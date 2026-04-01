import type { RecurringTask } from "@/lib/types/domain";

/** Format a date as "YYYY-MM-DD" */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse "YYYY-MM-DD" into a local Date */
function parseDate(s: string): Date {
  return new Date(s + "T00:00:00");
}

/** Get the number of days in a month (0-indexed month) */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Find the Nth occurrence of a weekday in a given month.
 * week: 1-4 for 1st-4th, -1 for last.
 * dayOfWeek: 0=Sunday .. 6=Saturday.
 * Returns the day-of-month number, or null if it doesn't exist.
 */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  week: number,
  dayOfWeek: number
): number | null {
  if (week === -1) {
    // Last occurrence: start from the end of the month
    const lastDay = daysInMonth(year, month);
    for (let d = lastDay; d >= 1; d--) {
      if (new Date(year, month, d).getDay() === dayOfWeek) return d;
    }
    return null;
  }

  // Nth occurrence (1-4)
  let count = 0;
  const lastDay = daysInMonth(year, month);
  for (let d = 1; d <= lastDay; d++) {
    if (new Date(year, month, d).getDay() === dayOfWeek) {
      count++;
      if (count === week) return d;
    }
  }
  return null;
}

/**
 * Returns all occurrence dates for a recurring task within a given month.
 * month is 0-indexed (0=January).
 */
export function getOccurrencesForMonth(
  task: RecurringTask,
  year: number,
  month: number
): string[] {
  const startDate = parseDate(task.startDate);
  const endDate = task.endDate ? parseDate(task.endDate) : null;

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month, daysInMonth(year, month));

  // If entire month is before start date or after end date, no occurrences
  if (lastOfMonth < startDate) return [];
  if (endDate && firstOfMonth > endDate) return [];

  const results: string[] = [];

  // Clamp range to [startDate, endDate] intersected with [firstOfMonth, lastOfMonth]
  const rangeStart =
    firstOfMonth > startDate ? firstOfMonth : startDate;
  const rangeEnd = endDate && endDate < lastOfMonth ? endDate : lastOfMonth;

  switch (task.frequencyType) {
    case "daily": {
      const cursor = new Date(rangeStart);
      while (cursor <= rangeEnd) {
        results.push(toDateStr(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      break;
    }

    case "weekly":
    case "biweekly": {
      const interval = task.frequencyType === "biweekly" ? 14 : 7;
      // Find first occurrence on or after rangeStart
      const diffMs = rangeStart.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffMs / 86400000);
      const remainder = ((diffDays % interval) + interval) % interval;
      const firstOccurrence = new Date(rangeStart);
      if (remainder !== 0) {
        firstOccurrence.setDate(firstOccurrence.getDate() + (interval - remainder));
      }

      const cursor = new Date(firstOccurrence);
      while (cursor <= rangeEnd) {
        results.push(toDateStr(cursor));
        cursor.setDate(cursor.getDate() + interval);
      }
      break;
    }

    case "monthly": {
      const config = task.frequencyConfig as { dayOfMonth: number } | null;
      const dayOfMonth = config?.dayOfMonth ?? startDate.getDate();
      const maxDay = daysInMonth(year, month);
      if (dayOfMonth > maxDay) break; // skip months without this day
      const candidate = new Date(year, month, dayOfMonth);
      if (candidate >= rangeStart && candidate <= rangeEnd) {
        results.push(toDateStr(candidate));
      }
      break;
    }

    case "monthly-pattern": {
      const config = task.frequencyConfig as {
        week: number;
        dayOfWeek: number;
      } | null;
      if (!config) break;
      const day = nthWeekdayOfMonth(year, month, config.week, config.dayOfWeek);
      if (day === null) break;
      const candidate = new Date(year, month, day);
      if (candidate >= rangeStart && candidate <= rangeEnd) {
        results.push(toDateStr(candidate));
      }
      break;
    }
  }

  return results;
}

/**
 * Returns the status of a single occurrence date.
 */
export function getOccurrenceStatus(
  dateStr: string,
  completionSet: Set<string>
): "completed" | "overdue" | "pending" | "future" {
  if (completionSet.has(dateStr)) return "completed";
  const today = toDateStr(new Date());
  if (dateStr < today) return "overdue";
  if (dateStr === today) return "pending";
  return "future";
}

export interface CalendarDay {
  date: string; // "YYYY-MM-DD"
  isCurrentMonth: boolean;
}

/**
 * Builds a 6-row calendar grid (42 cells) for a given month.
 * Includes leading days from previous month and trailing days from next month.
 */
export function getCalendarDays(year: number, month: number): CalendarDay[] {
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const totalDays = daysInMonth(year, month);

  const days: CalendarDay[] = [];

  // Previous month trailing days
  const prevMonthDays = daysInMonth(
    month === 0 ? year - 1 : year,
    month === 0 ? 11 : month - 1
  );
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    days.push({
      date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    days.push({
      date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: true,
    });
  }

  // Next month leading days (fill to 42 cells)
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    days.push({
      date: `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      isCurrentMonth: false,
    });
  }

  return days;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ORDINALS = ["", "1st", "2nd", "3rd", "4th"];

/**
 * Returns a human-readable description of a recurring task's frequency.
 */
export function describeFrequency(task: RecurringTask): string {
  switch (task.frequencyType) {
    case "daily":
      return "Every day";
    case "weekly": {
      const config = task.frequencyConfig as { dayOfWeek: number } | null;
      const day = config?.dayOfWeek ?? parseDate(task.startDate).getDay();
      return `Weekly on ${DAY_NAMES[day]}`;
    }
    case "biweekly": {
      const config = task.frequencyConfig as { dayOfWeek: number } | null;
      const day = config?.dayOfWeek ?? parseDate(task.startDate).getDay();
      return `Every 2 weeks on ${DAY_NAMES[day]}`;
    }
    case "monthly": {
      const config = task.frequencyConfig as { dayOfMonth: number } | null;
      const day = config?.dayOfMonth ?? parseDate(task.startDate).getDate();
      return `Monthly on day ${day}`;
    }
    case "monthly-pattern": {
      const config = task.frequencyConfig as { week: number; dayOfWeek: number } | null;
      if (!config) return "Monthly";
      const weekLabel = config.week === -1 ? "Last" : ORDINALS[config.week] ?? `${config.week}th`;
      return `${weekLabel} ${DAY_NAMES[config.dayOfWeek]} of month`;
    }
    default:
      return "Recurring";
  }
}
