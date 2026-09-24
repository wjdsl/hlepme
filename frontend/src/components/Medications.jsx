import React, { useEffect, useState } from 'react';
import { medicationsApi } from '../api.js';

const emptyForm = () => ({ name: '', dose: '', instructions: '', scheduled_times: ['08:00'] });
const clock = value => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));

export default function Medications() {
  const [medications, setMedications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(null);
  const [stopping, setStopping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(signal) {
    const [items, today] = await Promise.all([medicationsApi.list(signal), medicationsApi.today(signal)]);
    if (!signal?.aborted) { setMedications(items); setLogs(today); }
  }

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).catch(e => { if (e.name !== 'AbortError') setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    // Refresh on focus and at the Korean date boundary, without a server scheduler.
    let day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    const refresh = () => load(controller.signal).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    const timer = setInterval(() => {
      const next = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
      if (next !== day) { day = next; refresh(); }
    }, 30000);
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);

  async function act(action, message) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await action(); await load(); setNotice(message); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function edit(medication) {
    setEditing(medication.id);
    setForm({ name: medication.name, dose: medication.dose, instructions: medication.instructions || '', scheduled_times: medication.schedules.map(s => s.scheduled_time.slice(0, 5)) });
  }

  async function save(event) {
    event.preventDefault();
    await act(async () => {
      const payload = { ...form, instructions: form.instructions.trim() || null };
      if (editing) await medicationsApi.update(editing, payload);
      else await medicationsApi.create(payload);
      setForm(null); setEditing(null);
    }, '복약 정보를 저장했습니다.');
  }

  return <>
    <header><p className="eyebrow">MY DAILY MEDICATIONS</p><h1>매일, 나를 돌보는 시간</h1><p>복용 예정 시간과 실제 복용을 따로 기록해요. 모든 시간은 한국 시간입니다.</p></header>
    <div className="timeline-heading"><h2>오늘의 복용약</h2><button className="primary" disabled={busy} onClick={() => { setEditing(null); setForm(emptyForm()); }}>+ 약 추가</button></div>
    {error && <div role="alert" className="error"><p>{error}</p><button disabled={busy} onClick={() => act(async () => {}, '다시 불러왔습니다.')}>다시 불러오기</button></div>}
    <p role="status" className="med-notice">{notice}</p>
    {form && <section className="composer medication-form" aria-label={editing ? '약 수정' : '약 추가'}>
      <h2>{editing ? '약 수정' : '약 추가'}</h2>
      <form onSubmit={save}><fieldset disabled={busy}>
        <label htmlFor="med-name">약 이름</label><input autoFocus id="med-name" required maxLength={200} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <label htmlFor="med-dose">복용량</label><input id="med-dose" required maxLength={200} placeholder="예: 36mg" value={form.dose} onChange={e => setForm({ ...form, dose: e.target.value })} />
        <label htmlFor="med-instructions">복용 방법/메모 (선택)</label><input id="med-instructions" maxLength={2000} placeholder="예: 아침 식후" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
        {form.scheduled_times.map((time, index) => <div key={index}><label htmlFor={`med-time-${index}`}>복용 시간 {index + 1}</label><div className="time-input"><input id={`med-time-${index}`} type="time" required value={time} onInput={e => setForm({ ...form, scheduled_times: form.scheduled_times.map((t, i) => i === index ? e.target.value : t) })} />{form.scheduled_times.length > 1 && <button type="button" aria-label={`복용 시간 ${index + 1} 삭제`} onClick={() => setForm({ ...form, scheduled_times: form.scheduled_times.filter((_, i) => i !== index) })}>삭제</button>}</div></div>)}
        <button type="button" disabled={form.scheduled_times.length >= 24} onClick={() => setForm({ ...form, scheduled_times: [...form.scheduled_times, '20:00'] })}>+ 복용 시간 추가</button>
        {editing && <p className="med-hint">시간 변경은 오늘의 미완료 일정부터 반영됩니다. 완료·건너뜀 기록의 예정 시간은 유지됩니다.</p>}
        <div className="med-actions"><button type="button" onClick={() => setForm(null)}>취소</button><button className="primary" disabled={!form.name.trim() || !form.dose.trim() || !form.scheduled_times.length}>{busy ? '저장 중…' : '저장'}</button></div>
      </fieldset></form>
    </section>}
    <section className="timeline" aria-label="오늘의 복용약" aria-busy={loading}>
      {loading ? <p className="empty">복용약을 불러오는 중…</p> : logs.length ? logs.map(log => <article className="post medication-card" key={log.id}>
        <time dateTime={log.scheduled_at}>{clock(log.scheduled_at)}</time><h3>{log.medication.name} <span>{log.medication.dose}</span></h3>
        {log.medication.instructions && <p>{log.medication.instructions}</p>}
        <p className={`med-status ${log.status}`}>{log.status === 'taken' ? `✓ ${clock(log.taken_at)} 복용 완료` : log.status === 'skipped' ? '건너뜀' : '복용 예정 · 미완료'}</p>
        {log.medication.is_active && log.medication.schedules.some(s => s.id === log.schedule_id) && <div className="med-actions"><button className="primary" disabled={busy || log.status === 'taken'} onClick={() => act(() => medicationsApi.take(log.id), '복용 완료로 기록했습니다.')}>복용 완료</button><button disabled={busy || log.status === 'skipped'} onClick={() => act(() => medicationsApi.skip(log.id), '건너뜀으로 기록했습니다.')}>건너뜀</button></div>}
      </article>) : <p className="empty">오늘 예정된 복용약이 없어요.<br />복용 중인 약과 시간을 추가해 주세요.</p>}
    </section>
    <div className="timeline-heading"><h2>복용 중인 약</h2><span>{medications.length}개</span></div>
    <section className="timeline" aria-label="복용 중인 약">
      {medications.length ? medications.map(medication => <article className="post medication-card" key={medication.id}>
        <h3>{medication.name} <span>{medication.dose}</span></h3><p>{medication.schedules.length ? `매일 ${medication.schedules.map(s => s.scheduled_time.slice(0, 5)).join(' · ')}` : '등록된 복용 시간 없음'}</p>
        <div className="med-actions"><button disabled={busy} onClick={() => edit(medication)}>수정</button><button disabled={busy} onClick={() => setStopping(medication.id)}>복용 중단</button></div>
        {stopping === medication.id && <div role="group" aria-label="복용 중단 확인"><p>복용을 중단할까요? 이전 기록은 보존됩니다.</p><div className="med-actions"><button disabled={busy} onClick={() => setStopping(null)}>취소</button><button disabled={busy} onClick={() => act(async () => { await medicationsApi.update(medication.id, { is_active: false }); setStopping(null); if (editing === medication.id) setForm(null); }, '복용을 중단했습니다. 이전 기록은 보존됩니다.')}>중단 확인</button></div></div>}
      </article>) : <p className="empty">복용 중인 약이 없어요.</p>}
    </section>
  </>;
}
