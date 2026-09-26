import { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { getDatabase } from './database';
import { loadRecords, type RecordEntry } from './records';

type RecordsState = {
 records: RecordEntry[];
 setRecords: Dispatch<SetStateAction<RecordEntry[]>>;
 loading: boolean;
 failed: boolean;
 load: () => Promise<void>;
 today: Date;
 setToday: Dispatch<SetStateAction<Date>>;
};
const Context = createContext<RecordsState | null>(null);
export function RecordsProvider({ children }: { children: ReactNode }) {
 const [records, setRecords] = useState<RecordEntry[]>([]);
 const [loading, setLoading] = useState(true);
 const [failed, setFailed] = useState(false);
 const [today, setToday] = useState(new Date());
 async function load() {
  setLoading(true); setFailed(false);
  try { setRecords(await loadRecords(await getDatabase())); }
  catch { setFailed(true); }
  finally { setLoading(false); }
 }
 useEffect(() => {
  let active = true;
  void (async () => {
   try {
    const loaded = await loadRecords(await getDatabase());
    if (active) setRecords(loaded);
   } catch { if (active) setFailed(true); }
   finally { if (active) setLoading(false); }
  })();
  return () => { active = false; };
 }, []);
 useEffect(() => {
  const sub = AppState.addEventListener('change', state => { if (state === 'active') setToday(new Date()); });
  const timer = setInterval(() => setToday(new Date()), 60_000);
  return () => { sub.remove(); clearInterval(timer); };
 }, []);
 return <Context.Provider value={{ records, setRecords, loading, failed, load, today, setToday }}>{children}</Context.Provider>;
}
export function useRecords() {
 const value = useContext(Context);
 if (!value) throw new Error('RecordsProvider is required');
 return value;
}
