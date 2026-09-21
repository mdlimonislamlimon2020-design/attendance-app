import type { ClassSession } from "../types";

export const ALL_MONTHS = "all" as const;
export type MonthFilter = string | typeof ALL_MONTHS;

export function monthKey(dateStr: string): string {
  // dateStr = "yyyy-mm-dd" -> "yyyy-mm"
  return dateStr.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("bn-BD", { year: "numeric", month: "long" });
}

// Ascending chronological order (string sort works because yyyy-mm is zero-padded)
export function getAvailableMonths(classes: ClassSession[]): string[] {
  const set = new Set(classes.map((c) => monthKey(c.date)));
  return Array.from(set).sort();
}

export function filterClassesByMonth(
  classes: ClassSession[],
  month: MonthFilter
): ClassSession[] {
  if (month === ALL_MONTHS) return classes;
  return classes.filter((c) => monthKey(c.date) === month);
}
