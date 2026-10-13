// 오프라인용 서비스 워커
// - 계산기 페이지(승인된 멤버 전용)는 '로그인한 상태에서 열었을 때만' 기기에 저장합니다.
// - 인터넷이 될 때 서버가 로그인 화면으로 돌려보내면(미로그인·승인 취소) 저장본을 삭제합니다.
// - 로그아웃하면 페이지에서 'clear' 메시지를 보내 저장본을 삭제합니다.
// - 인터넷이 안 될 때만 저장본을 보여줍니다. (/api/* 요청은 항상 서버로)
const VERSION = "v1";
const STATIC = "static-" + VERSION;      // 로그인 화면, 아이콘, 라이브러리, 폰트 (공개 파일)
const PRIVATE = "private-pages";         // 계산기 페이지 (승인 멤버 전용)
const PRIVATE_PAGES = ["/home.html", "/trunnion-template.html", "/y-tee.html", "/manual.html"];
const STATIC_FILES = [
  "/", "/app.js", "/manifest.webmanifest",
  "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png",
  "/vendor/jspdf.umd.min.js", "/vendor/xlsx.full.min.js",
];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

const OFFLINE_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>오프라인</title>
<style>body{font:15px/1.6 "Malgun Gothic","Apple SD Gothic Neo",sans-serif;margin:0;padding:24px;background:#151a17;color:#e6ebe7}a{color:#fb8a4c;font-weight:700}</style></head>
<body><h2>오프라인 상태입니다</h2><p>이 기기에 저장된 계산기가 없습니다. 인터넷에 연결한 뒤 <a href="/">로그인</a>해서 한 번 열어 두면, 이후에는 인터넷 없이도 사용할 수 있습니다.</p></body></html>`;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const cache = await caches.open(STATIC);
    await Promise.allSettled(STATIC_FILES.map(u => cache.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith("static-") && k !== STATIC).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", e => {
  if (e.data === "clear") e.waitUntil(caches.delete(PRIVATE));
  if (e.data === "precache") e.waitUntil(precachePrivate());
});

// 로그인된 상태에서 계산기 페이지 전체를 기기에 저장
async function precachePrivate() {
  const cache = await caches.open(PRIVATE);
  await Promise.all(PRIVATE_PAGES.map(async p => {
    try {
      const r = await fetch(p, { credentials: "same-origin", redirect: "follow", cache: "no-store" });
      if (r.ok && !r.redirected) await cache.put(p, r);
    } catch (err) { /* 오프라인이면 건너뜀 */ }
  }));
}

// 계산기 페이지: 서버 우선. 서버가 로그인 화면으로 보내면 저장본 삭제, 인터넷이 안 될 때만 저장본 사용
async function privatePage(req, path) {
  const cache = await caches.open(PRIVATE);
  try {
    const res = await fetch(req);
    if (res.type === "opaqueredirect" || res.redirected) {   // 미로그인 또는 승인 취소
      await caches.delete(PRIVATE);
      return res;
    }
    if (res.ok) await cache.put(path, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(path);
    return hit || new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

// 공개 파일/폰트: 저장본을 바로 보여주고 뒤에서 갱신
async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => {
    if (res.ok || res.type === "opaque") cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await net) || new Response("오프라인입니다.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.startsWith("/api/") || url.pathname === "/admin.html" || url.pathname === "/sw.js") return;  // 항상 서버로
    if (PRIVATE_PAGES.includes(url.pathname)) { e.respondWith(privatePage(req, url.pathname)); return; }
    e.respondWith(staleWhileRevalidate(req));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
