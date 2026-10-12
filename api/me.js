const L = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!L.configured()) return res.status(500).json({ error: "config" });
  const s = await L.getSession(req, res);
  if (!s || s.status !== "approved") return res.status(401).json({ ok: false });
  res.status(200).json({ ok: true, email: s.user.email });
};
