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

async function medicationRequest(path, options = {}) {
  const response = await fetch(`/api/${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 404 && body.detail === 'Not Found') {
      throw new Error('복약 API를 찾을 수 없습니다. 백엔드가 V0.2인지 확인하고 서버를 재시작해 주세요.');
    }
    throw new Error(typeof body.detail === 'string' ? body.detail : response.status === 422
      ? '약 이름, 복용량, 복용 시간을 확인해 주세요. 시간은 중복될 수 없습니다.'
      : '복약 정보를 저장하거나 불러오지 못했습니다. 다시 시도해 주세요.');
  }
  return response.status === 204 ? null : response.json();
}

export const medicationsApi = {
  list: signal => medicationRequest('medications', { signal }),
  today: signal => medicationRequest('medication-logs/today', { signal }),
  create: payload => medicationRequest('medications', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => medicationRequest(`medications/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  take: id => medicationRequest(`medication-logs/${id}/take`, { method: 'PATCH' }),
  skip: id => medicationRequest(`medication-logs/${id}/skip`, { method: 'PATCH' }),
};

async function visitRequest(path = '', options = {}) {
  const response = await fetch(`/api/visits${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.detail === 'string' && body.detail !== 'Not Found' ? body.detail
      : response.status === 422 ? '진료 날짜, 시간, 제목을 확인해 주세요.'
      : '진료 일정을 저장하거나 불러오지 못했습니다. 다시 시도해 주세요.');
  }
  return response.status === 204 ? null : response.json();
}

export const visitsApi = {
  list: signal => visitRequest('', { signal }),
  create: payload => visitRequest('', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => visitRequest(`/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: id => visitRequest(`/${id}`, { method: 'DELETE' }),
};
