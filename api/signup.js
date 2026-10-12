const L = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "허용되지 않는 요청입니다." });
  if (!L.configured()) return res.status(500).json({ error: "서버 설정(Supabase 환경변수)이 되어 있지 않습니다." });
  const { email, password } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "올바른 이메일을 입력하세요." });
  if (!password || password.length < 8) return res.status(400).json({ error: "비밀번호는 8자 이상이어야 합니다." });

  const r = await L.sb("/auth/v1/signup", { method: "POST", body: { email, password } });
  if (!r.ok) {
    let msg = "";
    try { const d = await r.json(); msg = d.msg || d.error_description || d.message || ""; } catch (e) { /* 본문 없음 */ }
    if (/already|registered/i.test(msg)) return res.status(409).json({ error: "이미 가입 신청된 이메일입니다. 로그인해 보세요." });
    return res.status(400).json({ error: "가입 신청에 실패했습니다. " + msg });
  }
  // 가입 직후에는 프로필이 '승인 대기(pending)'로 만들어지며, 로그인 쿠키는 발급하지 않습니다.
  res.status(200).json({ ok: true, message: "가입 신청이 접수되었습니다. 관리자가 승인하면 로그인할 수 있습니다." });
};
