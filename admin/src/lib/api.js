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
  const rawBody = await response.text();
  let body = {};
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    // A proxy or server error can return HTML instead of the API's JSON shape.
  }
  if (!response.ok) {
    const fallback = rawBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(body.message || fallback || `Request failed (HTTP ${response.status})`);
  }
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
  const blob = await response.blob();
  const pdfBlob = new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "document.pdf";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Cleaned up
    }
  }, 60000);
}

export async function preview(path) {
  let previewWindow = null;
  try {
    previewWindow = window.open("", "_blank");
  } catch {
    // Popup might be blocked, will fallback below
  }

  try {
    const response = await request(path, {});
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      throw new Error(body.message || "PDF preview failed");
    }
    const blob = await response.blob();
    const pdfBlob = new Blob([blob], { type: "application/pdf" });
    const url = URL.createObjectURL(pdfBlob);

    if (previewWindow && !previewWindow.closed) {
      previewWindow.location.href = url;
    } else {
      const fallback = window.open(url, "_blank", "noopener,noreferrer");
      if (!fallback) {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  } catch (err) {
    if (previewWindow && !previewWindow.closed) previewWindow.close();
    throw err;
  }
}
