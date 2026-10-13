const L = require("../_lib");

// 관리자 전용: 전체 멤버 목록
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!L.configured()) return res.status(500).json({ error: "서버 설정(Supabase 환경변수)이 되어 있지 않습니다." });
  const s = await L.getSession(req, res);
  if (!s || s.status !== "approved" || !s.isAdmin) return res.status(403).json({ error: "관리자만 볼 수 있습니다." });

  // name, phone 열은 profile-fields.sql 실행 후에 생깁니다. 아직 없으면 기본 열만 조회합니다.
  let r = await L.sb("/rest/v1/profiles?select=id,email,name,phone,status,is_admin,created_at&order=created_at.desc", { token: s.token });
  if (!r.ok) r = await L.sb("/rest/v1/profiles?select=id,email,status,is_admin,created_at&order=created_at.desc", { token: s.token });
  if (!r.ok) return res.status(500).json({ error: "멤버 목록을 불러오지 못했습니다. (admin.sql을 실행했는지 확인하세요)" });
  res.status(200).json({ me: s.user.id, members: await r.json() });
};
