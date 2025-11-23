// auth.js - handles login, storing token, adding auth header to fetch wrapper
const Auth = {
  tokenKey: "ann_token",
  userKey: "ann_user",
  setToken(token) { localStorage.setItem(this.tokenKey, token); },
  getToken() { return localStorage.getItem(this.tokenKey); },
  clear() { localStorage.removeItem(this.tokenKey); localStorage.removeItem(this.userKey); },
  setUser(user) { localStorage.setItem(this.userKey, JSON.stringify(user)); },
  getUser() { const s = localStorage.getItem(this.userKey); return s ? JSON.parse(s) : null; },
  async fetchWithAuth(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    const t = this.getToken();
    if (t) opts.headers["Authorization"] = "Bearer " + t;
    const res = await fetch(url, opts);
    if (res.status === 401 || res.status === 403) {
      // token expired or invalid - clear
      this.clear();
      // optionally redirect to login
    }
    return res;
  }
};

async function login(username, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({username, password})
  });
  const j = await res.json();
  if (j.ok) {
    Auth.setToken(j.token);
    Auth.setUser({username: j.username, role: j.role});
    return {ok:true, user: {username:j.username, role:j.role}};
  } else {
    return {ok:false, error: j.error || "Login failed"};
  }
}

function logout() {
  Auth.clear();
  window.location.href = "/login";
}

// On login page button
if (document.getElementById('loginBtn')) {
  document.getElementById('loginBtn').onclick = async () => {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    const res = await login(u,p);
    const msg = document.getElementById('loginMsg');
    if (res.ok) {
      msg.textContent = "Logged in";
      window.location.href = "/annotation";
    } else {
      msg.textContent = "Error: " + res.error;
    }
  }
}

// On every page load, set nav UX based on auth
window.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.getUser();
  if (user) {
    const el = document.getElementById('nav-username');
    if (el) el.textContent = user.username + " (" + user.role + ")";
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  }
});
