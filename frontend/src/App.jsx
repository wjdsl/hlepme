import React, { useEffect, useState } from 'react';
import { postsApi } from './api.js';
import PostCard from './components/PostCard.jsx';
import Medications from './components/Medications.jsx';
import Calendar from './components/Calendar.jsx';

export default function App() {
  const [page, setPage] = useState(() => location.hash === '#medications' ? 'medications' : 'posts');
  useEffect(() => {
    const navigate = () => setPage(location.hash === '#medications' ? 'medications' : 'posts');
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  const [view, setView] = useState('timeline');
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError('');
    postsApi.list(controller.signal).then(setPosts).catch(error => {
      if (error.name !== 'AbortError') setLoadError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  async function submit(event) {
    event.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    setSaveError('');
    setNotice('');
    try {
      const post = await postsApi.create(content);
      setPosts(current => [post, ...current]);
      setContent('');
      setNotice('혼잣말을 남겼습니다.');
    } catch (error) { setSaveError(error.message); }
    finally { setSaving(false); }
  }

  async function update(id, content) {
    const updated = await postsApi.update(id, content);
    setPosts(current => current.map(post => post.id === id ? updated : post));
    setNotice('기록을 수정했습니다.');
  }

  async function remove(id) {
    await postsApi.remove(id);
    setPosts(current => current.filter(post => post.id !== id));
    setNotice('기록을 삭제했습니다.');
  }

  return <div className="layout">
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="helpme 홈"><span className="brand-icon">“</span>helpme<span className="version">V0.3</span></a>
      <nav className="navigation" aria-label="주 메뉴"><a href="#posts" className={page === 'posts' ? 'nav-active' : ''} aria-current={page === 'posts' ? 'page' : undefined}>☰ 나의 기록</a><a href="#medications" className={page === 'medications' ? 'nav-active' : ''} aria-current={page === 'medications' ? 'page' : undefined}>✚ 복용약</a></nav>
    </aside>
    <main>
      {page === 'medications' ? <Medications /> : <>
      <header><h1>기록</h1></header>
      <section className="composer" aria-label="새 혼잣말 작성">
        <form onSubmit={submit}>
          <label htmlFor="content" className="sr-only">기록 내용</label>
          <textarea id="content" placeholder="무슨 생각 중?" value={content} onChange={e => setContent(e.target.value)} disabled={saving} />
          <div className="composer-footer"><button className="primary" disabled={!content.trim() || saving || loading || !!loadError}>{saving ? '저장 중…' : '기록'} <span aria-hidden="true">↗</span></button></div>
        </form>
        {saveError && <p className="error" role="alert">{saveError}</p>}
      </section>
      <div className="timeline-heading"><h2>나의 기록</h2><div className="view-switch" role="group" aria-label="기록 보기"><button aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>타임라인</button><button aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>달력</button></div></div>
      {view === 'timeline' && <p className="calendar-legend">최신순</p>}
      <p className="sr-only" role="status">{notice}</p>
      {view === 'calendar' && !loading && !loadError ? <Calendar posts={posts} onUpdate={update} onDelete={remove} /> : <section className="timeline" aria-label="혼잣말 타임라인" aria-busy={loading}>
        {loading ? <p className="empty" role="status">기록을 불러오는 중…</p> : loadError ? <div className="empty"><p className="error" role="alert">{loadError}</p><button onClick={() => setReload(value => value + 1)}>다시 불러오기</button></div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} onUpdate={update} onDelete={remove} />) : <div className="empty"><p>기록이 없습니다.</p></div>}
      </section>}
      </>}
    </main>
  </div>;
}
