const L = require("./_lib");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  L.clearSession(res);
  res.status(200).json({ ok: true });
};
