/* 윤이 미술 — 앱 로직 (의존성 없음). 블록 앱 v1.2.0의 공통 블록(아빠 화면 암호·통계·탭, 별 award(), 보상, 저장·백업, 업데이트, 한국어 녹음 ko())을 복사하고 학습 흐름만 미술로 만들었어요. */
(() => {
  'use strict';
  const APP_VERSION = '1.0.1';
  const C = window.CONTENT; const DR = window.DRAW; const ST = window.STORE; const D = C.drawings;
  const U = C.units;
  const DAYS = 5;
  const STEPS = [
    { id: 'greet', name: '인사', icon: '👋' },
    { id: 'warmup', name: '손풀기', icon: '〰️' },
    { id: 'draw', name: '오늘의 그림', icon: '✏️' },
    { id: 'color', name: '색칠·꾸미기', icon: '🎨' },
    { id: 'free', name: '자유 그리기', icon: '🖼️' },
  ];
  const KEY = 'yuni-art-v1';
  const $app = document.getElementById('app');

  /* ================= 저장소 (공통 16: 저장 키 고정, 새 항목은 defaults에) ================= */
  function defaults() {
    return {
      settings: { parentPin: '1234', leader: 'dino', leaderName: '', childName: '윤이', dailyLimit: 20, koVoice: '', koVoiceMode: 'rec', koRate: 0.9, goalStars: 50, goalText: '아빠와 약속한 선물', traceMode: 'auto', leftHand: false, brush: 1, palmReject: true },
      pos: { u: 0, d: 1, s: 0 }, done: {}, stars: 0, goalBase: 0,
      days: [], log: {}, stickers: {}, override: '', rewards: [],
      learned: {}, weak: {}, hints: {}, level: 0, missionDone: {}, freeDay: '',
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = defaults(); const o = JSON.parse(raw); return Object.assign(d, o, { settings: Object.assign(d.settings, o.settings || {}) }); }
    } catch (e) { /* 저장소 사용 불가 */ }
    return defaults();
  }
  let S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  /* ================= 날짜 ================= */
  const pad = n => String(n).padStart(2, '0');
  const ymd = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  const today = () => ymd(new Date());
  const addDays = (n, from) => { const d = from ? new Date(from + 'T12:00:00') : new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  function todayLog() { const k = today(); S.log[k] = S.log[k] || { sec: 0, stars: 0 }; return S.log[k]; }
  function streak() { const set = new Set(S.days); let n = 0; let d = today(); if (!set.has(d)) d = addDays(-1); while (set.has(d)) { n++; d = addDays(-1, d); } return n; }

  /* ================= 유틸 ================= */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); }
  const leader = () => C.leaders.find(l => l.id === S.settings.leader) || C.leaders[0];
  const leaderName = () => S.settings.leaderName || leader().name;
  const childName = () => S.settings.childName || '윤이';
  const fillSay = (text, topic) => String(text).replace(/\{F\}/g, leaderName()).replace(/\{NAME\}/g, childName()).replace(/\{T\}/g, topic || '');
  const praise = () => fillSay(pick(C.lines.praise));
  const famHtml = (id, lg) => { const f = C.family[id]; return `<span class="friend${lg ? ' lg' : ''}" style="background:${f.color}"><span class="fimg">${f.img}</span>${esc(f.name)}</span>`; };

  /* ================= 소리 (기기 음성) ================= */
  let voices = [];
  function loadVoices() { try { voices = speechSynthesis.getVoices(); } catch (e) { voices = []; } }
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }
  const koVoices = () => voices.filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith('ko'));
  function voiceFor() {
    const ks = koVoices();
    const chosen = S.settings.koVoice && ks.find(v => v.voiceURI === S.settings.koVoice || v.name === S.settings.koVoice);
    return chosen || ks.find(v => /google/i.test(v.name)) || ks.find(v => /samsung/i.test(v.name)) || ks[0] || null;
  }
  let sayToken = 0;
  function speak(text, rate) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || !text) return resolve();
      const my = sayToken;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR'; u.rate = rate; u.pitch = 1.0;
      const v = voiceFor(); if (v) u.voice = v;
      let done = false; const fin = () => { if (!done) { done = true; resolve(my === sayToken); } };
      u.onend = fin; u.onerror = fin;
      setTimeout(fin, 1500 + text.length * 180 / rate);
      try { speechSynthesis.speak(u); } catch (e) { fin(); }
    });
  }
  async function speakDevice(t, rate) {
    const parts = String(t).split(/(?<=[.!?,])\s+/).map(x => x.trim()).filter(Boolean);
    const my = sayToken;
    for (let i = 0; i < parts.length; i++) { if (my !== sayToken) return; await speak(parts[i], rate); if (i < parts.length - 1) await sleep(120); }
  }
  /* ================= 한국어 녹음 재생 (공통 65번) — 다섯 앱 같은 코드 (plan/0_COMMON_spec.md 5-2) ================= */
  let KO_IDX = null; let koAudio = null; let koDone = null; let koChain = Promise.resolve();
  const koKey = t => String(t).replace(/\s+/g, ' ').trim();
  fetch('audio-ko/index.json').then(r => (r.ok ? r.json() : {})).then(j => { KO_IDX = j || {}; }).catch(() => { KO_IDX = {}; });
  const koRec = t => (S.settings.koVoiceMode !== 'device' && KO_IDX && KO_IDX[koKey(t)]) || null;
  const koSentences = t => String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
  function koStop() { const d = koDone; if (koAudio) { try { koAudio.pause(); } catch (e) { /* */ } koAudio = null; } if (d) d(false); }
  function playKo(file, rate) {
    const my = sayToken;
    const p = koChain.then(() => (my !== sayToken ? false : new Promise(resolve => {
      const a = new Audio('audio-ko/' + file); koAudio = a;
      a.playbackRate = Math.max(0.7, Math.min(1.3, (Number(rate) || 0.9) / 0.9));
      let fin = false;
      const done = ok => { if (fin) return; fin = true; if (koAudio === a) koAudio = null; if (koDone === done) koDone = null; resolve(ok); };
      koDone = done;
      a.onended = () => done(true); a.onerror = () => done(false);
      a.play().catch(() => done(false));
      setTimeout(() => done(true), 20000);
    })));
    koChain = p.catch(() => false); return p;
  }
  async function ko(t) {
    t = String(t).replace(/\{F\}/g, leaderName());
    if (window.__KO_LOG) window.__KO_LOG.push(String(t));
    const my = sayToken; const rate = Number(S.settings.koRate) || 0.9;
    const whole = koRec(t);
    if (whole) { if (await playKo(whole, rate)) return; if (my !== sayToken) return; }
    const parts = koSentences(t);
    for (let i = 0; i < parts.length; i++) {
      if (my !== sayToken) return;
      const f = koRec(parts[i]);
      if (!(f && await playKo(f, rate))) { if (my !== sayToken) return; await speakDevice(parts[i].replace(/[\p{Extended_Pictographic}]/gu, ''), rate); }
      if (i < parts.length - 1) await sleep(120);
    }
  }
  function hush() { sayToken++; koStop(); try { speechSynthesis.cancel(); } catch (e) { /* */ } }

  let actx = null;
  function tone(freqs, dur) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      freqs.forEach((f, i) => {
        const o = actx.createOscillator(); const g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(actx.destination);
        const t0 = actx.currentTime + i * dur;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.02);
      });
    } catch (e) { /* */ }
  }
  const ding = () => tone([880, 1320], 0.14);
  const popSound = () => tone([700, 1100, 1500], 0.07);

  /* ================= 화면 관리 ================= */
  let H = {}; let screen = ''; let actToken = 0;
  let board = null; let guide = null; let warm = null; let replayer = null; // 지금 화면의 그림판·가이드 (테스트용)
  let urlPool = []; let urlNew = []; // blob URL: 화면을 새로 그릴 때 이전 화면 것만 해제
  function render(name, html, handlers) {
    screen = name; hush(); actToken++; if (replayer) { try { replayer.stop(); } catch (e) { /* */ } } replayer = null; board = null; guide = null; warm = null;
    urlPool.forEach(u => { try { URL.revokeObjectURL(u); } catch (e) { /* */ } }); urlPool = urlNew; urlNew = [];
    document.querySelectorAll('.confetti,.feedback').forEach(x => x.remove());
    $app.innerHTML = html; H = handlers || {}; window.scrollTo(0, 0);
  }
  $app.addEventListener('click', e => {
    const say = e.target.closest('[data-say]');
    if (say) { e.stopPropagation(); hush(); ko(say.dataset.say); return; }
    const b = e.target.closest('[data-act]');
    if (b && H[b.dataset.act]) H[b.dataset.act](b.dataset.arg, b, e);
  });

  /* ================= 잠금 (시간 제한, 공통 11: 밤 잠금 없음) ================= */
  function lockReason() {
    if (S.override === today()) return '';
    if (todayLog().sec >= Number(S.settings.dailyLimit) * 60) return 'time';
    return '';
  }
  function lockedScreen() {
    render('locked', `<div class="screen"><div class="reward">
      <div class="robot">😴</div>
      <div class="bubble">오늘 그림 그리기는 여기까지! 정말 잘했어요.<small>${esc(leaderName())}도 이제 쉬러 가요</small></div>
      <div class="home-links"><button class="btn" data-act="home">처음으로</button><button class="btn small" data-act="parent">아빠 화면</button></div>
    </div></div>`, { home: homeScreen, parent: () => gateScreen(parentScreen) });
    ko('오늘 그림 그리기는 여기까지! 정말 잘했어요.');
  }
  setInterval(() => { if (screen === 'lesson' && !document.hidden) { todayLog().sec += 10; save(); } }, 10000);

  /* ================= 레벨 = 배운 그림 수 (AREQ-92), 도장 해금 ================= */
  const level = () => Object.keys(S.learned).length;
  const lvJosa = n => ([2, 4, 5, 9].includes(n % 10) || (n % 10 === 0 && n === 0) ? '가' : '이'); // 레벨 2가 / 레벨 3이
  const stampsOpen = () => Object.entries(C.stampUnlock).filter(([lv]) => level() >= Number(lv)).flatMap(([, ids]) => ids);
  const drawingOf = (u, d) => D[(U[u].days || [])[d - 1]];

  /* ================= 홈 ================= */
  let installEvt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (screen === 'home') homeScreen(); });
  function posLabel() { const { u, d, s } = S.pos; const up = U[u]; return `${up.bg} ${up.title} ${d}일차 · ${STEPS[s].name}${s > 0 ? '부터 이어하기' : ''}`; }
  const stickerCount = () => Object.keys(S.stickers).length;
  const todayMission = (u, d) => (C.missions[u] || [])[d - 1] || null;
  function homeScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const pct = Math.min(100, Math.round(g / goal * 100)); const st = streak(); const ld = leader();
    const m = !U[S.pos.u].soon && todayMission(S.pos.u, S.pos.d);
    render('home', `<div class="screen">
      <div class="topbar">
        <div class="stars">⭐ ${S.stars}</div>
        <div class="stars lv">🏅 레벨 ${level()}</div>
        ${st ? `<div class="stars">🔥 ${st}일 연속</div>` : ''}
        <div class="spacer"></div>
        ${installEvt ? '<button class="btn small" data-act="install">📲 앱 설치</button>' : ''}
        <button class="icon-btn" data-act="parent" aria-label="아빠 화면">⚙️</button>
      </div>
      <div class="home-main">
        <div class="bubble">안녕, ${esc(childName())}!<small>나는 ${esc(leaderName())}야. 오늘도 같이 그림 그리자!</small></div>
        <div class="robot" data-act="hello">${ld.img}</div>
        ${m ? `<div class="mcard home-mcard">${famHtml(m.who)}<span class="mtext">${esc(fillSay(m.ask))}</span>${S.missionDone[today()] ? '<span class="rw-tag done">완료 💌</span>' : '<span class="rw-tag">오늘 미션 카드</span>'}</div>` : ''}
        <button class="btn primary go-btn" data-act="go">오늘 하기<small>${esc(posLabel())}</small></button>
        <div class="home-links">
          <button class="btn" data-act="picker">🧭 단계 고르기</button>
          <button class="btn" data-act="gallery">🖼️ 윤이 미술관 <small id="workCount"></small></button>
          <button class="btn" data-act="stickers">📒 스티커북 <small>${stickerCount()}</small></button>
        </div>
        <button class="goal card" data-act="rewards" style="text-align:left"><div class="row"><b>🎁 ${esc(S.settings.goalText)}</b><div class="spacer"></div><span class="muted">${g >= goal ? '달성! 🎉' : `${g} / ${goal}`}</span></div>
          <div class="goal-bar"><i style="width:${pct}%"></i></div>
          <div class="row" style="margin-top:8px"><span class="muted">받은 보상 ${S.rewards.length}개${rwCount().left ? ` · 안 쓴 보상 ${rwCount().left}개` : ''}</span><div class="spacer"></div><span class="muted">보상 목록 보기 ›</span></div></button>
      </div>
    </div>`, {
      go: () => startLesson(S.pos.u, S.pos.d, S.pos.s),
      picker: () => pickerScreen('units'),
      stickers: stickerScreen, gallery: galleryScreen, rewards: rewardScreen,
      parent: () => gateScreen(parentScreen),
      hello: () => { hush(); ko(`안녕, ${childName()}! 오늘도 같이 그림 그리자!`); },
      install: async () => { if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (e) { /* */ } installEvt = null; homeScreen(); } },
    });
    ST.count().then(n => { const el = document.getElementById('workCount'); if (el) el.textContent = n; });
  }

  /* ================= 단계 고르기 (공통 09) ================= */
  const doneCount = u => { let n = 0; for (let d = 1; d <= DAYS; d++) if (S.done[`${u}-${d}`]) n++; return n; };
  function parseCode(code) {
    const m = String(code).trim().match(/^(\d{1,2})\s*-\s*(\d{1,2})(?:\s*-\s*(\d))?$/);
    if (!m) return null;
    const u = +m[1] - 1, d = +m[2], s = m[3] ? +m[3] - 1 : 0;
    if (u < 0 || u >= U.length || d < 1 || d > DAYS || s < 0 || s >= STEPS.length) return null;
    return { u, d, s };
  }
  function pickerScreen(lv, u, d) {
    let body = '';
    if (lv === 'units') {
      body = `<h2 class="title">어떤 단원을 할까?</h2>
        <div class="grid">${U.map((up, i) => `<button class="tile${up.soon ? ' locked' : ''}${S.pos.u === i ? ' now' : ''}" data-act="unit" data-arg="${i}">
          <span class="em">${up.bg}</span><b>${i + 1}. ${esc(up.title)}</b><small>${up.soon ? '준비 중' : `${doneCount(i)} / ${DAYS}일`}</small></button>`).join('')}</div>
        <div class="card code-row"><b>진도 코드</b><input id="code" inputmode="numeric" placeholder="예: 3-2"><button class="btn small primary" data-act="code">바로 가기</button>
          <span class="muted">단원-일차(-단계). 다른 기기에서 하던 곳부터 시작해요.</span></div>`;
    } else if (lv === 'days') {
      const up = U[u];
      body = `<h2 class="title">${up.bg} ${esc(up.title)} — 며칠째 할까?</h2>
        <div class="days">${Array.from({ length: DAYS }, (_, i) => i + 1).map(dd => { const dr = drawingOf(u, dd); return `<button class="day${S.done[`${u}-${dd}`] ? ' done' : ''}${S.pos.u === u && S.pos.d === dd ? ' now' : ''}" data-act="day" data-arg="${dd}">${dd}<small>${dr ? esc(dr.name) : '&nbsp;'}</small></button>`; }).join('')}</div>`;
    } else {
      const up = U[u];
      body = `<h2 class="title">${up.bg} ${esc(up.title)} ${d}일차 — 어디부터 할까?</h2>
        <div class="steps">${STEPS.map((st, i) => `<button class="tile" data-act="step" data-arg="${i}"><span class="em">${st.icon}</span><b>${i + 1}. ${st.name}</b></button>`).join('')}</div>`;
    }
    render('picker', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="뒤로">⬅️</button><div class="spacer"></div><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button></div>
      ${body}</div>`, {
      back: () => lv === 'units' ? homeScreen() : lv === 'days' ? pickerScreen('units') : pickerScreen('days', u),
      home: homeScreen,
      unit: a => { if (U[+a].soon) { hush(); ko('이 단원은 아직 준비 중이야. 다음 버전에서 만나!'); return toast('준비 중이에요'); } pickerScreen('days', +a); },
      day: a => pickerScreen('steps', u, +a),
      step: a => startLesson(u, d, +a),
      code: () => { const p = parseCode(document.getElementById('code').value); if (!p) return toast('예: 3-2 처럼 적어주세요'); startLesson(p.u, p.d, p.s); },
    });
  }

  /* ================= 받은 보상 (공통 15·60) ================= */
  function rwCount() { const n = S.rewards.length, u = S.rewards.filter(r => r.used).length; return { n, u, left: n - u }; }
  function rwHeadText() { const c = rwCount(); return `받은 보상 ${c.n}개 · 안 쓴 보상 ${c.left}개 · 사용완료 ${c.u}개`; }
  function rwSummary() { const c = rwCount(); return `아직 안 쓴 보상 ${c.left}개 · 사용완료 ${c.u}개`; }
  function rewardScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const list = S.rewards.slice().reverse();
    render('rewards', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button><h2 class="title">🎁 받은 보상</h2></div>
      <div class="card goal" style="width:100%"><div class="row"><b>지금 목표: ${esc(S.settings.goalText)}</b><div class="spacer"></div><span class="muted">${Math.min(g, goal)} / ${goal}</span></div>
        <div class="goal-bar"><i style="width:${Math.min(100, Math.round(g / goal * 100))}%"></i></div>
        ${g >= goal ? '<p style="margin:10px 0 0;font-weight:800">목표 달성! 아빠에게 보여줘요 🎉</p>' : `<p class="muted" style="margin:10px 0 0">별 ${goal - g}개만 더 모으면 돼요!</p>`}</div>
      ${list.length ? `<p class="muted" style="margin:0;font-weight:800">${rwSummary()}</p>` : ''}
      ${list.length ? `<div class="grid">${list.map((r, i) => `<div class="tile${r.used ? ' used' : ''}"><span class="em">${r.used ? '✅' : '🎁'}</span><b>${esc(r.text)}</b><small>${esc(r.date)} · 별 ${r.stars}개</small><small>${list.length - i}번째 보상</small><span class="rw-tag${r.used ? ' done' : ''}">${r.used ? `사용완료 · ${esc(r.used)}` : '아직 안 썼어요'}</span></div>`).join('')}</div>`
        : '<p class="muted">아직 받은 보상이 없어요. 별을 모아서 첫 보상을 받아봐요!</p>'}
    </div>`, { home: homeScreen });
    if (g >= goal) ko('목표 달성! 아빠에게 보여줘요!');
  }

  /* ================= 스티커북 (AREQ-93): 단원마다 한 페이지, 그날 그린 그림의 작은 썸네일이 스티커 ================= */
  let stPage = 0;
  const stImg = (s, fallback) => (s && s.thumb ? `<img src="${s.thumb}" alt="">` : (s ? s.img : fallback));
  function stickerScreen(page) {
    if (page != null) stPage = page; stPage = Math.max(0, Math.min(U.length - 1, stPage));
    const up = U[stPage]; const keys = [1, 2, 3, 4, 5].map(i => `${stPage}-${i}`).concat([`${stPage}-x`]);
    const got = keys.filter(k => S.stickers[k]).length; const full = got === keys.length;
    render('stickers', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button><h2 class="title">📒 스티커북</h2><div class="spacer"></div><span class="muted">${stickerCount()}장</span></div>
      <div class="stbook${full ? ' gold' : ''}">
        <div class="row"><button class="icon-btn" data-act="pg" data-arg="-1"${stPage === 0 ? ' disabled style="opacity:.3"' : ''}>◀</button>
          <div class="spacer" style="text-align:center"><b class="title">${up.bg} ${esc(up.title)}</b><div class="muted">${stPage + 1} / ${U.length} 페이지 · ${got} / ${keys.length}장${full ? ' · 다 모았어요! 🏆' : ''}</div></div>
          <button class="icon-btn" data-act="pg" data-arg="1"${stPage === U.length - 1 ? ' disabled style="opacity:.3"' : ''}>▶</button></div>
        <div class="stgrid">${[1, 2, 3, 4, 5].map(i => { const k = `${stPage}-${i}`; const s = S.stickers[k]; const dr = drawingOf(stPage, i); return `<button class="sticker${s ? '' : ' empty'}" data-act="st" data-arg="${k}"><span class="em">${stImg(s, up.bg)}</span><small>${i}일차${dr ? ' ' + esc(dr.name) : ''}${s ? '' : ' · 아직'}</small></button>`; }).join('')}
          ${(() => { const k = `${stPage}-x`; const s = S.stickers[k]; return `<button class="sticker big${s ? '' : ' empty'}" data-act="st" data-arg="${k}"><span class="em">${s ? (s.img || '🏆') : '🏆'}</span><small>${esc(up.thing)}${s ? '' : ' · 5일 다 하면'}</small></button>`; })()}
        </div>
      </div>
      <p class="muted">하루를 끝내면 그날 그린 그림이 스티커로 붙어요. 스티커를 누르면 언제 그렸는지 읽어 줘요.</p>
    </div>`, {
      home: homeScreen, pg: a => stickerScreen(stPage + Number(a)),
      st: k => { hush(); const s = S.stickers[k]; if (!s) return ko(k.endsWith('x') ? `${up.title}을 5일 다 하면 받을 수 있어` : '이 날 그림을 끝내면 받을 수 있어'); ko(`${s.name}. ${s.date.replace(/-/g, '월 ').replace(/^(\d+)월 /, '')}일에 그렸어!`); },
    });
  }

  /* ================= 수업 만들기 (AREQ-80) ================= */
  // 복습 (공통 08 미술 적용): 힌트 2번 이상 쓴 그림의 핵심 모양(1단계)을 1·3·7일 뒤 손풀기에 넣음, 3번 그리면 졸업
  const REVIEW_GAP = [1, 3, 7];
  function reviewWarmups() {
    const out = []; const td = today();
    for (const [id, w] of Object.entries(S.weak)) { if (!D[id] || w.n >= 3 || w.last === td) continue; if (td >= addDays(REVIEW_GAP[Math.min(w.n, 2)], w.date)) out.push({ type: 'warmup', w: { id: 'rv-' + id, name: D[id].name + ' 모양', path: D[id].steps[0].paths[0], say: `복습! ${D[id].name}의 ${D[id].steps[0].say}` }, review: id }); }
    return out.slice(0, 2);
  }
  function dayWarmups(u, d) {
    const ws = U[u].warm || Object.keys(C.warmups); const out = [];
    for (let i = 0; i < 3; i++) { const id = ws[((d - 1) * 3 + i) % ws.length]; out.push({ type: 'warmup', w: { id, ...C.warmups[id] } }); }
    return out;
  }
  function buildStep(u, d, s) {
    if (L && L.u === u && L.d === d && L.built) { if (!L.built[s]) L.built[s] = makeStep(u, d, s); return L.built[s]; }
    return makeStep(u, d, s);
  }
  function makeStep(u, d, s) {
    const id = STEPS[s].id; const dr = drawingOf(u, d);
    if (id === 'greet') return [{ type: 'greet' }];
    if (id === 'warmup') return reviewWarmups().concat(dayWarmups(u, d)).slice(0, 3); // 복습 모양 먼저, 모두 3개
    if (id === 'draw') return dr.steps.map((st, k) => ({ type: 'step', dr, k }));
    if (id === 'color') return [{ type: 'color', dr }];
    return [{ type: 'free' }];
  }

  /* ================= 수업 진행 ================= */
  let L = null;
  function startLesson(u, d, s) {
    const lr = lockReason(); if (lr) return lockedScreen(lr);
    if (!(u >= 0 && u < U.length)) u = 0;
    if (U[u].soon) { render('soon', `<div class="screen"><div class="reward"><div class="robot">${U[u].bg}</div><div class="bubble">${esc(U[u].title)}은 준비 중이에요!<small>다음 버전에서 만나요. 앞 단원을 다시 해 볼까요?</small></div><div class="home-links"><button class="btn" data-act="picker">🧭 단계 고르기</button><button class="btn primary" data-act="home">처음으로</button></div></div></div>`, { home: homeScreen, picker: () => pickerScreen('units') }); ko('이 단원은 아직 준비 중이야. 다음 버전에서 만나!'); return; }
    S.pos = { u, d, s }; if (!S.days.includes(today())) S.days.push(today()); save();
    const dr = drawingOf(u, d);
    L = { u, d, s, acts: [], i: 0, earned: 0, heard: {}, awarded: {}, built: {}, levelBefore: level(), ops: [], free: null, hints: {}, strokesAt: {}, trace: traceDefault(dr), thumb: '' };
    L.acts = buildStep(u, d, s);
    showAct();
  }
  // AREQ-83: 겹쳐 그리기(처음 배우는 1~3단원 그림) / 보고 그리기(4단원부터, 같은 그림 두 번째부터). 아빠 화면 기본값이 auto가 아니면 그대로
  function traceDefault(dr) { const m = S.settings.traceMode; if (m === 'overlay' || m === 'look') return m; return dr.mode === 'overlay' && !S.learned[dr.id] ? 'overlay' : 'look'; }
  function stepIntro() {
    const st = STEPS[L.s]; L.intro = true;
    render('lesson', `<div class="screen"><div class="reward"><div class="robot">${st.icon}</div><div class="bubble">다음은 ${st.name}!</div></div></div>`);
    const my = actToken;
    ko(`다음은 ${st.name}!`).then(() => sleep(300)).then(() => { if (my === actToken) showAct(); });
  }
  function nextAct() {
    L.i++;
    if (L.i < L.acts.length) return showAct();
    L.s++; S.pos.s = L.s; save();
    if (L.s >= STEPS.length) return finishDay();
    const lr = lockReason(); if (lr) return lockedScreen(lr);
    L.acts = buildStep(L.u, L.d, L.s); L.i = 0;
    stepIntro();
  }
  // 별 (공통 18·64 미술 적용): 스스로 선을 긋고 "다 그렸어요 ✔"이면 1개, 안 그리고 "다음 ▶"이면 0개, 단계당 한 번, 하루 끝 보너스 3, 하루 최대 50
  const DAY_STAR_MAX = 50, DAY_BONUS = 3;
  function giveStars(n) { if (!n) return 0; n = Math.min(n, Math.max(0, DAY_STAR_MAX - DAY_BONUS - todayLog().stars)); if (n > 0) { S.stars += n; L && (L.earned += n); todayLog().stars += n; save(); const el = document.querySelector('.stars'); if (el) el.textContent = `⭐ ${S.stars}`; } return n; }
  function award(solved) {
    const key = `${L.s}:${L.i}`;
    let n = solved ? 1 : 0;
    if (L.awarded[key]) n = 0;
    L.awarded[key] = 1;
    return giveStars(n);
  }
  function flash(emoji) { const f = document.createElement('div'); f.className = 'feedback'; f.innerHTML = `<span>${emoji}</span>`; document.body.appendChild(f); setTimeout(() => f.remove(), 950); }

  function lessonFrame(inner, opts = {}) {
    const total = L.acts.length; const p = Math.round(L.i / total * 100);
    return `<div class="screen lesson${opts.wide ? ' wide' : ''}">
      <div class="topbar">
        <button class="icon-btn" data-act="quit" aria-label="처음으로">🏠</button>
        <button class="icon-btn" data-act="prev" aria-label="이전 단계"${L.s === 0 && L.i === 0 ? ' disabled style="opacity:.35"' : ''}>◀</button>
        <div class="train">${STEPS.map((st, i) => `<div class="car${i < L.s ? ' done' : i === L.s ? ' now' : ''}" style="--p:${p}%">${i === L.s ? '<i></i>' : ''}</div>`).join('')}</div>
        <div class="stars">⭐ ${S.stars}</div>
      </div>
      <div class="step-name">${U[L.u].bg} ${esc(U[L.u].title)} ${L.d}일차 · ${STEPS[L.s].name}</div>
      ${inner}
    </div>`;
  }
  const baseHandlers = () => ({ quit: homeScreen, prev: prevAct });
  function prevAct() { // 이전 단계로 (단계 첫 번째면 앞 단계 마지막으로, 공통 17). 그린 선(L.ops)은 그대로
    hush();
    let s = L.s, i = L.i, acts = L.acts;
    if (i > 0) i--;
    else if (s > 0) { s--; acts = buildStep(L.u, L.d, s); i = acts.length - 1; }
    else return;
    L.s = s; L.i = i; L.acts = acts; S.pos.s = s; save();
    showAct();
  }
  function showAct() {
    L.intro = false; const a = L.acts[L.i];
    ({ greet: actGreet, warmup: actWarmup, step: actStep, color: actColor, free: actFree })[a.type](a);
  }

  /* --- 1. 인사: 오늘 그림 소개 + 가족 미션 카드 (AREQ-80·87) --- */
  function actGreet() {
    const up = U[L.u]; const dr = drawingOf(L.u, L.d); const m = todayMission(L.u, L.d);
    const intro = `오늘은 ${dr.name}를 그려 볼 거야! ${dr.formula}.`;
    render('lesson', lessonFrame(`<div class="stage"><div class="prompt">
        <div class="robot">${leader().img}</div>
        <div class="bubble">${esc(up.title)} ${L.d}일차 · ${esc(dr.name)}<small>${esc(dr.formula)}</small></div>
        <div class="guide-box mini"><svg id="guide"></svg></div>
        ${m ? `<div class="mcard">${famHtml(m.who, true)}<span class="mtext">${esc(fillSay(m.ask))}</span><button class="listen sm" data-say="${esc(fillSay(m.ask))}">🔊</button></div>` : ''}
        <div class="row" style="flex-wrap:wrap;justify-content:center"><span class="chip">🏅 레벨 ${level()}</span><span class="chip">✏️ ${dr.steps.length}단계</span><span class="chip">${L.trace === 'overlay' ? '겹쳐 그리기' : '보고 그리기'}</span></div>
      </div>
      <div class="next-row"><button class="btn primary" data-act="next">시작! ▶</button></div></div>`), { ...baseHandlers(), next: nextAct });
    guide = DR.Guide(document.getElementById('guide'), dr.steps, dr.steps.length - 1, 'all');
    const my = actToken;
    (async () => { await ko(`안녕, ${childName()}! 오늘은 ${up.title} ${L.d}일차야.`); if (my !== actToken) return; await ko(intro); if (my !== actToken || !m) return; await ko(`${C.family[m.who].name}가 부탁했어. ${fillSay(m.ask)}`); })();
  }

  /* --- 그림판 공통: 도구 막대 (AREQ-84·89·96) --- */
  const WIDTH_ICONS = ['·', '●', '⬤'];
  function toolbarHtml(kind, t) { // kind: 'line'(연필만) | 'color'(색칠·꾸미기) | 'free'(전부)
    const w = s => `<button class="tb${t.width === s ? ' on' : ''}" data-act="width" data-arg="${s}" aria-label="굵기 ${s + 1}"><span style="font-size:${14 + s * 8}px">●</span></button>`;
    const col = c => `<button class="tb sw${t.tool === 'color' && t.color === c ? ' on' : ''}" data-act="color" data-arg="${c}" style="background:${c}" aria-label="색"></button>`;
    const edit = `<button class="tb" data-act="undo" aria-label="되돌리기">↶</button><button class="tb" data-act="redo" aria-label="다시">↷</button><button class="tb" data-act="clear" aria-label="다 지우기">🗑</button>`;
    const pencil = `<button class="tb${t.tool === 'pencil' ? ' on' : ''}" data-act="tool" data-arg="pencil" aria-label="연필">✏️</button>`;
    const eraser = `<button class="tb${t.tool === 'eraser' ? ' on' : ''}" data-act="tool" data-arg="eraser" aria-label="지우개">🩹</button>`;
    if (kind === 'line') return `<div class="tools"><div class="tgroup">${pencil}${eraser}</div><div class="tgroup">${[0, 1, 2].map(w).join('')}</div><div class="tgroup">${edit}</div></div>`;
    const fill = `<button class="tb${t.tool === 'fill' ? ' on' : ''}" data-act="tool" data-arg="fill" aria-label="채우기">🪣</button>`;
    const magic = Object.entries(C.magic).map(([k, m]) => `<button class="tb${t.tool === k ? ' on' : ''}" data-act="tool" data-arg="${k}" aria-label="${m.name}">${m.icon}</button>`).join('');
    const stamps = stampsOpen().map(id => `<button class="tb st${t.tool === 'stamp' && t.stampId === id ? ' on' : ''}" data-act="stamp" data-arg="${id}" aria-label="${C.stamps[id].name}"><svg viewBox="0 0 100 100"><path d="${C.stamps[id].d}" fill="${C.stamps[id].c}" stroke="#1f2a44" stroke-width="4"/></svg></button>`).join('');
    const stickers = (U[L ? L.u : 0].days || []).slice(0, 4).map(id => `<button class="tb st${t.tool === 'sticker' && t.stickerId === id ? ' on' : ''}" data-act="sticker" data-arg="${id}" aria-label="${D[id].name} 스티커"><svg viewBox="0 0 1024 1024">${D[id].steps.flatMap(s => s.paths).map(p => `<path d="${p}" fill="none" stroke="#1f2a44" stroke-width="28" stroke-linecap="round"/>`).join('')}</svg></button>`).join('');
    return `<div class="tools"><div class="tgroup">${pencil}${eraser}${fill}${magic}</div><div class="tgroup colors">${C.colors.map(col).join('')}${C.skins.map(col).join('')}</div><div class="tgroup">${[0, 1, 2].map(w).join('')}</div><div class="tgroup">${stamps}${kind === 'free' ? '' : stickers}</div><div class="tgroup">${edit}</div></div>`;
  }
  const toolState = () => ({ tool: 'pencil', color: C.colors[1], width: Number(S.settings.brush) || 0, stampId: null, stickerId: null });
  function toolHandlers(t, kind, rerenderTools) {
    const sync = () => { if (board) { board.tool = t.tool; board.color = t.color; board.width = t.width; board.stampId = t.stampId; board.stickerId = t.stickerId; } rerenderTools(); };
    return {
      tool: a => { t.tool = a; sync(); },
      color: a => { t.color = a; if (!['color', 'fill', 'stamp', 'sticker', 'rainbow', 'sparkle'].includes(t.tool)) t.tool = 'color'; sync(); },
      width: a => { t.width = +a; sync(); },
      stamp: a => { t.tool = 'stamp'; t.stampId = a; sync(); },
      sticker: a => { t.tool = 'sticker'; t.stickerId = a; sync(); },
      undo: () => { if (board) board.undo(); },
      redo: () => { if (board) board.redoOp(); },
      clear: (x, btn) => { if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.classList.add('warn'); setTimeout(() => { delete btn.dataset.sure; btn.classList.remove('warn'); }, 2500); return; } delete btn.dataset.sure; btn.classList.remove('warn'); if (board) board.clear(); },
    };
  }
  const studioClass = () => `studio${S.settings.leftHand ? ' left' : ''}`;
  function mountBoard(ops, t, opts = {}) {
    const host = document.getElementById('board'); if (!host) return null;
    board = DR.Board(host, { ops, lib: { stamps: C.stamps, drawings: D }, bg: opts.bg === undefined ? '#ffffff' : opts.bg, tool: t.tool, color: t.color, width: t.width, palmReject: S.settings.palmReject !== false, onChange: opts.onChange, onPoint: opts.onPoint, onStart: () => hush() });
    board.stampId = t.stampId; board.stickerId = t.stickerId;
    return board;
  }
  function refreshTools(kind, t) { const el = document.querySelector('.tools'); if (el) el.outerHTML = toolbarHtml(kind, t); }
  function doneButtons(canDone, label = '다 그렸어요 ✔') { return `<div class="next-row done-row"><button class="btn small" data-act="skip">다음 ▶</button><button class="btn primary good" data-act="done" id="doneBtn"${canDone ? '' : ' disabled'}>${label}</button></div>`; }
  const setDone = ok => { const b = document.getElementById('doneBtn'); if (b) b.disabled = !ok; };

  /* --- 2. 손풀기 (AREQ-85): 가이드 선 위에 따라 긋기, 따라 간 만큼 색이 차올라요. X 없음 --- */
  function actWarmup(a) {
    const w = a.w; const t = { tool: 'pencil', color: '#1f2a44', width: Math.max(1, Number(S.settings.brush) || 1) };
    const ops = []; let good = false, closed = false;
    render('lesson', lessonFrame(`<div class="${studioClass()} warm">
        <div class="guide-col">
          <div class="say"><span class="who">${leader().img}</span><span class="text"><b>${a.review ? '🔁 복습 · ' : '〰️ 손풀기 · '}${esc(w.name)}</b><br><small>${esc(w.say)}</small></span><button class="listen sm" data-say="${esc(w.say)}">🔊</button></div>
          <div class="cover-row"><div class="goal-bar"><i id="coverBar" style="width:0%"></i></div><span class="muted" id="coverText">연한 선을 따라 그어 봐</span></div>
        </div>
        <div class="board-col">
          <div class="board-wrap"><canvas id="warmCanvas" class="warm-canvas" width="1024" height="1024"></canvas><div id="board" class="board-host"></div></div>
          ${toolbarHtml('line', t)}
        </div>
      </div>${doneButtons(false)}`, { wide: true }), {
      ...baseHandlers(), ...toolHandlers(t, 'line', () => refreshTools('line', t)),
      skip: () => { if (closed) return; closed = true; hush(); award(false); nextAct(); },
      done: async () => { if (closed || !ops.length) return; closed = true; hush(); const my = actToken; const n = award(true); ding(); flash(n ? '⭐' : '👍'); if (a.review) { const wk = S.weak[a.review]; if (wk) { wk.n++; wk.last = today(); if (wk.n >= 3) delete S.weak[a.review]; save(); } } await ko(fillSay(pick(good ? C.lines.warmGood : C.lines.warmOk))); if (my === actToken) nextAct(); },
    });
    warm = DR.Warmup(document.getElementById('warmCanvas'), w.path);
    mountBoard(ops, t, { bg: null, onPoint: (x, y) => { if (warm.point(x, y)) { const r = warm.ratio(); const bar = document.getElementById('coverBar'); if (bar) bar.style.width = Math.round(r * 100) + '%'; if (r >= 0.6 && !good) { good = true; const tx = document.getElementById('coverText'); if (tx) tx.textContent = '좋아! 다 그렸으면 ✔'; } } }, onChange: () => { setDone(ops.length > 0); if (!ops.length) { warm.reset(); good = false; const bar = document.getElementById('coverBar'); if (bar) bar.style.width = '0%'; } else { /* 되돌리기 뒤 커버율은 다시 계산 */ warm.reset(); good = false; let r = 0; for (const op of ops) if (op.t === 's') for (let i = 0; i < op.p.length; i += 2) warm.point(op.p[i], op.p[i + 1]); r = warm.ratio(); const bar = document.getElementById('coverBar'); if (bar) bar.style.width = Math.round(r * 100) + '%'; if (r >= 0.6) good = true; } } });
    board.width = t.width;
    const my = actToken;
    (async () => { if (!L.heard.warm) { L.heard.warm = 1; await ko('먼저 손풀기! 연한 선 위를 손가락으로 따라 그어 봐.'); if (my !== actToken) return; } await ko(w.say); })();
  }

  /* --- 3. 오늘의 그림: 단계별 따라 그리기 (AREQ-82·83, 공통 07 힌트) --- */
  function actStep(a) {
    const dr = a.dr, k = a.k, st = dr.steps[k]; const key = `${L.s}:${L.i}`;
    const t = toolState(); t.tool = 'pencil'; let closed = false;
    const entry = L.ops.length; L.strokesAt[key] = L.strokesAt[key] == null ? entry : Math.min(L.strokesAt[key], entry);
    const drawn = () => L.ops.length > L.strokesAt[key];
    const hintN = () => L.hints[key] || 0;
    const build = () => {
      render('lesson', lessonFrame(`<div class="${studioClass()}">
        <div class="guide-col">
          <div class="say"><span class="who">${leader().img}</span><span class="text"><b>✏️ ${esc(dr.name)} · ${k + 1} / ${dr.steps.length}단계</b><br><small>${esc(st.say)}</small></span><button class="listen sm" data-say="${esc(st.say)}">🔊</button></div>
          <div class="guide-box"><svg id="guide"></svg></div>
          <div class="row guide-btns"><button class="btn small" data-act="replay">▶ 다시 보기</button><button class="btn small" data-act="trace">${L.trace === 'overlay' ? '👀 보고 그리기로' : '🫥 겹쳐 그리기로'}</button><button class="btn small" data-act="hint">💡 힌트${hintN() ? ` ${hintN()}` : ''}</button><span class="chip formula">${esc(dr.formula)}</span></div>
        </div>
        <div class="board-col">
          <div class="board-wrap"><div id="board" class="board-host"></div><svg id="overlay" class="overlay${hintN() >= 2 ? ' dotted' : ''}"></svg></div>
          ${toolbarHtml('line', t)}
        </div>
      </div>${doneButtons(drawn())}`, { wide: true }), handlers());
      guide = DR.Guide(document.getElementById('guide'), dr.steps, k, 'guide');
      DR.Guide(document.getElementById('overlay'), dr.steps, k, hintN() >= 2 ? 'dotted' : L.trace === 'overlay' ? 'overlay' : 'none');
      mountBoard(L.ops, t, { onChange: () => setDone(drawn()) });
    };
    const handlers = () => ({
      ...baseHandlers(), ...toolHandlers(t, 'line', () => refreshTools('line', t)),
      replay: async () => { hush(); await guide.play(false); },
      trace: () => { hush(); L.trace = L.trace === 'overlay' ? 'look' : 'overlay'; build(); ko(L.trace === 'overlay' ? '예제를 그림판에 연하게 깔았어. 그 위를 따라 그려 봐.' : '이제 예제를 보고 빈 종이에 그려 봐.'); },
      hint: async () => { // 공통 07 미술: 1 같이 그려 볼까(천천히 다시) → 2 연한 점선 가이드 → 3 이 정도면 충분해(다음)
        if (closed) return; hush(); const my = actToken; const n = (L.hints[key] = hintN() + 1);
        if (n >= 2 && !L.weakMarked) { L.weakMarked = 1; S.weak[dr.id] = S.weak[dr.id] || { n: 0, date: today() }; S.hints[L.u] = (S.hints[L.u] || 0) + 1; save(); }
        if (n === 1) { await ko(C.lines.hint1); if (my !== actToken) return; await guide.play(true); }
        else if (n === 2) { build(); await ko(C.lines.hint2); }
        else { closed = true; await ko(C.lines.hint3); if (my !== actToken) return; const s = award(drawn()); if (s) flash('⭐'); nextAct(); }
      },
      skip: () => { if (closed) return; closed = true; hush(); award(false); nextAct(); },
      done: async () => { if (closed || !drawn()) return; closed = true; hush(); const my = actToken; const n = award(true); ding(); flash(n ? '⭐' : '👍'); await ko(k === dr.steps.length - 1 ? `${praise()} ${dr.name} 완성!` : praise()); if (my === actToken) nextAct(); },
    });
    build();
    const my = actToken;
    (async () => { if (!L.heard.step) { L.heard.step = 1; await ko(L.trace === 'overlay' ? '내가 먼저 그리는 걸 보고, 그림판의 연한 선 위를 따라 그려 봐. 다 그리면 다 그렸어요 버튼!' : '내가 먼저 그리는 걸 보고, 빈 종이에 보고 그려 봐. 다 그리면 다 그렸어요 버튼!'); if (my !== actToken) return; } await ko(st.say); if (my !== actToken) return; await guide.play(false); })();
  }

  /* --- 4. 색칠·꾸미기 (AREQ-89): 오늘 그림에 색·채우기·도장·스티커·마법 붓 --- */
  function actColor(a) {
    const dr = a.dr; const key = `${L.s}:${L.i}`; const t = toolState(); t.tool = 'color'; t.color = dr.colors[0] || C.colors[1];
    const entry = L.ops.length; L.strokesAt[key] = L.strokesAt[key] == null ? entry : Math.min(L.strokesAt[key], entry);
    const drawn = () => L.ops.length > L.strokesAt[key]; let closed = false;
    render('lesson', lessonFrame(`<div class="${studioClass()} coloring">
        <div class="guide-col">
          <div class="say"><span class="who">${leader().img}</span><span class="text"><b>🎨 색칠·꾸미기 · ${esc(dr.name)}</b><br><small>색연필로 칠하고, 물통으로 채우고, 도장과 스티커로 꾸며 봐!</small></span></div>
          <div class="row" style="flex-wrap:wrap"><span class="muted">오늘의 색:</span>${dr.colors.map(c => `<button class="tb sw big" data-act="color" data-arg="${c}" style="background:${c}"></button>`).join('')}</div>
        </div>
        <div class="board-col">
          <div class="board-wrap"><div id="board" class="board-host"></div></div>
          ${toolbarHtml('color', t)}
        </div>
      </div>${doneButtons(drawn(), '다 꾸몄어요 ✔')}`, { wide: true }), {
      ...baseHandlers(), ...toolHandlers(t, 'color', () => refreshTools('color', t)),
      skip: () => { if (closed) return; closed = true; hush(); award(false); saveToday(dr).then(() => nextAct()); },
      done: async () => { if (closed || !drawn()) return; closed = true; hush(); const my = actToken; const n = award(true); ding(); flash(n ? '⭐' : '👍'); await saveToday(dr); await ko(`${praise()} ${dr.name} 그림을 미술관에 걸었어!`); if (my === actToken) nextAct(); },
    });
    mountBoard(L.ops, t, { onChange: () => setDone(drawn()) });
    const my = actToken;
    (async () => { if (!L.heard.color) { L.heard.color = 1; await ko(`이제 ${dr.name}에 색을 칠하고 꾸며 보자! 도장과 스티커도 써 봐.`); } })();
  }
  async function saveToday(dr) { // 오늘 그림을 미술관(IndexedDB)에 저장 (AREQ-88). 같은 날 같은 그림은 덮어써요
    if (!board) return;
    try {
      const png = await board.toBlob('image/png'); const thumb = await board.toBlob('image/png', 192); L.thumb = board.toDataURL(96);
      const rec = { date: today(), u: L.u, d: L.d, title: dr.name, drId: dr.id, kind: 'today', ops: JSON.stringify(L.ops), png, thumb };
      if (L.todayWorkId) { rec.id = L.todayWorkId; await ST.put(rec); } else L.todayWorkId = await ST.add(rec);
      const l = todayLog(); l.drawings = (l.drawings || 0) + (L.todayCounted ? 0 : 1); L.todayCounted = 1; save();
    } catch (e) { toast('그림을 저장하지 못했어요'); }
  }

  /* --- 5. 자유 그리기 (AREQ-87·91): 미션 카드 / 룰렛 / 그냥 그리기 --- */
  function actFree() {
    const m = todayMission(L.u, L.d); const mDone = S.missionDone[today()];
    if (L.free) return freeBoard();
    render('lesson', lessonFrame(`<div class="stage"><div class="prompt">
        <div class="robot">${leader().img}</div>
        <div class="bubble">마지막은 자유 그리기!<small>뭘 그릴까? 미션 카드, 룰렛, 아니면 그냥 그려도 좋아.</small></div>
        ${m && !mDone ? `<div class="mcard">${famHtml(m.who, true)}<span class="mtext">${esc(fillSay(m.ask))}</span><button class="listen sm" data-say="${esc(fillSay(m.ask))}">🔊</button></div>` : ''}
        <div class="home-links">
          ${m && !mDone ? `<button class="btn primary" data-act="mission">💌 ${esc(C.family[m.who].name)} 미션 할래${m.given ? ' (이어 그리기)' : ''}</button>` : ''}
          <button class="btn" data-act="roulette">🎡 룰렛 돌리기</button>
          <button class="btn" data-act="plain">✏️ 그냥 그릴래</button>
        </div></div></div>`), {
      ...baseHandlers(),
      mission: () => { L.free = { topic: m.topic, who: m.who, mission: true, given: m.given, ops: m.given ? DR.pathOps(D[m.given].steps.slice(0, Math.ceil(D[m.given].steps.length / 2)).flatMap(s => s.paths)) : [] }; freeBoard(); },
      roulette: rouletteScreen,
      plain: () => { L.free = { topic: '', who: '', ops: [] }; freeBoard(); },
    });
    if (!L.heard.free) { L.heard.free = 1; ko('마지막은 자유 그리기! 미션 카드나 룰렛으로 주제를 정하거나, 그냥 그려도 좋아.'); }
  }
  function rouletteScreen() { // AREQ-91: 배운 소재 + 윤이가 좋아하는 것 섞어 8칸
    const learned = Object.keys(S.learned).map(id => D[id] && D[id].name).filter(Boolean);
    const items = shuffle([...new Set(shuffle(learned).slice(0, 4).concat(shuffle(C.favorites)))]).slice(0, 8);
    while (items.length < 8) items.push(C.favorites[items.length % C.favorites.length]);
    const cols = ['#ffd54f', '#ff8a65', '#4fc3f7', '#66bb6a', '#ab47bc', '#ff6f91', '#26a69a', '#5c7cfa'];
    let spun = false;
    render('lesson', lessonFrame(`<div class="stage"><div class="prompt">
        <div class="bubble">🎡 뭘 그릴까 룰렛<small>돌리기를 누르면 빙글빙글!</small></div>
        <div class="wheel-wrap"><div class="wheel-pin">▼</div><div class="wheel" id="wheel" style="background:conic-gradient(${items.map((_, i) => `${cols[i]} ${i * 45}deg ${(i + 1) * 45}deg`).join(',')})">${items.map((it, i) => `<span class="wi" style="transform:rotate(${i * 45 + 22.5}deg) translateY(-118px) rotate(0deg)">${esc(it)}</span>`).join('')}</div></div>
        <div class="home-links"><button class="btn primary" data-act="spin" id="spinBtn">🎡 돌리기</button><button class="btn small" data-act="back">뒤로</button></div></div></div>`), {
      ...baseHandlers(), back: actFree,
      spin: async () => {
        if (spun) return; spun = true; hush(); const my = actToken; const idx = Math.floor(Math.random() * 8);
        const w = document.getElementById('wheel'); const deg = 360 * 5 - (idx * 45 + 22.5);
        w.style.transition = 'transform 2.6s cubic-bezier(.15,.8,.2,1)'; w.style.transform = `rotate(${deg}deg)`; popSound();
        await sleep(2800); if (my !== actToken) return;
        const topic = items[idx]; ding(); await ko(`${topic}! ${topic}를 그려 보자!`); if (my !== actToken) return;
        L.free = { topic, who: '', ops: [] }; freeBoard();
      },
    });
  }
  function freeBoard() {
    const F = L.free; const key = `${L.s}:${L.i}`; const t = toolState(); t.tool = 'pencil'; let closed = false;
    const entry = F.ops.length; L.strokesAt[key] = L.strokesAt[key] == null ? entry : Math.min(L.strokesAt[key], entry);
    const drawn = () => F.ops.length > L.strokesAt[key];
    const title = F.mission ? `💌 ${C.family[F.who].name}에게: ${F.topic}` : F.topic ? `🎡 ${F.topic}` : '✏️ 마음대로 그리기';
    render('lesson', lessonFrame(`<div class="${studioClass()} coloring">
        <div class="guide-col">
          <div class="say">${F.mission ? famHtml(F.who, true) : `<span class="who">${leader().img}</span>`}<span class="text"><b>${esc(title)}</b><br><small>${F.given ? `${C.family.chorok.name}가 반쯤 그린 그림이야. 이어서 완성해 줘!` : '마음대로 그려 봐. 정답은 없어!'}</small></span></div>
          ${F.given ? `<div class="guide-box mini"><svg id="guide"></svg></div>` : ''}
        </div>
        <div class="board-col">
          <div class="board-wrap"><div id="board" class="board-host"></div></div>
          ${toolbarHtml('free', t)}
        </div>
      </div>${doneButtons(drawn())}`, { wide: true }), {
      ...baseHandlers(), ...toolHandlers(t, 'free', () => refreshTools('free', t)),
      skip: () => { if (closed) return; closed = true; hush(); award(false); nextAct(); },
      done: async () => {
        if (closed || !drawn()) return; closed = true; hush(); const my = actToken; const n = award(true); ding(); flash(n ? '⭐' : '👍');
        try { const png = await board.toBlob('image/png'); const thumb = await board.toBlob('image/png', 192); await ST.add({ date: today(), u: L.u, d: L.d, title: F.topic || '자유 그림', kind: 'free', who: F.who || '', ops: JSON.stringify(F.ops), png, thumb }); const l = todayLog(); l.drawings = (l.drawings || 0) + 1; } catch (e) { toast('그림을 저장하지 못했어요'); }
        if (F.mission) { S.missionDone[today()] = F.who; save(); await ko(fillSay(pick(C.thanks[F.who]), F.topic)); }
        else await ko(`${praise()} 그림을 미술관에 걸었어!`);
        if (my === actToken) nextAct();
      },
    });
    if (F.given) DR.Guide(document.getElementById('guide'), D[F.given].steps, D[F.given].steps.length - 1, 'all');
    mountBoard(F.ops, t, { onChange: () => setDone(drawn()) });
    if (F.given && !L.heard.given) { L.heard.given = 1; ko(`${C.family.chorok.name}가 반쯤 그렸어. 형이 이어서 완성해 줘!`); }
  }

  /* ================= 하루 끝 ================= */
  function confetti() {
    const em = ['⭐', '🌟', '🎉', '✨'];
    for (let i = 0; i < 24; i++) { const c = document.createElement('div'); c.className = 'confetti'; c.textContent = pick(em); c.style.left = Math.random() * 100 + 'vw'; c.style.animationDuration = 1.6 + Math.random() * 1.6 + 's'; c.style.animationDelay = Math.random() * .6 + 's'; document.body.appendChild(c); setTimeout(() => c.remove(), 4200); }
  }
  function finishDay() {
    const { u, d } = L; const up = U[u]; const dr = drawingOf(u, d);
    S.done[`${u}-${d}`] = today();
    if (dr) S.learned[dr.id] = S.learned[dr.id] || today();
    const dk = `${u}-${d}`; if (!S.stickers[dk] || !S.stickers[dk].thumb) S.stickers[dk] = { img: up.bg, thumb: L.thumb || '', name: `${up.title} ${d}일차 · ${dr ? dr.name : ''}`, date: today(), from: dr ? dr.name : '' };
    let unitSticker = false;
    if (doneCount(u) >= DAYS && !S.stickers[`${u}-x`]) { S.stickers[`${u}-x`] = { img: '🏆', name: `${up.thing} 완성`, date: today(), from: up.title }; unitSticker = true; }
    let nu = u, nd = d + 1; if (nd > DAYS) { nd = 1; nu = (u + 1) % U.length; }
    S.pos = { u: nu, d: nd, s: 0 };
    const bonus = Math.max(0, Math.min(DAY_BONUS, DAY_STAR_MAX - todayLog().stars));
    S.stars += bonus; L.earned += bonus; todayLog().stars += bonus;
    const lvUp = level() > L.levelBefore; S.level = level(); save();
    const newStamp = lvUp && C.stampUnlock[level()];
    render('reward', `<div class="screen"><div class="reward">
      <div class="friends">${Object.keys(C.family).map(id => famHtml(id)).join('')}</div>
      <div class="bubble">오늘 그림 그리기 끝! 정말 잘했어, ${esc(childName())}!<small>내일 또 만나요 👋</small></div>
      <div class="big-stars">⭐ +${L.earned}</div>
      ${bonus ? `<div class="muted" style="font-weight:800;margin-top:-10px">끝까지 한 보너스 ⭐${bonus} 포함</div>` : ''}
      ${lvUp ? `<div class="sticker-new">🏅</div><div class="bubble">레벨 ${level()}${lvJosa(level())} 됐어요!<small>배운 그림 ${level()}개${newStamp ? ` · 새 도장이 열렸어요: ${newStamp.map(id => C.stamps[id].name).join(', ')}` : ''}</small></div>` : ''}
      <div class="sticker-new">${stImg(S.stickers[dk], up.bg)}</div><div class="bubble">${esc(up.title)} ${d}일차 스티커를 받았어요!</div>
      ${unitSticker ? `<div class="sticker-new">🏆</div><div class="bubble">${esc(up.thing)} 완성! 단원 스티커도 받았어요 🏆</div>` : ''}
      <div class="home-links">
        <button class="btn" data-act="stickers">📒 스티커북</button>
        <button class="btn" data-act="gallery">🖼️ 윤이 미술관</button>
        <button class="btn primary" data-act="home">끝!</button>
      </div>
    </div></div>`, { home: homeScreen, stickers: () => stickerScreen(u), gallery: galleryScreen });
    confetti(); tone([523, 659, 784, 1046], 0.16);
    ko(`오늘 그림 그리기 끝! 정말 잘했어, ${childName()}. ${lvUp ? `레벨 ${level()}${lvJosa(level())} 됐어!` : ''} 스티커도 받았어! ${unitSticker ? `${up.thing} 완성!` : '내일 또 만나!'}`);
  }

  /* ================= 윤이 미술관 (AREQ-88·90): IndexedDB 그림 전시·크게 보기·그린 순서 보기·더 그리기·내보내기 ================= */
  const blobUrl = b => { const u = URL.createObjectURL(b); urlNew.push(u); return u; };
  const who = w => (w && C.family[w] ? `${C.family[w].name}에게 준 그림` : '');
  async function galleryScreen() {
    const list = await ST.all();
    render('gallery', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="home" aria-label="처음으로">🏠</button><h2 class="title">🖼️ ${esc(childName())} 미술관</h2><div class="spacer"></div><span class="muted">${list.length}장</span></div>
      ${list.length ? `<div class="frames">${list.map(w => `<button class="frame" data-act="open" data-arg="${w.id}"><img src="${blobUrl(w.thumb || w.png)}" alt=""><b>${esc(w.title)}</b><small>${esc(w.date)}${w.who ? ` · 💌 ${esc(C.family[w.who] ? C.family[w.who].name : '')}` : ''}</small>${w.who ? '<span class="ribbon">💌</span>' : ''}</button>`).join('')}</div>`
        : '<p class="muted">아직 그림이 없어요. 오늘 하기에서 그린 그림이 여기에 걸려요.</p>'}
    </div>`, { home: homeScreen, open: id => galleryDetail(+id) });
  }
  async function galleryDetail(id) {
    const w = await ST.get(id); if (!w) return galleryScreen();
    const ops = (() => { try { return JSON.parse(w.ops || '[]'); } catch (e) { return []; } })();
    render('gallery', `<div class="screen">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="미술관으로">⬅️</button><h2 class="title">🖼️ <span id="wTitle">${esc(w.title)}</span></h2><div class="spacer"></div><span class="muted">${esc(w.date)}</span></div>
      ${w.who ? `<div class="mcard">${famHtml(w.who, true)}<span class="mtext">${esc(who(w.who))}</span></div>` : ''}
      <div class="big-frame"><img id="bigImg" src="${blobUrl(w.png)}" alt=""><canvas id="replayCanvas" width="1024" height="1024" hidden></canvas></div>
      <div class="home-links">
        <button class="btn" data-act="replay">▶ 그린 순서 보기</button><button class="btn small" data-act="fast" id="fastBtn" hidden>⏩ 빨리</button>
        <button class="btn" data-act="more">✏️ 더 그리기</button>
        <button class="btn" data-act="share">📤 내보내기</button>
      </div>
      <div class="card code-row"><b>제목</b><input id="wTitleIn" value="${esc(w.title)}" maxlength="20"><button class="btn small primary" data-act="rename">바꾸기</button></div>
    </div>`, {
      back: galleryScreen,
      replay: async () => { hush(); if (replayer) replayer.stop(); const cv = document.getElementById('replayCanvas'); const img = document.getElementById('bigImg'); cv.hidden = false; img.hidden = true; document.getElementById('fastBtn').hidden = false; replayer = DR.replay(cv, ops, { stamps: C.stamps, drawings: D }, { duration: 7000 }); await replayer.done; document.getElementById('fastBtn').hidden = true; },
      fast: () => { if (replayer) replayer.faster(); },
      more: () => moreScreen(w, ops),
      share: async () => { const r = await ST.share(w); toast(r === 'shared' ? '보냈어요' : r === 'download' ? 'PNG로 저장했어요 (다운로드 폴더)' : '취소했어요'); },
      rename: async () => { const v = document.getElementById('wTitleIn').value.trim(); if (!v) return; w.title = v; await ST.put(w); document.getElementById('wTitle').textContent = v; toast('제목을 바꿨어요'); },
    });
    ko(`${w.title}. ${w.date.replace(/-/g, '월 ').replace(/^(\d+)월 /, '')}일에 그린 그림이야.`);
  }
  function moreScreen(w, ops) { // 미술관 그림을 다시 열어 더 그리기 (AREQ-88)
    const t = toolState(); t.tool = 'color';
    render('free', `<div class="screen lesson wide"><div class="topbar"><button class="icon-btn" data-act="back" aria-label="미술관으로">⬅️</button><h2 class="title">✏️ ${esc(w.title)}</h2><div class="spacer"></div><button class="btn small good" data-act="save">💾 저장</button></div>
      <div class="${studioClass()} coloring one"><div class="board-col"><div class="board-wrap"><div id="board" class="board-host"></div></div>${toolbarHtml('free', t)}</div></div></div>`, {
      ...toolHandlers(t, 'free', () => refreshTools('free', t)),
      back: () => galleryDetail(w.id),
      save: async () => { try { w.png = await board.toBlob('image/png'); w.thumb = await board.toBlob('image/png', 192); w.ops = JSON.stringify(ops); await ST.put(w); toast('저장했어요'); ding(); } catch (e) { toast('저장하지 못했어요'); } },
    });
    mountBoard(ops, t, {});
  }

  /* ================= 아빠 화면 공통: 암호(61)·통계(62)·탭(63) — 다섯 앱 같은 코드 (plan/0_COMMON_spec.md 5-1) ================= */
  const DEFAULT_PIN = '1234';
  const parentPin = () => String(S.settings.parentPin || DEFAULT_PIN);
  const PARENT_SCREENS = ['gate', 'pinreset', 'parent', 'rewardadmin', 'spec'];
  setInterval(() => { if (!document.hidden && screen && !PARENT_SCREENS.includes(screen)) { const l = todayLog(); l.app = (l.app || 0) + 10; save(); } }, 10000);
  const gateFocus = () => setTimeout(() => { const i = document.getElementById('ans'); if (i) { i.focus(); i.addEventListener('keydown', e => { if (e.key === 'Enter') H.ok(); }); } }, 50);
  function gateScreen(next) {
    render('gate', `<div class="screen"><div class="topbar"><button class="icon-btn" data-act="home">🏠</button></div>
      <div class="gate"><div class="card"><b>🔒 아빠 화면 암호</b><p class="muted">암호를 입력하세요</p>
      <input id="ans" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" aria-label="암호">
      <button class="btn primary" data-act="ok">확인</button>
      <button class="btn small" data-act="forgot">암호를 잊었어요</button></div></div></div>`, {
      home: homeScreen,
      ok: () => {
        const i = document.getElementById('ans');
        if (i && i.value.trim() && i.value.trim() === parentPin()) { pTab = 'summary'; const t = document.getElementById('toast'); if (t) t.classList.remove('show'); next(); }
        else { toast('암호가 달라요'); if (i) { i.value = ''; i.focus(); } }
      },
      forgot: () => pinResetScreen(next),
    });
    gateFocus();
  }
  function pinResetScreen(next) {
    const a = 12 + Math.floor(Math.random() * 28), b = 12 + Math.floor(Math.random() * 18);
    render('pinreset', `<div class="screen"><div class="topbar"><button class="icon-btn" data-act="home">🏠</button></div>
      <div class="gate"><div class="card"><b>암호 되돌리기 (어른 확인)</b><p class="muted">맞히면 암호가 ${DEFAULT_PIN}로 돌아가요</p>
      <div style="font-size:40px;font-weight:900">${a} × ${b} = ?</div>
      <input id="ans" inputmode="numeric" autocomplete="off"><button class="btn primary" data-act="ok">확인</button>
      <button class="btn small" data-act="back">암호 입력으로</button></div></div></div>`, {
      home: homeScreen, back: () => gateScreen(next),
      ok: () => {
        if (+document.getElementById('ans').value === a * b) { S.settings.parentPin = DEFAULT_PIN; save(); pTab = 'settings'; next(); toast(`암호를 ${DEFAULT_PIN}로 되돌렸어요. 새 암호로 바꿔 주세요`); }
        else { toast('다시 계산해 보세요'); pinResetScreen(next); }
      },
    });
    gateFocus();
  }
  const PTABS = [['summary', '📊', '요약'], ['stats', '📈', '통계'], ['reward', '🎁', '보상·별'], ['progress', '📚', '학습·진도'], ['settings', '⚙️', '설정'], ['manage', '🛠️', '백업·업데이트']];
  let pTab = 'summary';
  const ptabBar = () => `<nav class="ptabs" role="tablist" aria-label="아빠 화면 메뉴">${PTABS.map(([k, i, n]) => `<button class="ptab${pTab === k ? ' on' : ''}" role="tab" aria-selected="${pTab === k}" data-act="ptab" data-arg="${k}"><span aria-hidden="true">${i}</span>${n}</button>`).join('')}</nav>`;
  const ptabPanel = (k, html) => `<section class="ppanel" role="tabpanel" data-panel="${k}"${pTab === k ? '' : ' hidden'}>${html}</section>`;
  function ptabSwitch(k) {
    if (!PTABS.some(t => t[0] === k)) return; pTab = k;
    document.querySelectorAll('.ptab').forEach(b => { const on = b.dataset.arg === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    document.querySelectorAll('.ppanel').forEach(p => { p.hidden = p.dataset.panel !== k; });
    window.scrollTo(0, 0); ptabReveal(true);
  }
  function ptabReveal(smooth) { const on = document.querySelector('.ptab.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' }); }
  let statDays = 7;
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  function statRows(n) { const out = []; for (let i = 0; i < n; i++) { const d = addDays(-i); const l = S.log[d] || {}; out.push({ d, min: Math.round((l.sec || 0) / 60), app: l.app != null ? Math.round(l.app / 60) : null, stars: l.stars || 0, drawings: l.drawings || 0 }); } return out; }
  function statsCard() {
    const rows = statRows(statDays); const act = rows.filter(r => r.min > 0 || r.stars > 0); const td = today();
    const totMin = rows.reduce((s, r) => s + r.min, 0), totStar = rows.reduce((s, r) => s + r.stars, 0), maxStar = Math.max(0, ...rows.map(r => r.stars));
    const avg = act.length ? Math.round(totMin / act.length) : 0;
    const maxMin = Math.max(Number(S.settings.dailyLimit) || 20, ...rows.map(r => r.min), 1);
    const dl = d => { const x = new Date(d + 'T12:00:00'); return `${x.getMonth() + 1}/${x.getDate()} (${WD[x.getDay()]})`; };
    return `<div class="card" id="statsCard"><h3>📈 날짜별 학습 시간·얻은 별</h3>
      <div class="row stat-range">${[7, 14, 30].map(n => `<button class="btn small${statDays === n ? ' primary' : ''}" data-act="statdays" data-arg="${n}">최근 ${n}일</button>`).join('')}</div>
      <div class="kv" style="margin-top:12px"><div>학습한 날<b>${act.length}일</b></div><div>총 학습 시간<b>${totMin}분</b></div><div>하루 평균<b>${avg}분</b></div><div>얻은 별<b>${totStar}개</b></div><div>하루 최고 별<b>${maxStar}개</b></div></div>
      <ul class="stat-list">${rows.map(r => `<li class="stat-row${r.d === td ? ' today' : ''}${r.min || r.stars ? '' : ' empty'}" data-date="${r.d}"><span class="stat-date">${dl(r.d)}${r.d === td ? ' · 오늘' : ''}</span>
        <div class="stat-bars"><div class="stat-bar min"><i style="width:${Math.min(100, Math.round(r.min / maxMin * 100))}%"></i><b>⏱️ ${r.min}분</b>${r.app != null && r.app > r.min ? `<small>앱 켠 시간 ${r.app}분</small>` : ''}${r.drawings ? `<small>🖼️ ${r.drawings}장</small>` : ''}</div>
        <div class="stat-bar star"><i style="width:${Math.min(100, Math.round(r.stars / DAY_STAR_MAX * 100))}%"></i><b>⭐ ${r.stars}개</b></div></div></li>`).join('')}</ul>
      <p class="muted">학습 시간은 그리는 화면에 있던 시간이에요 (하루 시간 제한 ${esc(S.settings.dailyLimit)}분과 같은 기준). “앱 켠 시간”은 아빠 화면을 뺀 전체 시간이에요. 별은 그날 손풀기·따라 그리기·색칠·자유 그리기·하루 끝 보너스로 얻은 별이에요 (하루 최대 ${DAY_STAR_MAX}개, 아빠가 조정한 별은 빼요). 🖼️는 그날 미술관에 건 그림 수예요.</p></div>`;
  }
  function pinCard() {
    const isDef = parentPin() === DEFAULT_PIN;
    return `<div class="card" id="pinCard"><h3>🔒 아빠 화면 암호</h3>
      <p>${isDef ? `⚠️ 지금은 기본 암호(<b>${DEFAULT_PIN}</b>)예요. 윤이가 모르는 암호로 바꿔 주세요.` : '✅ 새 암호가 설정되어 있어요.'}</p>
      <div class="form"><label>새 암호 (숫자 4~8자리)<input id="pinNew" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></label>
        <label>새 암호 한 번 더<input id="pinNew2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="new-password"></label></div>
      <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn small primary" data-act="setpin">암호 바꾸기</button></div>
      <p class="muted">암호를 잊으면 암호 화면의 “암호를 잊었어요”에서 어른용 곱셈 문제를 풀어 ${DEFAULT_PIN}로 되돌릴 수 있어요. 전체 초기화를 해도 ${DEFAULT_PIN}로 돌아가요.</p></div>`;
  }
  function setPin() {
    const a = ((document.getElementById('pinNew') || {}).value || '').trim(), b = ((document.getElementById('pinNew2') || {}).value || '').trim();
    if (!/^\d{4,8}$/.test(a)) return toast('숫자 4~8자리로 적어주세요');
    if (a !== b) return toast('두 번 적은 암호가 달라요');
    S.settings.parentPin = a; save(); parentScreen(); toast('암호를 바꿨어요');
  }
  const parentCommonHandlers = () => ({ ptab: k => ptabSwitch(k), statdays: n => { statDays = +n || 7; parentScreen(); }, setpin: setPin });
  function restore(txt) {
    txt = String(txt || '').trim(); let o = null;
    try { o = JSON.parse(txt); } catch (e) { try { o = JSON.parse(decodeURIComponent(escape(atob(txt)))); } catch (e2) { o = null; } }
    if (!o || !o.pos) return false;
    const d = defaults(); S = Object.assign(d, o, { settings: Object.assign(d.settings, o.settings || {}) }); save(); return true;
  }
  /* 새 버전 확인·적용 (공통 23) */
  const verNum = v => String(v || '0').split('.').map(Number);
  const isNewer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
  let latestVer = null;
  async function checkUpdate() {
    const r = await fetch('app.js?check=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('fetch');
    const m = (await r.text()).match(/APP_VERSION = '([\d.]+)'/);
    latestVer = m ? m[1] : null; return latestVer;
  }
  async function applyUpdate() {
    toast('새 버전을 받는 중이에요…');
    const files = ['./', 'index.html', 'app.js', 'draw.js', 'store.js', 'content.js', 'style.css', 'sw.js', 'manifest.webmanifest', 'audio-ko/index.json', '기획서.md'];
    try { await Promise.all(files.map(u => fetch(encodeURI(u), { cache: 'reload' }).catch(() => {}))); } catch (e) { /* */ }
    try { if (navigator.serviceWorker) for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister(); } catch (e) { /* */ }
    try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* */ }
    location.replace(location.pathname + '?v=' + Date.now());
  }
  /* 기획·변경 기록 (공통 21): 앱 안의 기획서.md */
  function mdToHtml(md) {
    const inl = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
    const out = []; const lines = md.split('\n'); let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (l.startsWith('```')) { const buf = []; i++; while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]); i++; out.push(`<pre class="spec-code">${esc(buf.join('\n'))}</pre>`); continue; }
      if (/^#{1,3} /.test(l)) { const n = l.match(/^#+/)[0].length; out.push(`<h${n + 1}>${inl(l.replace(/^#+ /, ''))}</h${n + 1}>`); i++; continue; }
      if (l.startsWith('|')) {
        const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
        const cells = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const body = rows.filter((r, k) => k !== 1);
        out.push(`<div class="spec-table"><table>${body.map((r, k) => `<tr>${cells(r).map(c => k === 0 ? `<th>${inl(c)}</th>` : `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</table></div>`); continue;
      }
      if (/^(- |\d+\. )/.test(l)) {
        const ol = /^\d+\. /.test(l); const items = [];
        while (i < lines.length && /^(- |\d+\. )/.test(lines[i])) items.push(lines[i++].replace(/^(- |\d+\. )/, ''));
        out.push(`<${ol ? 'ol' : 'ul'} class="list">${items.map(x => `<li>${inl(x)}</li>`).join('')}</${ol ? 'ol' : 'ul'}>`); continue;
      }
      if (l.trim()) out.push(`<p>${inl(l)}</p>`);
      i++;
    }
    return out.join('');
  }
  /* 아빠: 받은 보상 관리 (공통 60) */
  function rewardAdminScreen() {
    const g = Math.max(0, S.stars - S.goalBase); const goal = Math.max(1, Number(S.settings.goalStars));
    const rows = S.rewards.map((r, i) => ({ r, i })).reverse();
    const row = ({ r, i }) => `<li class="rw-row${r.used ? ' rw-used' : ''}">
        <div class="rw-info"><b>${r.used ? '✅' : '🎁'} ${esc(r.text)}</b><small>${esc(r.date)} 받음 · 별 ${r.stars}개${r.used ? ` · ${esc(r.used)} 사용` : ''}</small></div>
        <button class="btn small rw-check${r.used ? ' on' : ''}" data-act="usedrw" data-arg="${i}" aria-pressed="${r.used ? 'true' : 'false'}">${r.used ? '✅ 사용완료 (취소하려면 누르기)' : '☐ 사용완료 체크'}</button>
        <button class="btn small" data-act="delrw" data-arg="${i}">삭제</button></li>`;
    render('rewardadmin', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="아빠 화면으로">⬅️</button><h2 class="title">🎁 받은 보상 관리</h2></div>
      <div class="card"><h3>지금 목표: ${esc(S.settings.goalText)}</h3>
        <div class="goal-bar"><i style="width:${Math.min(100, Math.round(g / goal * 100))}%"></i></div>
        <p class="muted">모은 별 ${Math.min(g, goal)} / ${goal}${g >= goal ? ' · 목표 달성! 보상을 주고 아래 버튼으로 기록해요' : ''}</p>
        <button class="btn small${g >= goal ? ' primary' : ''}" data-act="gave">🎁 보상 줬어요 (기록하고 목표 새로 시작)</button></div>
      <div class="card"><h3 id="rwHead">${rwHeadText()}</h3>
        ${rows.length ? `<ul class="rw-rows">${rows.map(row).join('')}</ul><p class="muted">보상을 실제로 쓰면 “사용완료 체크”를 눌러 주세요. 윤이의 보상 목록에도 사용완료로 보여요. 다시 누르면 취소돼요.</p>`
          : '<p class="muted">아직 기록된 보상이 없어요. 윤이에게 보상을 주면 위의 “🎁 보상 줬어요”를 눌러 기록하세요.</p>'}
      </div></div></div>`, {
      back: parentScreen,
      usedrw: i => { const r = S.rewards[+i]; if (!r) return; r.used = r.used ? null : today(); save(); const y = window.scrollY; rewardAdminScreen(); window.scrollTo(0, y); toast(r.used ? '사용완료로 표시했어요' : '사용 전으로 되돌렸어요'); },
      delrw: (i, btn) => { if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '한 번 더 누르면 삭제'; return; } S.rewards.splice(+i, 1); save(); const y = window.scrollY; rewardAdminScreen(); window.scrollTo(0, y); },
      gave: () => { S.rewards.push({ date: today(), text: S.settings.goalText, stars: Number(S.settings.goalStars) }); S.goalBase = S.stars; save(); toast('보상을 기록했어요. 새 목표를 시작해요!'); rewardAdminScreen(); },
    });
  }
  function specScreen() {
    render('spec', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="back" aria-label="아빠 화면으로">⬅️</button><h2 class="title">📋 기획·변경 기록</h2><div class="spacer"></div><span class="muted">v${APP_VERSION}</span></div>
      <div class="card spec" id="spec">불러오는 중…</div></div></div>`, { back: parentScreen });
    const show = md => { const el = document.getElementById('spec'); if (el) el.innerHTML = mdToHtml(md); };
    if (window.__SPEC_INLINE) return show(window.__SPEC_INLINE);
    fetch(encodeURI('기획서.md')).then(r => { if (!r.ok) throw 0; return r.text(); }).then(show)
      .catch(() => { const el = document.getElementById('spec'); if (el) el.textContent = '기획서.md 파일을 찾지 못했어요. 앱 폴더에 기획서.md가 있는지 확인해 주세요.'; });
  }
  function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function parentScreen() {
    const td = today(); const weekAgo = addDays(-6);
    const days7 = S.days.filter(d => d >= weekAgo).length;
    const learned7 = Object.values(S.learned).filter(d => d >= weekAgo).length;
    const weak = Object.entries(S.weak).filter(([id]) => D[id]).map(([id, w]) => `<li>${esc(D[id].name)} — 복습 ${w.n} / 3번${w.n < 3 ? ` (다음 복습 ${addDays(REVIEW_GAP[Math.min(w.n, 2)], w.date)})` : ''}</li>`).join('');
    const hints = U.map((up, i) => S.hints[i] ? `<li>${up.bg} ${esc(up.title)} — 힌트 ${S.hints[i]}번</li>` : '').join('');
    const min = Math.round(todayLog().sec / 60);
    const st = S.settings; const code = `${S.pos.u + 1}-${S.pos.d}-${S.pos.s + 1}`;
    const total = U.filter(x => !x.soon).length * DAYS;
    render('parent', `<div class="screen"><div class="parent">
      <div class="topbar"><button class="icon-btn" data-act="home">🏠</button><h2 class="title">아빠 화면</h2><div class="spacer"></div><button class="btn small" data-act="rewardadmin">🎁 보상</button><button class="btn small" data-act="spec">📋 기획·변경 기록</button><span class="muted">v${APP_VERSION}</span></div>
      ${ptabBar()}
      ${ptabPanel('summary', `
      <div class="card"><h3>이번 주 (최근 7일)</h3><div class="kv">
        <div>학습한 날<b>${days7}일</b></div><div>새로 배운 그림<b>${learned7}개</b></div><div>오늘 사용<b>${min}분</b></div><div>연속<b>${streak()}일</b></div>
      </div>
      <h3 style="margin-top:14px">힌트를 많이 쓴 그림 (손풀기 복습 대상)</h3>${weak ? `<ol class="list">${weak}</ol>` : '<p class="muted">아직 없어요</p>'}
      <h3 style="margin-top:14px">단원별 힌트 횟수</h3>${hints ? `<ul class="list">${hints}</ul>` : '<p class="muted">아직 없어요</p>'}</div>
      <div class="card"><h3>전체</h3><div class="kv">
        <div>누적 학습일<b>${S.days.length}일</b></div><div>레벨 (배운 그림)<b>${level()} / ${total}</b></div><div>별<b>${S.stars}개</b></div><div>스티커<b>${stickerCount()}장</b></div><div>미술관 그림<b id="pWorkCount">…</b></div><div>끝낸 일차<b>${Object.keys(S.done).length} / ${total}</b></div>
      </div></div>
      `)}
      ${ptabPanel('stats', `${statsCard()}`)}
      ${ptabPanel('reward', `
      <div class="card"><h3>🎁 받은 보상 관리</h3>
        <p>받은 보상 <b>${rwCount().n}개</b> · 아직 안 쓴 보상 <b>${rwCount().left}개</b> · 사용완료 ${rwCount().u}개</p>
        <button class="btn primary" data-act="rewardadmin">🎁 보상 목록 · 사용완료 체크</button>
      </div>
      <div class="card"><h3>별 조정</h3>
        <p>지금 별: <b style="font-size:24px">${S.stars}개</b> <span class="muted">(현재 목표에 모은 별 ${Math.max(0, S.stars - S.goalBase)}개 · 오늘 ${todayLog().stars}개 / 하루 최대 ${DAY_STAR_MAX}개)</span></p>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="star" data-arg="-10">−10</button><button class="btn small" data-act="star" data-arg="-1">−1</button><button class="btn small" data-act="star" data-arg="1">+1</button><button class="btn small" data-act="star" data-arg="10">+10</button></div>
        <div class="code-row" style="margin-top:10px"><input id="starSet" type="number" min="0" placeholder="개수"><button class="btn small primary" data-act="starset">이 개수로 맞추기</button></div>
      </div>
      `)}
      ${ptabPanel('progress', `
      <div class="card"><h3>진도 조정</h3>
        <p>지금 진도: <b>${esc(U[S.pos.u].title)} ${S.pos.d}일차 · ${STEPS[S.pos.s].name}</b> <span class="muted">(코드 ${code})</span></p>
        <div class="form">
          <label>단원<select id="adjU">${U.map((up, i) => `<option value="${i}"${S.pos.u === i ? ' selected' : ''}${up.soon ? ' disabled' : ''}>${i + 1}. ${esc(up.title)} (${doneCount(i)}/${DAYS}일)${up.soon ? ' — 준비 중' : ''}</option>`).join('')}</select></label>
          <label>일차<select id="adjD">${Array.from({ length: DAYS }, (_, i) => `<option value="${i + 1}"${S.pos.d === i + 1 ? ' selected' : ''}>${i + 1}일차</option>`).join('')}</select></label>
          <label>단계<select id="adjS">${STEPS.map((x, i) => `<option value="${i}"${S.pos.s === i ? ' selected' : ''}>${i + 1}. ${x.name}</option>`).join('')}</select></label>
          <label style="grid-template-columns:auto 1fr"><input type="checkbox" id="adjMark" style="width:24px;min-height:24px">앞 일차는 완료, 뒤 일차는 미완료로 맞추기 (배운 그림·스티커도 함께)</label>
        </div>
        <div class="row" style="margin-top:10px;flex-wrap:wrap"><button class="btn small primary" data-act="adjpos">이 진도로 바꾸기</button>
          <button class="btn small" data-act="resetprog" id="resetProgBtn">진도 초기화</button></div>
        <p class="muted">진도 초기화: 진도·완료한 날·배운 그림(레벨)·복습 기록을 처음으로 돌려요. 별·받은 보상·스티커·미술관 그림·설정은 그대로예요.</p>
      </div>
      <div class="card"><h3>배운 그림</h3><p>${U.filter(u => !u.soon).flatMap(u => u.days).map(id => `<span class="chip${S.learned[id] ? ' done' : ' off'}">${esc(D[id].name)}</span>`).join(' ')}</p><p class="muted">진하게 = 배웠어요(끝까지 따라 그림). 레벨 10마다 새 도장이 열려요 (10: 해·비눗방울, 20: 조개·번개).</p></div>
      <div class="card"><h3>🖼️ 윤이 미술관 · 스티커북</h3><p>그림 <b id="pWorkCount2">…</b>장 · 스티커 ${stickerCount()}장</p><div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="gallery">🖼️ 미술관 보기</button><button class="btn small" data-act="exportall">📤 그림 전체 내보내기 (PNG)</button><button class="btn small" data-act="stickers">📒 스티커북 보기</button></div>
        <p class="muted">그림은 이 기기의 IndexedDB(yuni-art-works)에 있어요. 백업 파일에는 진도만 들어가니, 그림은 “전체 내보내기”로 PNG를 따로 저장해 두세요.</p></div>
      `)}
      ${ptabPanel('settings', `
      <div class="card"><h3>설정</h3><div class="form">
        <label>아이 이름<input data-set="childName" value="${esc(st.childName)}"></label>
        <label>리딩 캐릭터<select data-set="leader">${C.leaders.map(l => `<option value="${l.id}"${st.leader === l.id ? ' selected' : ''}>${l.img} ${esc(l.name)}</option>`).join('')}</select></label>
        <label>캐릭터 이름 (비우면 기본)<input data-set="leaderName" value="${esc(st.leaderName || '')}" placeholder="${esc(leader().name)}"></label>
        <label>한국어 읽기<select data-set="koVoiceMode">${[['rec', '녹음 목소리 (추천)'], ['device', '기기 음성']].map(([v, n]) => `<option value="${v}"${(st.koVoiceMode || 'rec') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>한국어 목소리 (기기 음성)<select data-set="koVoice"><option value="">자동 (구글 음성 우선)</option>${koVoices().map(v => `<option value="${esc(v.voiceURI || v.name)}"${st.koVoice === (v.voiceURI || v.name) ? ' selected' : ''}>${esc(v.name)}${v.localService ? '' : ' (온라인)'}</option>`).join('')}</select></label>
        <label>한국어 말 속도<select data-set="koRate">${[['0.8', '천천히'], ['0.9', '보통 (추천)'], ['1', '빠르게']].map(([v, n]) => `<option value="${v}"${Number(st.koRate) === Number(v) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="kotest">🔈 한국어 들어보기</button><span class="muted">${koVoices().length ? `이 기기의 한국어 목소리 ${koVoices().length}개` : '⚠️ 한국어 목소리를 못 찾았어요. 아래 안내를 보세요'}</span></div>
        <label>따라 그리기 기본<select data-set="traceMode">${[['auto', '자동 (1~3단원·처음 그림은 겹쳐, 그 뒤는 보고)'], ['overlay', '항상 겹쳐 그리기'], ['look', '항상 보고 그리기']].map(([v, n]) => `<option value="${v}"${(st.traceMode || 'auto') === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>도구 막대 위치<select data-set="leftHand" data-bool="1">${[['false', '오른쪽 (오른손)'], ['true', '왼쪽 (왼손)']].map(([v, n]) => `<option value="${v}"${String(!!st.leftHand) === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>기본 선 굵기<select data-set="brush"><option value="0"${+st.brush === 0 ? ' selected' : ''}>가늘게</option><option value="1"${+st.brush === 1 ? ' selected' : ''}>보통</option><option value="2"${+st.brush === 2 ? ' selected' : ''}>굵게</option></select></label>
        <label>손바닥 무시 (펜을 쓸 때)<select data-set="palmReject" data-bool="1">${[['true', '켜기 (추천)'], ['false', '끄기']].map(([v, n]) => `<option value="${v}"${String(st.palmReject !== false) === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>하루 최대 시간(분)<input data-set="dailyLimit" type="number" min="5" max="120" value="${st.dailyLimit}"></label>
        <label>별 목표(개)<input data-set="goalStars" type="number" min="5" max="999" value="${st.goalStars}"></label>
        <label>목표 보상<input data-set="goalText" value="${esc(st.goalText)}"></label>
      </div>
      <div class="row" style="margin-top:12px;flex-wrap:wrap">
        <button class="btn small" data-act="unlock">오늘 시간 잠금 풀기</button>
        <button class="btn small" data-act="gave">🎁 보상 줬어요 (목표 새로 시작)</button>
        <button class="btn small" data-act="reset" id="resetBtn">전체 초기화 (별·보상·설정까지, 그림은 남아요)</button>
      </div></div>
      ${pinCard()}
      `)}
      ${ptabPanel('manage', `
      <div class="card"><h3>앱 업데이트</h3>
        <p>이 기기의 앱: <b>v${APP_VERSION}</b> <span id="verInfo" class="muted">${latestVer ? (isNewer(latestVer, APP_VERSION) ? `· 새 버전 v${latestVer}이 있어요!` : '· 최신 버전이에요') : ''}</span></p>
        <div class="row" style="flex-wrap:wrap"><button class="btn small" data-act="checkver">🔄 새 버전 확인</button>
          <button class="btn small primary" data-act="doupdate" id="updBtn"${latestVer && isNewer(latestVer, APP_VERSION) ? '' : ' hidden'}>⬇️ 지금 업데이트</button></div>
        <p class="muted">업데이트해도 진도·별·보상·그림·설정은 그대로 남아요. 인터넷이 연결돼 있어야 해요.</p>
      </div>
      <div class="card"><h3>진도 옮기기 (기기끼리 연동이 안 될 때)</h3>
        <p>이 기기의 현재 진도 코드: <b style="font-size:24px">${code}</b> <span class="muted">(단원-일차-단계)</span></p>
        <div class="code-row"><input id="pcode" placeholder="예: 3-2-1"><button class="btn small primary" data-act="setpos">이 진도로 맞추기</button></div>
        <p class="muted">별·스티커·레벨까지 모두 옮기려면 아래 백업 코드를 복사해 다른 기기의 같은 칸에 붙여넣고 “가져오기”를 누르세요. 그림(PNG)은 백업에 안 들어가요 → 📚 학습·진도 탭의 “그림 전체 내보내기”.</p>
        <textarea id="backup" placeholder="백업 코드"></textarea>
        <div class="row" style="margin-top:8px;flex-wrap:wrap"><button class="btn small" data-act="export">내보내기(복사)</button><button class="btn small" data-act="import">가져오기</button>
          <button class="btn small" data-act="savefile">💾 백업 파일 저장</button><label class="btn small" style="cursor:pointer">📂 백업 파일 불러오기<input type="file" id="loadFile" accept=".json,application/json,text/plain" hidden></label></div>
        <p class="muted">앱을 지웠다 다시 설치하기 전에는 “백업 파일 저장”과 “그림 전체 내보내기”를 꼭 눌러두세요.</p>
      </div>
      <div class="card"><h3>안내</h3><ul class="list">
        <li>그림·단원·미션 카드 수정은 <b>content.js</b>, 그림판 동작은 <b>draw.js</b>에서 해요. 고친 뒤 <b>sw.js</b>의 VERSION을 올리면 설치된 앱에 반영돼요.</li>
        <li>한국어가 잘 안 들리면: 태블릿 <b>설정 → 일반 → 글자 읽어주기(TTS) → 기본 엔진</b>을 <b>Google 음성 인식 및 합성</b>으로 바꾸고, 한국어 음성 데이터(고품질)를 설치한 뒤 앱을 다시 켜세요.</li>
        <li>불편한 점·개선 아이디어는 기획서의 “앞으로 할 일” 표에 적어주세요.</li>
      </ul></div>
      `)}
    </div></div>`, {
      ...parentCommonHandlers(),
      home: homeScreen, gallery: galleryScreen, stickers: () => stickerScreen(0),
      exportall: async () => { const n = await ST.exportAll(); toast(n ? `${n}장을 PNG로 저장했어요 (다운로드 폴더)` : '내보낼 그림이 없어요'); },
      setpos: () => { const p = parseCode(document.getElementById('pcode').value); if (!p) return toast('예: 3-2-1 처럼 적어주세요'); S.pos = p; save(); toast(`진도를 ${p.u + 1}-${p.d}-${p.s + 1}로 맞췄어요`); parentScreen(); },
      export: async () => { const c = exportCode(); const ta = document.getElementById('backup'); ta.value = c; ta.select(); try { await navigator.clipboard.writeText(c); toast('복사했어요. 다른 기기에 붙여넣으세요'); } catch (e) { toast('코드를 길게 눌러 복사하세요'); } },
      import: () => { if (restore(document.getElementById('backup').value)) { toast('가져왔어요!'); parentScreen(); } else toast('백업 코드가 올바르지 않아요'); },
      savefile: () => {
        try {
          const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `yuni-art-backup-${today()}.json`;
          document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
          toast('백업 파일을 저장했어요 (다운로드 폴더)');
        } catch (e) { toast('저장하지 못했어요. 내보내기(복사)를 이용하세요'); }
      },
      adjpos: () => {
        const u = +document.getElementById('adjU').value, d = +document.getElementById('adjD').value, sIdx = +document.getElementById('adjS').value;
        if (document.getElementById('adjMark').checked) {
          S.done = {}; S.learned = {};
          for (let ui = 0; ui < U.length; ui++) for (let di = 1; di <= DAYS; di++) if (ui < u || (ui === u && di < d)) { if (U[ui].soon) continue; S.done[`${ui}-${di}`] = today(); const dr = drawingOf(ui, di); if (dr) S.learned[dr.id] = today(); const k = `${ui}-${di}`; if (!S.stickers[k]) S.stickers[k] = { img: U[ui].bg, name: `${U[ui].title} ${di}일차`, date: today(), from: '아빠 화면 진도 조정' }; }
          for (let ui = 0; ui < u; ui++) if (!U[ui].soon && !S.stickers[`${ui}-x`]) S.stickers[`${ui}-x`] = { img: '🏆', name: `${U[ui].thing} 완성`, date: today(), from: '아빠 화면 진도 조정' };
          S.level = level();
        }
        S.pos = { u, d, s: sIdx }; save(); toast(`진도를 ${U[u].title} ${d}일차 · ${STEPS[sIdx].name}(으)로 바꿨어요`); parentScreen();
      },
      resetprog: (x, btn) => {
        if (!btn.dataset.sure) { btn.dataset.sure = 1; btn.textContent = '정말 진도 초기화? 한 번 더 누르기'; return; }
        S.pos = { u: 0, d: 1, s: 0 }; S.done = {}; S.learned = {}; S.weak = {}; S.hints = {}; S.level = 0; S.missionDone = {}; save(); toast('진도를 처음으로 돌렸어요'); parentScreen();
      },
      star: a => { S.stars = Math.max(0, S.stars + Number(a)); S.goalBase = Math.min(S.goalBase, S.stars); save(); parentScreen(); },
      starset: () => { const v = parseInt(document.getElementById('starSet').value, 10); if (!(v >= 0)) return toast('0 이상의 숫자를 적어주세요'); S.stars = v; S.goalBase = Math.min(S.goalBase, S.stars); save(); toast(`별을 ${v}개로 맞췄어요`); parentScreen(); },
      spec: specScreen, rewardadmin: rewardAdminScreen,
      checkver: async () => {
        const info = document.getElementById('verInfo'); if (info) info.textContent = '· 확인 중…';
        try {
          const v = await checkUpdate(); const nw = v && isNewer(v, APP_VERSION);
          if (info) info.textContent = nw ? `· 새 버전 v${v}이 있어요!` : `· 최신 버전이에요 (서버 v${v || '?'})`;
          const b = document.getElementById('updBtn'); if (b) b.hidden = !nw;
        } catch (e) { if (info) info.textContent = '· 확인하지 못했어요. 인터넷 연결을 확인해 주세요'; }
      },
      doupdate: applyUpdate,
      kotest: () => { hush(); ko('먼저 손풀기! 연한 선 위를 손가락으로 따라 그어 봐. 오늘 그림 그리기 끝! 정말 잘했어, 윤이.'); },
      unlock: () => { S.override = today(); save(); toast('오늘은 시간 제한 없이 할 수 있어요'); },
      gave: () => { S.rewards.push({ date: today(), text: S.settings.goalText, stars: Number(S.settings.goalStars) }); S.goalBase = S.stars; save(); toast('보상을 기록했어요. 새 목표를 시작해요!'); parentScreen(); },
      reset: (x, btn) => { if (btn.dataset.sure) { S = defaults(); save(); toast('초기화했어요'); homeScreen(); } else { btn.dataset.sure = 1; btn.textContent = '정말 초기화? 한 번 더 누르기'; } },
    });
    ptabReveal();
    ST.count().then(n => ['pWorkCount', 'pWorkCount2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = n; }));
    const lf = document.getElementById('loadFile');
    if (lf) lf.addEventListener('change', () => { const f = lf.files[0]; if (!f) return; f.text().then(txt => { if (restore(txt)) { toast('백업을 불러왔어요!'); parentScreen(); } else toast('백업 파일이 올바르지 않아요'); }); });
    document.querySelectorAll('[data-set]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.set; S.settings[k] = el.dataset.bool ? el.value === 'true' : el.type === 'number' ? Number(el.value) : el.value.trim(); if (k === 'brush') S.settings.brush = Number(el.value); save(); toast('저장했어요');
    }));
  }

  /* ================= 시작 ================= */
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* */ }
  document.addEventListener('visibilitychange', () => { if (document.hidden) hush(); });
  window.YUNI = { get state() { return S; }, get act() { return L && !L.intro ? L.acts[L.i] : null; }, get lesson() { return L; }, get board() { return board; }, get warm() { return warm; }, buildStep: s => buildStep(L.u, L.d, s), parseCode, level, screen: () => screen, click: a => H[a] && H[a](), store: ST, today }; // 테스트용
  homeScreen();
  setTimeout(() => { if (!/^https?:/.test(location.protocol) || window.__SPEC_INLINE || navigator.onLine === false) return;
    checkUpdate().then(v => { if (v && isNewer(v, APP_VERSION) && screen === 'home') toast(`새 버전 v${v}이 있어요. 아빠 화면에서 업데이트하세요`); }).catch(() => {}); }, 3000);
})();
