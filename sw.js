/* 오프라인 캐시. content.js 등을 고치면 VERSION 숫자를 올려주세요. */
const VERSION = 'yuni-art-2';
const FILES = ['./', 'index.html', 'style.css', 'content.js', 'draw.js', 'store.js', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'audio-ko/index.json', '기획서.md'];
// 한국어 녹음(audio-ko, 공통 65번)은 설치 뒤 백그라운드로 8개씩 차례로 받아둬요 (한꺼번에 받으면 폰에서 실패)
const cacheDir = dir => caches.open(VERSION).then(c => fetch(dir + '/index.json').then(r => r.json()).then(async idx => { const fs = [...new Set(Object.values(idx))]; for (let i = 0; i < fs.length; i += 8) await Promise.all(fs.slice(i, i + 8).map(f => c.match(dir + '/' + f).then(hit => hit || c.add(dir + '/' + f).catch(() => {})))); })).catch(() => {});
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()).then(() => { cacheDir('audio-ko'); })); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const req = e.request; const url = new URL(req.url);
  if (/\/audio-ko\/[^/]+\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })));
    return;
  }
  // 네트워크 우선 + no-cache → 새 버전이 바로 반영. 안 되면 캐시 → 오프라인 동작
  const net = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache' }) : fetch(req, { cache: 'no-cache' });
  e.respondWith(net.then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
