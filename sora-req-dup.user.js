// ==UserScript==
// @name         sora 요청 복사기
// @namespace    local.dev.tools
// @version      1.0.0
// @description
// @match        https://sora.chatgpt.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @updateURL   https://raw.githubusercontent.com/gurumnyang/sora-req-dup-userscript/main/sora-req-dup.user.js
// @downloadURL https://raw.githubusercontent.com/gurumnyang/sora-req-dup-userscript/main/sora-req-dup.user.js
// ==/UserScript==

(() => {
  'use strict';

  const TARGET_URL = '/backend/video_gen';

  const LS_KEY_ENABLED = 'reqdup_enabled';
  const LS_KEY_COUNT   = 'reqdup_count';

  let enabled = localStorage.getItem(LS_KEY_ENABLED);
  enabled = enabled === null ? 'true' : enabled;
  let dupCount = parseInt(localStorage.getItem(LS_KEY_COUNT) || '0', 10);
  if (Number.isNaN(dupCount) || dupCount < 0) dupCount = 0;
  if (dupCount > 10) dupCount = 10;

  const origFetch = window.fetch;

  // fetch 가로채기
  window.fetch = new Proxy(origFetch, {
    apply: function (target, thisArg, args) {
      try {
        // 요청 정보 파싱
        const input = args[0];
        const init  = args[1] || {};
        let url, method;

        if (input instanceof Request) {
          url = input.url;
          method = input.method || 'GET';
        } else {
          url = String(input);
          method = (init && init.method) ? String(init.method) : 'GET';
        }

        // 대상 판단
        const isTarget =
          enabled === 'true' &&
          method.toUpperCase() === 'POST' &&
          url.startsWith(TARGET_URL);

        if (!isTarget) {
          // 원래대로 진행
          return Reflect.apply(target, thisArg, args);
        }

        const baseReq =
          input instanceof Request
            ? input.clone()
            : new Request(url, init);

        const primaryPromise = origFetch(baseReq.clone());

        for (let i = 0; i < dupCount; i++) {
          origFetch(baseReq.clone())
            .then(() => {
            })
            .catch((err) => {
              console.warn('[req-dup] 추가 전송 실패:', err);
            });
        }

        return primaryPromise;
      } catch (e) {
        console.warn('[req-dup] 훅 처리 중 오류:', e);
        return Reflect.apply(target, thisArg, args);
      }
    }
  });

  // 간단한 UI 생성
  function buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'req-dup-panel';
    panel.style.position = 'fixed';
    panel.style.left = '16px';
    panel.style.bottom = '16px';
    panel.style.zIndex = '2147483647';
    panel.style.background = 'rgba(20,20,20,0.85)';
    panel.style.color = '#fff';
    panel.style.fontSize = '12px';
    panel.style.padding = '10px 12px';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.35)';
    panel.style.userSelect = 'none';
    panel.style.backdropFilter = 'blur(4px)';

    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <input type="checkbox" id="reqdup-enabled" ${enabled === 'true' ? 'checked' : ''} />
          <span>복제 전송 활성</span>
        </label>
      </div>
      <div style="margin-top:8px;display:flex;align-items:center;gap:8px;">
        <span>추가 전송:</span>
        <input type="number" id="reqdup-count" min="0" max="10" step="1"
               value="${dupCount}"
               style="width:56px;padding:2px 4px;border-radius:4px;border:1px solid #444;background:#111;color:#fff;" />
        <span>회</span>
      </div>
      <div style="margin-top:6px;opacity:0.8;">대상 URL: <code style="opacity:0.9">${TARGET_URL}</code></div>
    `;

    document.documentElement.appendChild(panel);

    const enabledEl = panel.querySelector('#reqdup-enabled');
    const countEl   = panel.querySelector('#reqdup-count');

    enabledEl.addEventListener('change', () => {
      enabled = enabledEl.checked ? 'true' : 'false';
      localStorage.setItem(LS_KEY_ENABLED, enabled);
    });

    countEl.addEventListener('change', () => {
      let v = parseInt(countEl.value || '0', 10);
      if (Number.isNaN(v) || v < 0) v = 0;
      if (v > 10) v = 10;
      dupCount = v;
      countEl.value = String(dupCount);
      localStorage.setItem(LS_KEY_COUNT, String(dupCount));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
  } else {
    buildPanel();
  }

  // 안내 로그
  console.log('[req-dup] 활성화됨. 대상:', TARGET_URL);
})();
