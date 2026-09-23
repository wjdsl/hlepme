async function request(path = '', options = {}) {
  const response = await fetch(`/api/posts${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    throw new Error(response.status === 404
      ? '기록을 찾을 수 없습니다. 새로고침 후 다시 시도해 주세요.'
      : '기록을 저장하거나 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.');
  }
  return response.status === 204 ? null : response.json();
}

export const postsApi = {
  list: (signal) => request('', { signal }),
  create: (content) => request('', { method: 'POST', body: JSON.stringify({ content }) }),
  update: (id, content) => request(`/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  remove: (id) => request(`/${id}`, { method: 'DELETE' }),
};
