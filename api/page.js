// 승인된 멤버에게만 private/ 안의 페이지를 내려줍니다. (vercel.json의 rewrites가 이 함수로 연결)
const fs = require("fs");
const path = require("path");
const L = require("./_lib");

const PAGES = new Set(["home", "trunnion-template", "y-tee", "admin"]);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const name = String((req.query && req.query.name) || "");
  if (!PAGES.has(name)) return res.status(404).send("Not found");
  if (!L.configured()) return res.status(500).send("서버 설정(Supabase 환경변수)이 되어 있지 않습니다.");

  const s = await L.getSession(req, res);
  if (!s || s.status !== "approved") {
    res.setHeader("Location", "/");
    return res.status(302).end();
  }
  if (name === "admin" && !s.isAdmin) {   // 관리자 화면은 관리자만
    res.setHeader("Location", "/home.html");
    return res.status(302).end();
  }
  const html = fs.readFileSync(path.join(process.cwd(), "private", name + ".html"), "utf8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
};
