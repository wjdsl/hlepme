import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { initialize } from './records';
// The same file in the app documents directory is reopened after every restart.
let database: Promise<SQLiteDatabase> | undefined;
export function getDatabase() {
 if (!database) database = (async () => {
  const db = await openDatabaseAsync('helpme-records.db');
  try { await initialize(db); return db; }
  catch (error) { await db.closeAsync(); throw error; }
 })().catch(error => { database = undefined; throw error; });
 return database;
}
