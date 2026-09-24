import React, { useEffect, useMemo, useState } from 'react';
import { visitsApi } from '../api.js';
import { dayLabel, monthDays, moveMonth, seoulDay, seoulTime } from '../calendar.js';
import PostCard from './PostCard.jsx';

function VisitForm({ visit, day, onSave, onCancel }) {
  const [date, setDate] = useState(visit ? seoulDay(visit.scheduled_at) : day);
  const [time, setTime] = useState(visit ? seoulTime(visit.scheduled_at) : '09:00');
  const [title, setTitle] = useState(visit?.title ?? '병원 진료');
  const [memo, setMemo] = useState(visit?.memo ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      await onSave(visit?.id, { scheduled_at: `${date}T${time}:00+09:00`, title: title.trim(), memo: memo.trim() || null });
    } catch (error) { setError(error.message); setBusy(false); }
  }
  return <section className="composer medication-form visit-form" aria-label={visit ? '진료 일정 수정' : '진료 일정 추가'}>
    <h3>{visit ? '진료 일정 수정' : '진료 일정 추가'}</h3>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="visit-date-time"><div><label htmlFor="visit-date">날짜</label><input id="visit-date" type="date" min="1900-01-01" max="9998-12-31" required value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><label htmlFor="visit-time">시간 (서울)</label><input id="visit-time" type="time" required value={time} onChange={e => setTime(e.target.value)} /></div></div>
      <label htmlFor="visit-title">제목</label><input id="visit-title" required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} />
      <label htmlFor="visit-memo">메모 (선택)</label><textarea id="visit-memo" value={memo} onChange={e => setMemo(e.target.value)} />
      <div className="med-actions"><button type="button" onClick={onCancel}>취소</button><button className="primary" disabled={!title.trim()}>{busy ? '저장 중…' : '진료 저장'}</button></div>
    </fieldset></form>{error && <p className="error" role="alert">{error}</p>}
  </section>;
}

export default function Calendar({ posts, onUpdate, onDelete }) {
  const today = seoulDay(new Date());
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    visitsApi.list(controller.signal).then(setVisits).catch(error => {
      if (error.name !== 'AbortError') setError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);
  const postDays = useMemo(() => {
    const groups = {};
    for (const post of posts) (groups[seoulDay(post.created_at)] ??= []).push(post);
    for (const group of Object.values(groups)) group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id);
    return groups;
  }, [posts]);
  const visitDays = useMemo(() => {
    const groups = {};
    for (const visit of visits) (groups[seoulDay(visit.scheduled_at)] ??= []).push(visit);
    for (const group of Object.values(groups)) group.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at) || a.id - b.id);
    return groups;
  }, [visits]);
  function navigate(delta) {
    const next = moveMonth(month, delta);
    setMonth(next); setSelected(`${next}-01`);
  }
  async function save(id, payload) {
    const saved = id ? await visitsApi.update(id, payload) : await visitsApi.create(payload);
    setVisits(current => id ? current.map(v => v.id === id ? saved : v) : [...current, saved]);
    const day = seoulDay(saved.scheduled_at);
    setSelected(day); setMonth(day.slice(0, 7)); setForm(null);
    setNotice(id ? '진료 일정을 수정했습니다.' : '진료 일정을 추가했습니다.');
  }
  async function remove(visit) {
    if (!window.confirm(`“${visit.title}” 진료 일정을 삭제할까요?`)) return;
    setRemoving(visit.id); setActionError('');
    try {
      await visitsApi.remove(visit.id);
      setVisits(current => current.filter(v => v.id !== visit.id));
      setNotice('진료 일정을 삭제했습니다.');
    } catch (error) { setActionError(error.message); }
    finally { setRemoving(null); }
  }
  return <section className="calendar-view" aria-label="기록과 진료 달력">
    <div className="calendar-toolbar"><div className="month-navigation">
      <button aria-label="이전 달" disabled={month <= '1900-01'} onClick={() => navigate(-1)}>‹</button>
      <h2 aria-live="polite">{Number(month.slice(0, 4))}년 {Number(month.slice(5))}월</h2>
      <button aria-label="다음 달" disabled={month >= '9998-12'} onClick={() => navigate(1)}>›</button>
      <button onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>오늘</button>
    </div><button className="primary" disabled={loading || !!error || !!form || removing !== null} onClick={() => setForm({ day: selected })}>+ 진료 일정</button></div>
    <p className="calendar-legend">● 혼잣말 개수 · 🏥 진료 · 서울 시간 기준</p>
    {loading && <p role="status">진료 일정을 불러오는 중…</p>}
    {error && <div role="alert"><p className="error">{error}</p><button onClick={() => setReload(n => n + 1)}>진료 다시 불러오기</button></div>}
    <div className="calendar-grid" role="group" aria-label={`${month} 날짜 선택`}>
      {['일', '월', '화', '수', '목', '금', '토'].map(day => <span className="weekday" key={day}>{day}</span>)}
      {monthDays(month).map((day, i) => day ? <button key={day} className={`calendar-day ${day === today ? 'is-today' : ''} ${day === selected ? 'is-selected' : ''}`}
        aria-label={`${dayLabel(day)}${day === today ? ', 오늘' : ''}, 기록 ${postDays[day]?.length ?? 0}개${!loading && !error ? `, 진료 ${visitDays[day]?.length ?? 0}개` : ''}`}
        aria-pressed={day === selected} aria-current={day === today ? 'date' : undefined} onClick={() => setSelected(day)}>
        <span className="day-number">{Number(day.slice(8))}</span>
        {!!postDays[day]?.length && <span className="post-count">● {postDays[day].length}</span>}
        {!loading && !error && !!visitDays[day]?.length && <span className="visit-marker">🏥 진료{visitDays[day].length > 1 ? ` ${visitDays[day].length}` : ''}</span>}
      </button> : <span key={`blank-${i}`} />)}
    </div>
    {form && <VisitForm key={form.visit?.id ?? form.day} visit={form.visit} day={form.day} onSave={save} onCancel={() => setForm(null)} />}
    <p className="med-notice" role="status">{notice}</p>
    <section className="day-details" aria-label="선택한 날짜의 기록과 진료">
      <h2>{dayLabel(selected)}</h2>
      {actionError && <p className="error" role="alert">{actionError}</p>}
      {!loading && !error && <><h3>진료 일정 <span>{visitDays[selected]?.length ?? 0}</span></h3>
        {(visitDays[selected] ?? []).map(visit => <article className="post visit-card" key={visit.id}>
          <div className="visit-heading"><strong>{visit.title}</strong><time dateTime={visit.scheduled_at}>{seoulTime(visit.scheduled_at)}</time></div>
          {visit.memo && <p className="post-content">{visit.memo}</p>}
          <div className="post-actions"><button disabled={!!form || removing !== null} onClick={() => setForm({ visit })}>진료 수정</button>
            <button disabled={!!form || removing !== null} onClick={() => remove(visit)}>{removing === visit.id ? '삭제 중…' : '진료 삭제'}</button></div>
        </article>)}
        {!visitDays[selected]?.length && <p className="day-empty">예정된 진료가 없습니다.</p>}</>}
      <h3>혼잣말 <span>{postDays[selected]?.length ?? 0}</span></h3>
      <div className="timeline">{(postDays[selected] ?? []).map(post => <PostCard key={post.id} post={post} timeOnly onUpdate={onUpdate} onDelete={onDelete} />)}
        {!postDays[selected]?.length && <p className="day-empty">이날 남긴 혼잣말이 없습니다.</p>}</div>
    </section>
  </section>;
}
