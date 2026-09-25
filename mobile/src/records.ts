import type { SQLiteDatabase } from 'expo-sqlite';
export type RecordEntry = { id: number; text: string; created_at: number; local_date: string; local_time: string };
export const schema = `CREATE TABLE IF NOT EXISTS records (
 id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL CHECK(length(trim(text)) > 0),
 created_at INTEGER NOT NULL, local_date TEXT NOT NULL, local_time TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS records_newest ON records(created_at DESC, id DESC);
 PRAGMA user_version = 1;`;
export const insertSQL = 'INSERT INTO records (text, created_at, local_date, local_time) VALUES (?, ?, ?, ?)';
export const listSQL = 'SELECT * FROM records ORDER BY created_at DESC, id DESC';
export const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function dateLabel(key: string, now = new Date()) {
 if (key === localDate(now)) return '오늘';
 const yesterday = new Date(now); yesterday.setDate(yesterday.getDate()-1);
 if (key === localDate(yesterday)) return '어제';
 const [year, month, day] = key.split('-').map(Number);
 return `${year === now.getFullYear() ? '' : `${year}년 `}${month}월 ${day}일`;
}
export async function initialize(db: SQLiteDatabase) {
 await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
 const version = await db.getFirstAsync<{user_version:number}>('PRAGMA user_version');
 if ((version?.user_version ?? 0) > 1) throw new Error('Unsupported database version');
 await db.withTransactionAsync(async () => { await db.execAsync(schema); });
}
export const loadRecords = (db: SQLiteDatabase) => db.getAllAsync<RecordEntry>(listSQL);
export async function addRecord(db: SQLiteDatabase, input: string, now = new Date()): Promise<RecordEntry> {
 const text = input.trim(); if (!text) throw new Error('Empty record');
 const created_at = now.getTime(), local_date = localDate(now);
 const local_time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
 const result = await db.runAsync(insertSQL, text, created_at, local_date, local_time);
 return {id: result.lastInsertRowId, text, created_at, local_date, local_time};
}
