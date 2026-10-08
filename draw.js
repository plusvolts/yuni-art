/* 윤이 미술 — 그림판 엔진 (AREQ-84·85·89·90). 의존성 없음.
   캔버스는 항상 1024×1024(바꾸지 않아요, 기획서 3장). 그린 것은 ops(선 순서) 배열로 기록해 되돌리기·재생·저장에 써요.
   op 형식: { t:'s', tool, c, w, p:[x,y,x,y,...] } 선 / { t:'f', x, y, c } 채우기 / { t:'st', id, x, y, s, c } 도장 / { t:'sk', dr, x, y, s } 스티커(단원 그림) */
window.DRAW = (() => {
  'use strict';
  const SIZE = 1024;
  const WIDTHS = [6, 12, 22]; // 굵기 3단계 (1024 기준)
  const UNDO_MAX = 20;

  /* ---------- SVG path → 점 목록 (가이드 애니메이션·커버율·이어 그리기용) ---------- */
  let measureSvg = null;
  function pathPoints(d, step = 10) {
    if (!measureSvg) { measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); measureSvg.setAttribute('width', 0); measureSvg.setAttribute('height', 0); measureSvg.style.cssText = 'position:absolute;left:-9999px;top:-9999px'; document.body.appendChild(measureSvg); }
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); measureSvg.appendChild(p);
    const out = []; let len = 0;
    try { len = p.getTotalLength(); const n = Math.max(2, Math.ceil(len / step)); for (let i = 0; i <= n; i++) { const pt = p.getPointAtLength(len * i / n); out.push(pt.x, pt.y); } } catch (e) { /* */ }
    p.remove(); return { pts: out, len };
  }

  /* ---------- 한 op 그리기 ---------- */
  function hue(i) { return `hsl(${(i * 9) % 360} 90% 55%)`; }
  function segment(ctx, op, i) { // p[i-1] → p[i] (i===0이면 점)
    const p = op.p; const x = p[i * 2], y = p[i * 2 + 1];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = op.w;
    ctx.strokeStyle = op.tool === 'eraser' ? '#ffffff' : op.tool === 'rainbow' ? hue(i) : op.c;
    if (i === 0) { ctx.beginPath(); ctx.arc(x, y, op.w / 2, 0, Math.PI * 2); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(p[i * 2 - 2], p[i * 2 - 1]); ctx.lineTo(x, y); ctx.stroke(); }
    if (op.tool === 'sparkle' && i % 5 === 0) star(ctx, x + ((i * 37) % 23) - 11, y + ((i * 53) % 23) - 11, op.w * 0.9 + (i % 3) * 4, i % 2 ? '#fff176' : '#ffffff', op.c);
  }
  function star(ctx, cx, cy, r, fill, stroke) {
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; const rr = k % 2 ? r * 0.45 : r; ctx.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function stroke(ctx, op) { for (let i = 0; i < op.p.length / 2; i++) segment(ctx, op, i); }
  function stampOp(ctx, op, stamps) {
    const st = stamps && stamps[op.id]; if (!st) return;
    ctx.save(); ctx.translate(op.x, op.y); const k = op.s / 100; ctx.scale(k, k); ctx.translate(-50, -50);
    const path = new Path2D(st.d); ctx.fillStyle = op.c || st.c || '#ffd54f'; ctx.fill(path); ctx.lineWidth = 3 / k; ctx.strokeStyle = '#1f2a44'; ctx.lineJoin = 'round'; ctx.stroke(path); ctx.restore();
  }
  function stickerOp(ctx, op, drawings) {
    const dr = drawings && drawings[op.dr]; if (!dr) return;
    ctx.save(); ctx.translate(op.x, op.y); const k = op.s / SIZE; ctx.scale(k, k); ctx.translate(-SIZE / 2, -SIZE / 2);
    ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = op.c || '#1f2a44';
    for (const s of dr.steps) for (const d of s.paths) ctx.stroke(new Path2D(d));
    ctx.restore();
  }
  function floodFill(ctx, x, y, color) { // 닫힌 영역 채우기 (물통). 색이 비슷한 이웃 픽셀로 번져요
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    const img = ctx.getImageData(0, 0, SIZE, SIZE); const d = img.data; const i0 = (y * SIZE + x) * 4;
    const tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2], ta = d[i0 + 3];
    const c = parseColor(color); if (tr === c[0] && tg === c[1] && tb === c[2] && ta === 255) return;
    const TOL = 48;
    const match = i => Math.abs(d[i] - tr) <= TOL && Math.abs(d[i + 1] - tg) <= TOL && Math.abs(d[i + 2] - tb) <= TOL && Math.abs(d[i + 3] - ta) <= TOL;
    const seen = new Uint8Array(SIZE * SIZE); const stack = [x, y];
    while (stack.length) {
      const py = stack.pop(), px = stack.pop(); let lx = px;
      while (lx >= 0 && !seen[py * SIZE + lx] && match((py * SIZE + lx) * 4)) lx--;
      lx++;
      let rx = px; while (rx < SIZE && !seen[py * SIZE + rx] && match((py * SIZE + rx) * 4)) rx++;
      rx--;
      if (rx < lx) continue;
      let up = false, down = false;
      for (let ix = lx; ix <= rx; ix++) {
        const idx = py * SIZE + ix; seen[idx] = 1; const i = idx * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        if (py > 0) { const a = (py - 1) * SIZE + ix; const m = !seen[a] && match(a * 4); if (m && !up) { stack.push(ix, py - 1); up = true; } else if (!m) up = false; }
        if (py < SIZE - 1) { const b = (py + 1) * SIZE + ix; const m = !seen[b] && match(b * 4); if (m && !down) { stack.push(ix, py + 1); down = true; } else if (!m) down = false; }
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  function parseColor(c) { const m = String(c).match(/^#([0-9a-f]{6})$/i); if (m) { const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; } return [0, 0, 0]; }
  function drawOp(ctx, op, lib) {
    if (op.t === 's') stroke(ctx, op); else if (op.t === 'f') floodFill(ctx, op.x, op.y, op.c); else if (op.t === 'st') stampOp(ctx, op, lib.stamps); else if (op.t === 'sk') stickerOp(ctx, op, lib.drawings);
  }
  function renderAll(canvas, ops, lib, bg) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, SIZE, SIZE);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, SIZE, SIZE); }
    for (const op of ops) drawOp(ctx, op, lib);
  }

  /* ---------- 그림판 ---------- */
  // opts: { ops, lib:{stamps,drawings}, bg:'#fff'|null, tool, color, width(0..2), onChange(op), onPoint(x,y), onStart }
  function Board(host, opts = {}) {
    const ops = opts.ops || []; const lib = opts.lib || {}; const bg = opts.bg === undefined ? '#ffffff' : opts.bg;
    const canvas = document.createElement('canvas'); canvas.width = SIZE; canvas.height = SIZE; canvas.className = 'board-canvas'; host.appendChild(canvas);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const B = { canvas, ops, redo: [], tool: opts.tool || 'pencil', color: opts.color || '#1f2a44', width: opts.width == null ? 1 : opts.width, stampId: null, stickerId: null, locked: false, strokes: 0, palmReject: opts.palmReject !== false };
    let active = null; let cur = null; let penSeen = false;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [Math.max(0, Math.min(SIZE, (e.clientX - r.left) * SIZE / r.width)), Math.max(0, Math.min(SIZE, (e.clientY - r.top) * SIZE / r.height))]; };
    const changed = op => { B.redo.length = 0; if (opts.onChange) opts.onChange(op); };
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', e => {
      if (B.locked) return;
      if (active !== null) return; // 포인터 1개만 (손바닥·두 번째 손가락 무시)
      if (e.pointerType === 'pen') penSeen = true;
      if (B.palmReject && penSeen && e.pointerType === 'touch') return; // 펜을 쓰는 중이면 손바닥(터치) 무시
      e.preventDefault(); active = e.pointerId; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      const [x, y] = pos(e);
      if (opts.onStart) opts.onStart();
      if (B.tool === 'fill') { const op = { t: 'f', x: Math.round(x), y: Math.round(y), c: B.color }; floodFill(ctx, op.x, op.y, op.c); ops.push(op); changed(op); active = null; return; }
      if (B.tool === 'stamp') { const op = { t: 'st', id: B.stampId, x: Math.round(x), y: Math.round(y), s: 110 + B.width * 40, c: B.color }; stampOp(ctx, op, lib.stamps); ops.push(op); changed(op); active = null; return; }
      if (B.tool === 'sticker') { const op = { t: 'sk', dr: B.stickerId, x: Math.round(x), y: Math.round(y), s: 240 + B.width * 80, c: B.color }; stickerOp(ctx, op, lib.drawings); ops.push(op); changed(op); active = null; return; }
      const w = B.tool === 'eraser' ? WIDTHS[B.width] * 2.5 : B.tool === 'rainbow' || B.tool === 'sparkle' ? WIDTHS[B.width] * 1.5 : WIDTHS[B.width];
      cur = { t: 's', tool: B.tool, c: B.tool === 'pencil' ? '#1f2a44' : B.color, w, p: [Math.round(x), Math.round(y)] };
      segment(ctx, cur, 0);
      if (opts.onPoint) opts.onPoint(x, y);
    });
    canvas.addEventListener('pointermove', e => {
      if (e.pointerId !== active || !cur) return;
      e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) {
        const [x, y] = pos(ev); const n = cur.p.length;
        if (Math.hypot(x - cur.p[n - 2], y - cur.p[n - 1]) < 2.5) continue;
        cur.p.push(Math.round(x), Math.round(y)); segment(ctx, cur, cur.p.length / 2 - 1);
        if (opts.onPoint) opts.onPoint(x, y);
      }
    });
    const end = e => { if (e.pointerId !== active) return; active = null; if (cur) { ops.push(cur); B.strokes++; changed(cur); cur = null; } };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
    B.redraw = () => renderAll(canvas, ops, lib, bg);
    B.undo = () => { if (!ops.length) return false; B.redo.push(ops.pop()); if (B.redo.length > UNDO_MAX) B.redo.shift(); B.redraw(); if (opts.onChange) opts.onChange(null); return true; };
    B.redoOp = () => { if (!B.redo.length) return false; ops.push(B.redo.pop()); B.redraw(); if (opts.onChange) opts.onChange(null); return true; };
    B.clear = () => { ops.length = 0; B.redo.length = 0; B.redraw(); if (opts.onChange) opts.onChange(null); };
    B.setTool = (t, extra) => { B.tool = t; if (t === 'stamp') B.stampId = extra; if (t === 'sticker') B.stickerId = extra; };
    B.toBlob = (type = 'image/png', size) => new Promise(res => {
      if (!size) return canvas.toBlob(res, type);
      const c2 = document.createElement('canvas'); c2.width = c2.height = size; const x2 = c2.getContext('2d'); x2.fillStyle = '#fff'; x2.fillRect(0, 0, size, size); x2.drawImage(canvas, 0, 0, size, size); c2.toBlob(res, type);
    });
    B.toDataURL = size => { const c2 = document.createElement('canvas'); c2.width = c2.height = size; const x2 = c2.getContext('2d'); x2.fillStyle = '#fff'; x2.fillRect(0, 0, size, size); x2.drawImage(canvas, 0, 0, size, size); return c2.toDataURL('image/png'); };
    // 테스트·이어 그리기용: 프로그램으로 선 긋기
    B.strokeAt = pts => { const op = { t: 's', tool: B.tool === 'eraser' ? 'eraser' : B.tool, c: B.tool === 'pencil' ? '#1f2a44' : B.color, w: WIDTHS[B.width], p: pts.map(Math.round) }; stroke(ctx, op); ops.push(op); B.strokes++; changed(op); if (opts.onPoint) for (let i = 0; i < pts.length; i += 2) opts.onPoint(pts[i], pts[i + 1]); };
    B.redraw();
    return B;
  }

  /* ---------- 예제 가이드 SVG (AREQ-82): 이번 단계 진하게, 이미 그린 선 연하게, 다음 선 안 보임 ---------- */
  // mode: 'guide'(예제 영역) | 'overlay'(그림판 위, 연한 회색) | 'dotted'(힌트 2: 점선)
  function Guide(svg, steps, k, mode = 'guide') {
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`); svg.innerHTML = '';
    if (mode === 'none') return { svg, play: () => Promise.resolve() };
    const mk = (d, cls) => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('class', cls); svg.appendChild(p); return p; };
    const upto = mode === 'all' ? steps.length - 1 : k;
    for (let i = 0; i <= upto && i < steps.length; i++) for (const d of steps[i].paths) mk(d, i < k || mode === 'all' ? 'g-old' : mode === 'overlay' ? 'g-over' : mode === 'dotted' ? 'g-dot' : 'g-now');
    const G = { svg };
    G.play = (slow) => { // 이번 단계 선이 그려지는 애니메이션 (1~2초, 천천히는 2배)
      const ps = [...svg.querySelectorAll('.g-now')]; const total = ps.reduce((s, p) => s + p.getTotalLength(), 0) || 1;
      const dur = (slow ? 3200 : 1600);
      return ps.reduce((chain, p) => chain.then(() => new Promise(res => {
        const L = p.getTotalLength(); p.style.strokeDasharray = `${L} ${L}`; p.style.strokeDashoffset = L; p.style.transition = 'none';
        p.getBoundingClientRect(); p.style.transition = `stroke-dashoffset ${dur * L / total}ms linear`; p.style.strokeDashoffset = 0;
        setTimeout(res, dur * L / total + 40);
      })), Promise.resolve()).then(() => { ps.forEach(p => { p.style.transition = 'none'; p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }); });
    };
    return G;
  }

  /* ---------- 손풀기 커버율 (AREQ-85): 가이드 선을 따라 간 만큼 색이 차올라요 ---------- */
  function Warmup(canvas, d) {
    const ctx = canvas.getContext('2d'); const { pts } = pathPoints(d, 12); const n = pts.length / 2; const hit = new Uint8Array(n);
    const base = () => { ctx.clearRect(0, 0, SIZE, SIZE); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 40; ctx.strokeStyle = '#e6e9f2'; ctx.stroke(new Path2D(d)); };
    base();
    const W = { total: n, done: 0 };
    W.point = (x, y) => { let any = false; for (let i = 0; i < n; i++) { if (!hit[i] && Math.hypot(pts[i * 2] - x, pts[i * 2 + 1] - y) < 34) { hit[i] = 1; W.done++; any = true; ctx.fillStyle = '#ffb6c9'; ctx.beginPath(); ctx.arc(pts[i * 2], pts[i * 2 + 1], 21, 0, Math.PI * 2); ctx.fill(); } } return any; };
    W.ratio = () => (n ? W.done / n : 0);
    W.reset = () => { hit.fill(0); W.done = 0; base(); };
    return W;
  }

  /* ---------- 그린 순서 보기 (AREQ-90) ---------- */
  function replay(canvas, ops, lib, opts = {}) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); let stop = false; let speed = opts.speed || 1;
    const total = ops.reduce((s, op) => s + (op.t === 's' ? op.p.length / 2 : 20), 0) || 1;
    const perMs = total / (opts.duration || 7000); // 점/ms
    const R = { stop: () => { stop = true; }, faster: () => { speed = 3; } };
    R.done = new Promise(res => {
      renderAll(canvas, [], lib, '#ffffff'); let oi = 0, pi = 0, last = performance.now();
      const tick = now => {
        if (stop) return res(false);
        let budget = Math.max(1, (now - last) * perMs * speed); last = now;
        while (budget > 0 && oi < ops.length) {
          const op = ops[oi];
          if (op.t === 's') { segment(ctx, op, pi); pi++; budget--; if (pi >= op.p.length / 2) { oi++; pi = 0; } }
          else { drawOp(ctx, op, lib); oi++; budget -= 20; }
        }
        if (oi >= ops.length) return res(true);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return R;
  }

  /* ---------- SVG path → 선 op (초록이 이어 그리기: 반쯤 그려진 그림) ---------- */
  function pathOps(paths, color = '#9aa3b8', w = 10) { return paths.map(d => ({ t: 's', tool: 'color', c: color, w, p: pathPoints(d, 8).pts.map(Math.round) })); }

  return { SIZE, WIDTHS, Board, Guide, Warmup, replay, renderAll, pathPoints, pathOps };
})();
