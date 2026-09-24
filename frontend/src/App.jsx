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
      <a className="brand" href="/" aria-label="혼잣말 홈"><span className="brand-icon">“</span>혼잣말<span className="version">V0.3</span></a>
      <nav className="navigation" aria-label="주 메뉴"><a href="#posts" className={page === 'posts' ? 'nav-active' : ''} aria-current={page === 'posts' ? 'page' : undefined}>☰ 나의 기록</a><a href="#medications" className={page === 'medications' ? 'nav-active' : ''} aria-current={page === 'medications' ? 'page' : undefined}>✚ 복용약</a></nav>
      <p className="sidebar-note">잘 정리하지 않아도 괜찮아요.<br />지금 떠오른 말을 남겨 주세요.</p>
      <span className="sidebar-footer">나를 위한 작은 기록</span>
    </aside>
    <main>
      {page === 'medications' ? <Medications /> : <>
      <header><p className="eyebrow">MY LITTLE NOTES</p><h1>지금, 무슨 생각을 하나요?</h1><p>짧은 한마디도 충분해요. 편하게 남겨 보세요.</p></header>
      <section className="composer" aria-label="새 혼잣말 작성">
        <form onSubmit={submit}>
          <label htmlFor="content"><span className="avatar" aria-hidden="true">나</span> 오늘의 나에게</label>
          <textarea id="content" placeholder="여기에 생각나는 말을 적어 주세요…" value={content} onChange={e => setContent(e.target.value)} disabled={saving} />
          <div className="composer-footer"><span>어떤 말이든, 있는 그대로.</span><button className="primary" disabled={!content.trim() || saving || loading || !!loadError}>{saving ? '남기는 중…' : '기록 남기기'} <span aria-hidden="true">↗</span></button></div>
        </form>
        {saveError && <p className="error" role="alert">{saveError}</p>}
      </section>
      <div className="timeline-heading"><h2>나의 기록</h2><div className="view-switch" role="group" aria-label="기록 보기"><button aria-pressed={view === 'timeline'} onClick={() => setView('timeline')}>타임라인</button><button aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>달력</button></div></div>
      {view === 'timeline' && <p className="calendar-legend">최신순</p>}
      <p className="sr-only" role="status">{notice}</p>
      {view === 'calendar' && !loading && !loadError ? <Calendar posts={posts} onUpdate={update} onDelete={remove} /> : <section className="timeline" aria-label="혼잣말 타임라인" aria-busy={loading}>
        {loading ? <p className="empty" role="status">기록을 불러오는 중…</p> : loadError ? <div className="empty"><p className="error" role="alert">{loadError}</p><button onClick={() => setReload(value => value + 1)}>다시 불러오기</button></div> : posts.length ? posts.map(post => <PostCard key={post.id} post={post} onUpdate={update} onDelete={remove} />) : <div className="empty"><span className="empty-mark" aria-hidden="true">“</span><h3>첫 번째 혼잣말을 기다리고 있어요</h3><p>오늘 있었던 일, 문득 떠오른 생각.<br />한 줄부터 시작해 보세요.</p></div>}
      </section>}
      <footer>흘러가는 생각을, 조금씩 모아 두는 곳.</footer>
      </>}
    </main>
  </div>;
}
