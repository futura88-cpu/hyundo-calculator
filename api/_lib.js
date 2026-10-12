// Supabase 연동 공통 함수. 파일명이 _ 로 시작하므로 Vercel 함수(엔드포인트)로 노출되지 않습니다.
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SB_KEY = process.env.SUPABASE_ANON_KEY || "";
const ACCESS = "sb-access";
const REFRESH = "sb-refresh";

const configured = () => Boolean(SB_URL && SB_KEY);

function sb(path, { method = "GET", token, body, prefer } = {}) {
  const headers = { apikey: SB_KEY, Authorization: "Bearer " + (token || SB_KEY), "Content-Type": "application/json" };
  if (prefer) headers.Prefer = prefer;
  return fetch(SB_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach(part => {
    const i = part.indexOf("=");
    if (i < 0) return;
    try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { /* 깨진 쿠키는 무시 */ }
  });
  return out;
}

const cookie = (name, value, maxAge) =>
  `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

function setSession(res, s) {
  res.setHeader("Set-Cookie", [
    cookie(ACCESS, s.access_token, s.expires_in || 3600),
    cookie(REFRESH, s.refresh_token, 60 * 60 * 24 * 30),
  ]);
}
function clearSession(res) {
  res.setHeader("Set-Cookie", [cookie(ACCESS, "", 0), cookie(REFRESH, "", 0)]);
}

// 본인 프로필의 승인 상태와 관리자 여부 (RLS로 본인 행만 읽힘). 행이 없으면 null
// is_admin 열이 아직 없는 DB(admin.sql 실행 전)에서도 로그인은 되도록 status만 다시 조회합니다.
async function profileInfo(token, uid) {
  const id = encodeURIComponent(uid);
  let r = await sb(`/rest/v1/profiles?select=status,is_admin&id=eq.${id}`, { token });
  if (!r.ok) r = await sb(`/rest/v1/profiles?select=status&id=eq.${id}`, { token });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows[0] ? { status: rows[0].status, isAdmin: rows[0].is_admin === true } : null;
}

// 쿠키의 토큰을 검증하고(만료 시 갱신) 승인 상태까지 돌려줍니다. 로그인 안 됐으면 null
async function getSession(req, res) {
  const c = parseCookies(req);
  let token = c[ACCESS], user = null;
  if (token) {
    const r = await sb("/auth/v1/user", { token });
    if (r.ok) user = await r.json();
  }
  if (!user && c[REFRESH]) {
    const r = await sb("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: c[REFRESH] } });
    if (r.ok) {
      const s = await r.json();
      token = s.access_token; user = s.user;
      setSession(res, s);
    }
  }
  if (!user) return null;
  const info = await profileInfo(token, user.id);
  return { user, token, status: info ? info.status : null, isAdmin: info ? info.isAdmin : false };
}

module.exports = { configured, sb, setSession, clearSession, profileInfo, getSession };
