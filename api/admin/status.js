const L = require("../_lib");

const STATUSES = new Set(["pending", "approved", "rejected"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 관리자 전용: 멤버 상태 변경 (승인 / 보류 / 거부)
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "허용되지 않는 요청입니다." });
  if (!L.configured()) return res.status(500).json({ error: "서버 설정(Supabase 환경변수)이 되어 있지 않습니다." });
  const s = await L.getSession(req, res);
  if (!s || s.status !== "approved" || !s.isAdmin) return res.status(403).json({ error: "관리자만 변경할 수 있습니다." });

  const { id, status } = req.body || {};
  if (!UUID.test(id || "") || !STATUSES.has(status)) return res.status(400).json({ error: "잘못된 요청입니다." });
  if (id === s.user.id) return res.status(400).json({ error: "본인 계정의 상태는 바꿀 수 없습니다." });

  const r = await L.sb(`/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", token: s.token, body: { status }, prefer: "return=representation" });
  if (!r.ok) return res.status(500).json({ error: "상태를 변경하지 못했습니다." });
  const rows = await r.json();
  if (!rows.length) return res.status(404).json({ error: "해당 멤버를 찾지 못했습니다." });
  res.status(200).json({ ok: true, member: rows[0] });
};
