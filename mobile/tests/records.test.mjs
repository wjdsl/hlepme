import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addRecord, initialize, loadRecords, dateLabel, localDate } from '../src/records.ts';
// Real SQLite file via Node adapter; native Expo bridge is checked on iPhone.
function adapter(db) {return {
 execAsync:async sql=>db.exec(sql),
 getFirstAsync:async sql=>db.prepare(sql).get(),
 getAllAsync:async sql=>db.prepare(sql).all(),
 runAsync:async (sql,...args)=>{const result=db.prepare(sql).run(...args);return {changes:result.changes,lastInsertRowId:Number(result.lastInsertRowid)};},
 withTransactionAsync:async fn=>{db.exec('BEGIN');try{await fn();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}
};}
test('records survive close/reopen and initialization; text and ordering preserved',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'helpme-test-'));const file=join(dir,'records.db');let raw=new DatabaseSync(file);
 try {
  let db=adapter(raw);await initialize(db);assert.equal((await loadRecords(db)).length,0);
  const now=new Date(2026,8,24,0,5);
  await addRecord(db,"한글 '따옴표'\n두 번째 줄 🙂",now);
  await addRecord(db,'같은 시각 두 번째 기록',now);
  await assert.rejects(addRecord(db,' \n '));
  raw.close();raw=new DatabaseSync(file);db=adapter(raw);await initialize(db);
  const records=await loadRecords(db);assert.equal(records.length,2);
  assert.equal(records[0].text,'같은 시각 두 번째 기록');assert.equal(records[1].text,"한글 '따옴표'\n두 번째 줄 🙂");
  assert.equal(records[0].local_date,'2026-09-24');assert.equal(records[0].local_time,'00:05');
 }finally{raw.close();rmSync(dir,{recursive:true,force:true});}
});
test('local date labels handle year boundaries',()=>{
 const now=new Date(2027,0,1,0,1);assert.equal(localDate(now),'2027-01-01');
 assert.equal(dateLabel('2027-01-01',now),'오늘');assert.equal(dateLabel('2026-12-31',now),'어제');assert.equal(dateLabel('2026-12-30',now),'2026년 12월 30일');
});
test('failed writes propagate without returning a saved record',async()=>{
 await assert.rejects(addRecord({runAsync:async()=>{throw new Error('disk full');}},'입력 유지'),/disk full/);
});
test('existing V0.4A v1 database retains rows, IDs and sequence after calendar upgrade',async()=>{
 const raw=new DatabaseSync(':memory:'); const db=adapter(raw);
 try {
  raw.exec(`CREATE TABLE records (id INTEGER PRIMARY KEY AUTOINCREMENT, text TEXT NOT NULL CHECK(length(trim(text)) > 0), created_at INTEGER NOT NULL, local_date TEXT NOT NULL, local_time TEXT NOT NULL);
   PRAGMA user_version=1;
   INSERT INTO records VALUES (42, '기존 기록', 1780000000000, '2026-05-29', '00:06');`);
  const before=await loadRecords(db);
  await initialize(db); await initialize(db);
  assert.deepEqual(await loadRecords(db),before);
  const added=await addRecord(db,'추가 기록',new Date(2026,8,25,0,1));
  assert.equal(added.id,43);
  assert.equal((await loadRecords(db)).length,2);
  assert.equal(raw.prepare('PRAGMA user_version').get().user_version,1);
 }finally{raw.close();}
});
