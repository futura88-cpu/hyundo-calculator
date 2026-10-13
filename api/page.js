// 승인된 멤버에게만 private/ 안의 페이지를 내려줍니다. (vercel.json의 rewrites가 이 함수로 연결)
const fs = require("fs");
const path = require("path");
const L = require("./_lib");

const PAGES = new Set(["home", "trunnion-template", "y-tee", "admin", "manual"]);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const name = String((req.query && req.query.name) || "");
  if (!PAGES.has(name)) return res.status(404).send("페이지를 찾을 수 없습니다.");
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
  let html = fs.readFileSync(path.join(process.cwd(), "private", name + ".html"), "utf8");
  // 설명서의 관리자용 항목(<!--admin-only-start--> ~ <!--admin-only-end-->)은 관리자에게만 내려줍니다.
  // 브라우저에서 숨기는 방식이 아니라 서버가 아예 보내지 않으므로 일반 멤버는 소스에서도 볼 수 없습니다.
  if (!s.isAdmin) html = html.replace(/<!--admin-only-start-->[\s\S]*?<!--admin-only-end-->/g, "");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
};
