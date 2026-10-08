/* 윤이 미술 — 그림 저장 (AREQ-88). IndexedDB 이름 'yuni-art-works'는 절대 바꾸지 않아요 (기획서 3장).
   레코드: { id, date, u, d, title, drId, kind:'today'|'free', who, png(Blob 1024), thumb(Blob 192), ops(JSON 문자열) } */
window.STORE = (() => {
  'use strict';
  const DB = 'yuni-art-works', ST = 'works';
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no idb'));
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(ST)) { const s = db.createObjectStore(ST, { keyPath: 'id', autoIncrement: true }); s.createIndex('date', 'date'); } };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = (mode, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction(ST, mode); const s = t.objectStore(ST); const q = fn(s); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }));
  const add = rec => tx('readwrite', s => s.add(rec));
  const put = rec => tx('readwrite', s => s.put(rec));
  const get = id => tx('readonly', s => s.get(id));
  const remove = id => tx('readwrite', s => s.delete(id));
  const count = () => tx('readonly', s => s.count()).catch(() => 0);
  const all = () => tx('readonly', s => s.getAll()).then(list => (list || []).sort((a, b) => b.id - a.id)).catch(() => []);
  const fileName = rec => `yuni-art-${rec.date}-${(rec.title || '그림').replace(/[\\/:*?"<>|\s]+/g, '_')}-${rec.id}.png`;
  function download(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  async function share(rec) { // Web Share API(아빠 폰·카톡) → 안 되면 PNG 내려받기
    const name = fileName(rec);
    try {
      const f = new File([rec.png], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: rec.title || '윤이 그림' }); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    download(rec.png, name); return 'download';
  }
  async function exportAll() { const list = await all(); let n = 0; for (const r of list) { download(r.png, fileName(r)); n++; await new Promise(x => setTimeout(x, 400)); } return n; }
  return { open, add, put, get, remove, count, all, share, exportAll, download, fileName };
})();
