import { getAuthToken } from '../hooks/useAuth';

const API_BASE = '';

function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('auth_token');
  } catch {
    // ignore
  }
  const adminPath = import.meta.env.VITE_ADMIN_PATH || '/gentrade-panel-engine';
  if (window.location.pathname !== adminPath) {
    window.location.assign(adminPath);
  } else {
    window.location.reload();
  }
}

function authHeaders(extra = {}) {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(options.headers),
    ...options,
  });

  if (response.status === 401) {
    handleUnauthorized();
  }

  if (!response.ok && !options.rawResponse) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || error.error || 'Request failed');
  }
  return options.rawResponse ? response : response.json();
}

export const api = {
  get: (path, opts) => request(path, { ...opts }),
  post: (path, body, opts) => request(path, { method: 'POST', body: JSON.stringify(body), ...opts }),
  put: (path, body, opts) => request(path, { method: 'PUT', body: JSON.stringify(body), ...opts }),
  patch: (path, body, opts) => request(path, { method: 'PATCH', body: JSON.stringify(body), ...opts }),
  del: (path, opts) => request(path, { method: 'DELETE', ...opts }),
  upload: (path, formData, opts) => {
    const token = getAuthToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE}${path}`, { method: 'POST', body: formData, headers, ...opts });
  },
};

/**
 * Authenticated fetch — drop-in replacement for fetch() with auth token
 * For files that use fetch directly with API_BASE
 */
export function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers }).then((res) => {
    if (res.status === 401) handleUnauthorized();
    return res;
  });
}

export default api;
