import type { RecordEntry } from './records';
export type Month = { year: number; month: number }; // month: 0–11
export function shiftMonth(value: Month, offset: number): Month {
 const date = new Date(value.year, value.month + offset, 1, 12);
 return { year: date.getFullYear(), month: date.getMonth() };
}
export function monthDays({ year, month }: Month): (string | null)[] {
 const first = new Date(year, month, 1, 12).getDay();
 const count = new Date(year, month + 1, 0, 12).getDate();
 const cells: (string | null)[] = Array(first).fill(null);
 for (let day = 1; day <= count; day++) {
  cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
 }
 while (cells.length % 7) cells.push(null);
 return cells;
}
// Keep the date captured at creation, including when the device timezone changes.
export function groupRecords(records: RecordEntry[]) {
 const grouped = new Map<string, RecordEntry[]>();
 for (const record of records) {
  const entries = grouped.get(record.local_date) ?? [];
  entries.push(record);
  grouped.set(record.local_date, entries);
 }
 for (const entries of grouped.values()) entries.sort((a, b) => b.created_at - a.created_at || b.id - a.id);
 return grouped;
}
