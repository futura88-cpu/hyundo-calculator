const L = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "허용되지 않는 요청입니다." });
  if (!L.configured()) return res.status(500).json({ error: "서버 설정(Supabase 환경변수)이 되어 있지 않습니다." });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "이메일과 비밀번호를 입력하세요." });

  const r = await L.sb("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  if (!r.ok) return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  const s = await r.json();

  const info = await L.profileInfo(s.access_token, s.user.id);
  const status = info && info.status;
  if (status !== "approved") {
    return res.status(403).json({
      status: status || "pending",
      error: status === "rejected" ? "이 계정은 사용이 승인되지 않았습니다." : "관리자 승인 대기 중입니다. 승인되면 로그인할 수 있습니다.",
    });
  }
  L.setSession(res, s);   // 승인된 경우에만 로그인 쿠키 발급
  res.status(200).json({ ok: true });
};
