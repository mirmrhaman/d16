// Database mode is explicit: a failed request must never become a demo save.
export const DATA_MODE = import.meta.env?.VITE_DATA_MODE || 'demo';
export const IS_DEMO = DATA_MODE === 'demo';
if (!['demo', 'database'].includes(DATA_MODE)) throw new Error('VITE_DATA_MODE must be demo or database.');
const API_BASE = (import.meta.env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function requestJson(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('The database service is unreachable. We could not confirm whether the change was saved. Check the record before retrying.');
  }
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The API returned a web page instead of database data. Check the hosting /api routing; nothing was confirmed saved.');
  }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('The database service returned invalid data. Please try again.'); }
  if (!response.ok) {
    const error = new Error(typeof payload?.error === 'string' ? payload.error : payload?.message || `Request failed (${response.status}). Nothing was saved.`);
    error.status = response.status;
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/me') && typeof window !== 'undefined') window.dispatchEvent(new Event('d16-session-expired'));
    throw error;
  }
  return payload;
}

const unwrap = (payload) => payload?.data ?? payload;
export function createApiEntity(endpoint) {
  return {
    async list(ordering) {
      const params = new URLSearchParams();
      if (ordering) params.set('order', ordering);
      if (typeof window !== 'undefined' && /^\/Admin/i.test(window.location.pathname)) params.set('admin', '1');
      const data = unwrap(await requestJson(`/${endpoint}?${params}`));
      if (!Array.isArray(data)) throw new Error('The database service returned an invalid list.');
      return data;
    },
    async create(data) { return unwrap(await requestJson(`/${endpoint}`, { method: 'POST', body: JSON.stringify(data) })); },
    async update(id, data) { return unwrap(await requestJson(`/${endpoint}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(data) })); },
    async delete(id) { await requestJson(`/${endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' }); return true; },
  };
}
