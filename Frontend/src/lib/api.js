const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export async function api(path, options = {}) {
  const token = localStorage.getItem('saaluvesa_access_token');
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'Request failed');
  return body;
}

export function assetUrl(value) {
  if (!value) return null;
  if (/^(https?:|data:|blob:|\/\/)/i.test(value)) return value;
  const origin = API_URL.replace(/\/api\/?$/, '');
  return `${origin}${value.startsWith('/') ? value : `/${value}`}`;
}
export { API_URL };
