/**
 * NBL-Ops Auth Module
 * Handles Supabase authentication via magic link (email OTP).
 * Requires config.js and Supabase CDN to be loaded first.
 */

// ─── Supabase client (browser) ────────────────────────────────
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return _supabase;
}

// ─── Auth state ───────────────────────────────────────────────
let _currentUser = null;
let _accessToken = null;

async function initAuth() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    _currentUser = session.user;
    _accessToken = session.access_token;
  }
  // Listen for auth changes (login, logout, token refresh)
  sb.auth.onAuthStateChange((event, session) => {
    if (session) {
      _currentUser = session.user;
      _accessToken = session.access_token;
    } else {
      _currentUser = null;
      _accessToken = null;
    }
    renderAuthBar();
    if (typeof onAuthChanged === 'function') onAuthChanged(_currentUser);
  });
  renderAuthBar();
  return _currentUser;
}

function getCurrentUser() { return _currentUser; }
function getAccessToken() { return _accessToken; }
function isLoggedIn() { return !!_currentUser; }

// ─── Login / Logout ──────────────────────────────────────────
async function sendMagicLink(email) {
  const sb = getSupabase();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname }
  });
  return { success: !error, error: error?.message };
}

async function logout() {
  const sb = getSupabase();
  await sb.auth.signOut();
  _currentUser = null;
  _accessToken = null;
  renderAuthBar();
  if (typeof onAuthChanged === 'function') onAuthChanged(null);
}

// ─── Auth-aware fetch helper ─────────────────────────────────
async function authFetch(url, options = {}) {
  // Refresh token if needed
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (session) _accessToken = session.access_token;

  const headers = { ...(options.headers || {}), 'Content-Type': 'application/json' };
  if (_accessToken) headers['Authorization'] = 'Bearer ' + _accessToken;
  return fetch(url, { ...options, headers });
}

// ─── Auth Bar UI ─────────────────────────────────────────────
function renderAuthBar() {
  let bar = document.getElementById('authBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'authBar';
    bar.style.cssText = 'background:#1a1a2e; border-bottom:1px solid #2a2a4a; padding:8px 48px; display:flex; align-items:center; justify-content:flex-end; gap:12px; font-family:var(--font-body, "DM Mono", monospace); font-size:11px;';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (_currentUser) {
    bar.innerHTML = `
      <span style="color:#8a8ab0">Signed in as</span>
      <span style="color:#e0e0ff; font-weight:600">${_currentUser.email}</span>
      <button onclick="logout()" style="background:none; border:1px solid #4a4a6a; color:#8a8ab0; padding:4px 12px; border-radius:4px; cursor:pointer; font-size:10px; font-family:inherit; letter-spacing:1px">SIGN OUT</button>
    `;
  } else {
    bar.innerHTML = `
      <span style="color:#8a8ab0">Sign in to sync data across devices</span>
      <button onclick="showLoginModal()" style="background:var(--accent, #ff6b35); border:none; color:#fff; padding:4px 14px; border-radius:4px; cursor:pointer; font-size:10px; font-family:inherit; letter-spacing:1px; font-weight:600">SIGN IN</button>
    `;
  }
}

// ─── Login Modal ─────────────────────────────────────────────
function showLoginModal() {
  if (document.getElementById('loginModal')) return;
  const modal = document.createElement('div');
  modal.id = 'loginModal';
  modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999;';
  modal.innerHTML = `
    <div style="background:#1e1e2e; border:1px solid #2a2a4a; border-radius:12px; padding:32px; width:360px; text-align:center; font-family:var(--font-body, 'DM Mono', monospace);">
      <h2 style="color:#e0e0ff; font-family:var(--font-display, 'Bebas Neue', sans-serif); font-size:28px; letter-spacing:3px; margin:0 0 8px">SIGN IN</h2>
      <p style="color:#8a8ab0; font-size:11px; margin:0 0 20px">Enter your email to receive a magic link</p>
      <input id="loginEmail" type="email" placeholder="you@example.com" style="width:100%; padding:10px 14px; background:#12121e; border:1px solid #2a2a4a; border-radius:6px; color:#e0e0ff; font-size:13px; font-family:inherit; box-sizing:border-box; outline:none;" />
      <div id="loginMsg" style="margin-top:12px; font-size:11px; min-height:18px;"></div>
      <div style="display:flex; gap:10px; margin-top:16px;">
        <button onclick="closeLoginModal()" style="flex:1; padding:10px; background:none; border:1px solid #2a2a4a; color:#8a8ab0; border-radius:6px; cursor:pointer; font-size:11px; font-family:inherit; letter-spacing:1px">CANCEL</button>
        <button onclick="doLogin()" id="loginBtn" style="flex:1; padding:10px; background:var(--accent, #ff6b35); border:none; color:#fff; border-radius:6px; cursor:pointer; font-size:11px; font-family:inherit; letter-spacing:1px; font-weight:600">SEND LINK</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) closeLoginModal(); });
  setTimeout(() => document.getElementById('loginEmail')?.focus(), 100);
  // Allow Enter key
  document.getElementById('loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
}

function closeLoginModal() {
  const m = document.getElementById('loginModal');
  if (m) m.remove();
}

async function doLogin() {
  const email = document.getElementById('loginEmail')?.value?.trim();
  const msg = document.getElementById('loginMsg');
  const btn = document.getElementById('loginBtn');
  if (!email || !email.includes('@')) {
    msg.style.color = '#ff6b6b';
    msg.textContent = 'Please enter a valid email';
    return;
  }
  btn.disabled = true;
  btn.textContent = 'SENDING...';
  msg.style.color = '#8a8ab0';
  msg.textContent = 'Sending magic link...';

  const result = await sendMagicLink(email);
  if (result.success) {
    msg.style.color = '#4ade80';
    msg.textContent = 'Check your email for the login link!';
    btn.textContent = 'SENT ✓';
    setTimeout(closeLoginModal, 3000);
  } else {
    msg.style.color = '#ff6b6b';
    msg.textContent = result.error || 'Failed to send link';
    btn.disabled = false;
    btn.textContent = 'SEND LINK';
  }
}
