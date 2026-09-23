import React, { useState } from 'react';

const dateFormat = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });

export default function PostCard({ post, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await onUpdate(post.id, draft);
      setEditing(false);
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm('이 기록을 삭제할까요? 삭제한 기록은 되돌릴 수 없습니다.')) return;
    setBusy(true);
    setError('');
    try { await onDelete(post.id); }
    catch (error) { setError(error.message); setBusy(false); }
  }

  return <article className="post">
    <div className="post-meta"><span className="avatar" aria-hidden="true">나</span><strong>나의 혼잣말</strong>
      <time dateTime={post.created_at}>{dateFormat.format(new Date(post.created_at))}</time>
      {post.updated_at !== post.created_at && <span className="edited">수정됨</span>}
    </div>
    {editing ? <form onSubmit={save}>
      <label className="sr-only" htmlFor={`edit-${post.id}`}>기록 수정</label>
      <textarea id={`edit-${post.id}`} value={draft} onChange={e => setDraft(e.target.value)} autoFocus disabled={busy} />
      <div className="post-actions"><button type="button" disabled={busy} onClick={() => setEditing(false)}>취소</button>
        <button className="primary" disabled={busy || !draft.trim()}>{busy ? '저장 중…' : '저장'}</button></div>
    </form> : <>
      <p className="post-content">{post.content}</p>
      <div className="post-actions"><button disabled={busy} onClick={() => { setDraft(post.content); setEditing(true); setError(''); }}>수정</button>
        <button disabled={busy} onClick={remove}>{busy ? '삭제 중…' : '삭제'}</button></div>
    </>}
    {error && <p className="error" role="alert">{error}</p>}
  </article>;
}
