const API_URL =
  import.meta.env.VITE_ADMIN_API_URL || "http://localhost:5000/api";

const ACCESS_KEY = "saaluvesa_admin_access_token";
const REFRESH_KEY = "saaluvesa_admin_refresh_token";

let refreshInFlight = null;

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function redirectToLogin() {
  if (!location.pathname.startsWith("/login")) {
    location.assign("/login");
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) throw new Error("No refresh token available");
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Session expired");
  localStorage.setItem(ACCESS_KEY, body.accessToken);
  localStorage.setItem(REFRESH_KEY, body.refreshToken);
  return body.accessToken;
}

function request(path, options = {}) {
  const token = localStorage.getItem(ACCESS_KEY);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const requestHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  if (!isFormData) requestHeaders["Content-Type"] = "application/json";
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: requestHeaders,
  });
}

export async function api(path, options = {}) {
  let response = await request(path, options);
  if (response.status === 401 && !path.startsWith("/auth/login")) {
    try {
      refreshInFlight = refreshInFlight || refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      await refreshInFlight;
      response = await request(path, options);
    } catch {
      clearSession();
      redirectToLogin();
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || "Session expired. Please sign in again.");
    }
  }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || "Request failed");
  return body;
}

export async function download(path, filename) {
  let response = await request(path, {});
  if (response.status === 401) {
    try {
      refreshInFlight = refreshInFlight || refreshAccessToken().finally(() => {
        refreshInFlight = null;
      });
      await refreshInFlight;
      response = await request(path, {});
    } catch {
      clearSession();
      redirectToLogin();
      throw new Error("Session expired. Please sign in again.");
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Download failed");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
