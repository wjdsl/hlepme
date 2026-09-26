import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, shiftMonth, groupRecords } from '../src/calendar.ts';
import { addRecord, localDate } from '../src/records.ts';

test('month grid handles leap years, weekdays and complete weeks', () => {
 for (const [year, month, count, first] of [[2024,1,29,4],[2025,1,28,6],[2026,1,28,0],[2026,7,31,6]]) {
  const cells = monthDays({year, month});
  assert.equal(cells.filter(Boolean).length, count);
  assert.equal(cells.findIndex(Boolean), first);
  assert.equal(cells.length % 7, 0);
  assert.equal(new Set(cells.filter(Boolean)).size, count);
  assert.equal(cells.filter(Boolean).at(-1), `${year}-${String(month+1).padStart(2,'0')}-${count}`);
 }
});
test('month movement crosses years without end-of-month overflow', () => {
 assert.deepEqual(shiftMonth({year:2026,month:11},1),{year:2027,month:0});
 assert.deepEqual(shiftMonth({year:2027,month:0},-1),{year:2026,month:11});
 assert.deepEqual(shiftMonth({year:2024,month:0},1),{year:2024,month:1});
});
test('calendar groups by persisted local date and keeps newest-first ordering', () => {
 const records = [
  {id:1,text:'첫 기록',created_at:100,local_date:'2026-09-25',local_time:'00:01'},
  {id:2,text:'이전 날짜',created_at:300,local_date:'2026-09-24',local_time:'23:59'},
  {id:3,text:'동시 기록',created_at:100,local_date:'2026-09-25',local_time:'00:01'},
 ];
 const grouped = groupRecords(records);
 assert.deepEqual(grouped.get('2026-09-25').map(r=>r.id),[3,1]);
 assert.equal(grouped.get('2026-09-24').length,1);
 assert.equal(grouped.has('2026-09-26'),false);
 assert.deepEqual(records.map(r=>r.id),[1,2,3]);
});
test('writes around midnight use local date in positive, negative and DST timezones', async () => {
 const original = process.env.TZ;
 try {
  for (const tz of ['Asia/Seoul','America/Los_Angeles','Pacific/Kiritimati']) {
   process.env.TZ = tz;
   const db = {runAsync:async()=>({lastInsertRowId:1})};
   const before = await addRecord(db,'전',new Date(2026,8,24,23,59));
   const after = await addRecord(db,'후',new Date(2026,8,25,0,1));
   assert.equal(before.local_date,'2026-09-24'); assert.equal(before.local_time,'23:59');
   assert.equal(after.local_date,'2026-09-25'); assert.equal(after.local_time,'00:01');
   assert.equal(localDate(new Date(2026,2,8,0,1)),'2026-03-08');
   assert.equal(monthDays({year:2026,month:2}).filter(Boolean).length,31);
  }
 } finally { if(original === undefined) delete process.env.TZ; else process.env.TZ=original; }
});
