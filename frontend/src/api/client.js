const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');

const TOKEN_KEY = 'edtech_crm_token';
const ADMIN_KEY = 'edtech_crm_admin';
export const LOGIN_PATH = '/admin/login';

export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Field-level validation errors from the server: { field: message }
    this.errors = errors;
  }
}

// ---- Session helpers ----

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdmin() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveSession(token, admin) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

// UX-only check so an expired token doesn't flash the dashboard.
// The server still verifies the signature and expiry on every protected request.
export function isAuthenticated() {
  const token = getToken();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now())) {
    clearSession();
    return false;
  }
  return true;
}

// ---- Fetch wrapper ----

function buildUrl(path, query) {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.append(key, value);
  });
  const qs = params.toString();
  return `${API_URL}${path}${qs ? `?${qs}` : ''}`;
}

async function request(path, { method = 'GET', body, query, auth = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Unable to reach the server. Please check your connection and try again.', 0);
  }

  const data = await response.json().catch(() => null);

  // A protected call was rejected: the token is missing, invalid or expired.
  if (response.status === 401 && auth) {
    clearSession();
    if (window.location.pathname !== LOGIN_PATH) {
      window.location.assign(`${LOGIN_PATH}?expired=1`);
    }
    throw new ApiError(data?.error || 'Your session has expired. Please log in again.', 401);
  }

  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed with status ${response.status}`, response.status, data?.errors || null);
  }

  return data;
}

export const api = {
  submitInquiry: (inquiry) => request('/inquiries', { method: 'POST', body: inquiry }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me', { auth: true }),
  getInquiries: (filters) => request('/inquiries', { query: filters, auth: true }),
  updateInquiryStatus: (id, status) =>
    request(`/inquiries/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status }, auth: true }),
};
