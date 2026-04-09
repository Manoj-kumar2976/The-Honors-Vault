const BASE = "http://localhost:8082/api";

const handle = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || err.message || "Something went wrong");
  }
  // 204 No Content (DELETE response) — no body to parse
  if (res.status === 204) return null;
  return res.json();
};

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    handle(
      fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
    ),

  signup: (data) =>
    handle(
      fetch(`${BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    ),
};

// ── Users ─────────────────────────────────────────────────
export const userAPI = {
  getAll: () => handle(fetch(`${BASE}/users`)),
};

// ── Achievements ──────────────────────────────────────────
export const achievementAPI = {
  getAll: () => handle(fetch(`${BASE}/achievements`)),

  add: (data) =>
    handle(
      fetch(`${BASE}/achievements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    ),

  update: (id, data) =>
    handle(
      fetch(`${BASE}/achievements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    ),

  delete: (id) =>
    handle(
      fetch(`${BASE}/achievements/${id}`, { method: "DELETE" })
    ),
};