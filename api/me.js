const L = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!L.configured()) return res.status(500).json({ error: "서버 설정(Supabase 환경변수)이 되어 있지 않습니다." });
  const s = await L.getSession(req, res);
  if (!s || s.status !== "approved") return res.status(401).json({ ok: false });
  res.status(200).json({ ok: true, email: s.user.email, isAdmin: s.isAdmin });
};
