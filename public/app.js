// 서비스 워커 등록과 오프라인 저장 요청. 로그인 화면과 계산기 페이지가 함께 사용합니다.
(function () {
  "use strict";
  if (!("serviceWorker" in navigator)) return;

  // 로그아웃할 때 호출: 이 기기에 저장된 계산기 페이지를 삭제
  window.appClearOffline = function () {
    var c = navigator.serviceWorker.controller;
    if (c) c.postMessage("clear");
  };

  var PRIVATE = ["/home.html", "/trunnion-template.html", "/y-tee.html"];
  navigator.serviceWorker.register("/sw.js").then(function () {
    return navigator.serviceWorker.ready;
  }).then(function (reg) {
    // 로그인 후 계산기 페이지가 열렸을 때만 오프라인용으로 저장하도록 요청
    if (PRIVATE.indexOf(location.pathname) >= 0 && reg.active) reg.active.postMessage("precache");
  }).catch(function () { /* 등록 실패해도 사이트는 정상 동작 */ });
})();
