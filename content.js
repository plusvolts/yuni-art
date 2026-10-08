/* 윤이 미술 — 콘텐츠 (단원·그림·손풀기·가족 미션·칭찬·도장·리딩 캐릭터). 앱 로직은 app.js, 그림판은 draw.js
   모든 예제 그림은 직접 만든 SVG path (1024×1024 기준, 그림 파일 없음). 상용 캐릭터·남의 그림은 넣지 않아요 (기획서 3장). */
window.CONTENT = (() => {
  /* ---------- 리딩 캐릭터 (아빠 화면에서 고르기, AREQ-94) — 블록 앱과 같은 6종 ---------- */
  const leaders = [
    { id: 'dino', name: '디노', img: '🦖', color: '#4caf50' },
    { id: 'robot', name: '로보', img: '🤖', color: '#5c7cfa' },
    { id: 'car', name: '카봇', img: '🚗', color: '#ff7043' },
    { id: 'fairy', name: '핑핑', img: '🧚', color: '#ec407a' },
    { id: 'cat', name: '냐옹', img: '🐱', color: '#ffb300' },
    { id: 'fish', name: '물고기', img: '🐠', color: '#26c6da' },
  ];
  /* ---------- 가족 (공통 06: 은후는 나오지 않아요). 그림을 부탁하고 칭찬해요. 초록이는 이어 그리기 ---------- */
  const family = {
    mom: { name: '엄마', img: '👩', color: '#ec407a' },
    dad: { name: '아빠', img: '👨', color: '#5c7cfa' },
    grandpa: { name: '할아버지', img: '👴', color: '#8d6e63' },
    grandma: { name: '할머니', img: '👵', color: '#ab47bc' },
    imo: { name: '이모', img: '👩‍🦰', color: '#ff7043' },
    samchon: { name: '삼촌', img: '🧔', color: '#26a69a' },
    chorok: { name: '초록이', img: '👦', color: '#66bb6a', call: '형' },
  };

  /* ---------- path 도우미 (1024 기준) ---------- */
  const R = n => Math.round(n);
  const C = (cx, cy, r) => { cx = R(cx); cy = R(cy); r = R(r); return `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`; };
  const E = (cx, cy, rx, ry) => { cx = R(cx); cy = R(cy); rx = R(rx); ry = R(ry); return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0`; };
  const L = (...p) => { p = p.map(R); let s = `M${p[0]},${p[1]}`; for (let i = 2; i < p.length; i += 2) s += ` L${p[i]},${p[i + 1]}`; return s; };
  const P = (...p) => L(...p) + ' Z';
  const Q = (x1, y1, cx, cy, x2, y2) => `M${R(x1)},${R(y1)} Q${R(cx)},${R(cy)} ${R(x2)},${R(y2)}`;
  const smile = (cx, cy, w, h = w * 0.5) => Q(cx - w / 2, cy, cx, cy + h, cx + w / 2, cy);
  const frown = (cx, cy, w, h = w * 0.5) => Q(cx - w / 2, cy, cx, cy - h, cx + w / 2, cy);
  const eyes = (cx, cy, gap, r) => [C(cx - gap, cy, r), C(cx + gap, cy, r)];
  const wave = (x, y, n, w, h) => { let s = `M${x},${y} q${w / 2},${-h} ${w},0`; for (let i = 1; i < n; i++) s += ` t${w},0`; return s; };
  const zig = (x, y, n, w, h) => { const pts = [x, y]; for (let i = 1; i <= n; i++) pts.push(x + i * w, y + (i % 2 ? -h : 0)); return L(...pts); };
  const starP = (cx, cy, r) => { const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5; const rr = k % 2 ? r * 0.45 : r; pts.push(Math.round(cx + rr * Math.cos(a)), Math.round(cy + rr * Math.sin(a))); } return P(...pts); };
  const heart = (cx, cy, s) => `M${cx},${cy + s * 0.9} C${cx - s * 1.6},${cy - s * 0.2} ${cx - s * 0.6},${cy - s * 1.1} ${cx},${cy - s * 0.3} C${cx + s * 0.6},${cy - s * 1.1} ${cx + s * 1.6},${cy - s * 0.2} ${cx},${cy + s * 0.9} Z`;
  const rect = (x, y, w, h) => P(x, y, x + w, y, x + w, y + h, x, y + h);
  const tri = (cx, baseY, w, h) => P(cx - w / 2, baseY, cx, baseY - h, cx + w / 2, baseY);
  // 사람 그리기 공식 (AREQ-86): 동그라미 머리 + 감자 몸 + 선 팔다리
  const person = (cx, top, h, o = {}) => { // h: 머리 꼭대기~발까지 높이. 반환 { head, body, arms, legs, feet, face }
    const r = h * 0.11, headY = top + r, bodyTop = top + 2 * r, bodyH = h * 0.36, legH = h - 2 * r - bodyH;
    const bw = o.wide ? h * 0.16 : h * 0.12;
    return {
      head: C(cx, headY, r), body: E(cx, bodyTop + bodyH / 2, bw, bodyH / 2),
      arms: [Q(cx - bw * 0.8, bodyTop + bodyH * 0.25, cx - bw * 2.2, bodyTop + bodyH * 0.55, cx - bw * 2.1, bodyTop + bodyH * 0.95), Q(cx + bw * 0.8, bodyTop + bodyH * 0.25, cx + bw * 2.2, bodyTop + bodyH * 0.55, cx + bw * 2.1, bodyTop + bodyH * 0.95)],
      legs: [L(cx - bw * 0.45, bodyTop + bodyH, cx - bw * 0.6, top + h - 10), L(cx + bw * 0.45, bodyTop + bodyH, cx + bw * 0.6, top + h - 10)],
      feet: [E(cx - bw * 0.75, top + h - 8, bw * 0.55, 12), E(cx + bw * 0.75, top + h - 8, bw * 0.55, 12)],
      face: [...eyes(cx, headY - r * 0.1, r * 0.38, r * 0.1), smile(cx, headY + r * 0.35, r * 0.7, r * 0.3)],
      hair: `M${R(cx - r)},${R(headY - r * 0.1)} Q${R(cx - r * 0.8)},${R(headY - r * 1.25)} ${R(cx)},${R(headY - r * 1.05)} Q${R(cx + r * 0.8)},${R(headY - r * 1.25)} ${R(cx + r)},${R(headY - r * 0.1)}`,
      longHair: [L(cx - r, headY, cx - r * 1.1, headY + r * 2.6), L(cx + r, headY, cx + r * 1.1, headY + r * 2.6)],
      glasses: [C(cx - r * 0.4, headY - r * 0.05, r * 0.3), C(cx + r * 0.4, headY - r * 0.05, r * 0.3), L(cx - r * 0.1, headY - r * 0.05, cx + r * 0.1, headY - r * 0.05)],
      r, headY, bodyTop, bodyH, bw,
    };
  };

  /* ---------- 손풀기 모양 (AREQ-85): 굵은 연한 선 위에 따라 긋기 ---------- */
  const warmups = {
    hline: { name: '가로선', path: L(150, 512, 874, 512), say: '왼쪽에서 오른쪽으로 쭉, 가로선을 그어 봐.' },
    vline: { name: '세로선', path: L(512, 150, 512, 874), say: '위에서 아래로 쭉, 세로선을 그어 봐.' },
    slant: { name: '비스듬한 선', path: L(200, 820, 824, 204), say: '아래에서 위로 비스듬하게 그어 봐.' },
    circle: { name: '동그라미', path: C(512, 512, 300), say: '크게 동그라미를 그려 봐. 시작한 곳으로 돌아와.' },
    tri: { name: '세모', path: tri(512, 800, 600, 560), say: '세모를 그려 봐. 꼭짓점이 세 개.' },
    square: { name: '네모', path: rect(232, 232, 560, 560), say: '네모를 그려 봐. 모서리가 네 개.' },
    wave: { name: '물결', path: wave(120, 512, 4, 196, 150), say: '물결을 그려 봐. 위로 아래로 출렁출렁.' },
    zigzag: { name: '지그재그', path: zig(120, 660, 6, 130, 300), say: '지그재그를 그려 봐. 올라갔다 내려갔다.' },
    spiral: { name: '나선', path: 'M512,512 m0,0 a40,40 0 1,1 80,0 a80,80 0 1,1 -160,0 a120,120 0 1,1 240,0 a160,160 0 1,1 -320,0 a200,200 0 1,1 400,0 a240,240 0 1,1 -480,0', say: '가운데에서 시작해서 빙글빙글 커지는 나선을 그려 봐.' },
    heart: { name: '하트', path: heart(512, 540, 260), say: '하트를 그려 봐. 위는 둥글게, 아래는 뾰족하게.' },
    arc: { name: '무지개 선', path: 'M160,760 A352,352 0 0,1 864,760', say: '무지개처럼 둥근 선을 그려 봐.' },
    loops: { name: '동글동글', path: 'M120,560 c0,-120 160,-120 160,0 s160,120 160,0 s160,-120 160,0 s160,120 160,0 s160,-120 160,0', say: '동글동글 이어서 그려 봐.' },
  };

  /* ---------- 그림 30개 (AREQ-81·82·86): steps[].paths·say, formula, colors ---------- */
  const D = {};
  const def = (id, o) => { D[id] = Object.assign({ id, mode: 'overlay' }, o); };

  /* === 1단원 선과 모양 === */
  def('lines', { name: '선 놀이', unit: 0, day: 1, formula: '가로선 + 세로선 + 비스듬한 선 + 물결 + 지그재그', colors: ['#ff6f91', '#4fc3f7', '#ffd54f'],
    steps: [
      { paths: [L(150, 200, 874, 200)], say: '맨 위에 왼쪽에서 오른쪽으로 쭉, 가로선을 그려요.' },
      { paths: [L(300, 300, 300, 820), L(724, 300, 724, 820)], say: '양쪽에 위에서 아래로 쭉, 세로선 두 개를 그려요.' },
      { paths: [L(380, 380, 644, 480), L(380, 480, 644, 380)], say: '가운데에 비스듬한 선 두 개를 엇갈려 그려요.' },
      { paths: [wave(300, 560, 4, 106, 70)], say: '그 아래에 물결을 그려요. 위로 아래로 출렁출렁.' },
      { paths: [zig(300, 760, 8, 53, 80)], say: '맨 아래에 지그재그를 그려요. 산처럼 올라갔다 내려갔다. 다 됐어!' },
    ] });
  def('snowman', { name: '동그라미 눈사람', unit: 0, day: 2, formula: '큰 동그라미 + 작은 동그라미 + 점 동그라미', colors: ['#4fc3f7', '#ff8a65', '#1f2a44'],
    steps: [
      { paths: [C(512, 700, 200)], say: '아래에 큰 동그라미를 그려요. 눈사람 몸이에요.' },
      { paths: [C(512, 380, 130)], say: '위에 조금 작은 동그라미를 붙여요. 머리예요.' },
      { paths: eyes(512, 350, 47, 14), say: '작은 동그라미 두 개, 눈이에요.' },
      { paths: [C(512, 640, 16), C(512, 720, 16), C(512, 800, 16)], say: '몸에 단추 동그라미 세 개.' },
      { paths: [P(512, 385, 512, 415, 590, 400), smile(512, 440, 100, 40)], say: '세모 당근 코와 웃는 입을 그려요. 다 됐어!' },
    ] });
  def('mountain', { name: '세모 산', unit: 0, day: 3, formula: '큰 세모 + 작은 세모 + 지그재그 눈 + 동그라미 해', colors: ['#66bb6a', '#8d6e63', '#ffd54f'],
    steps: [
      { paths: [tri(512, 820, 784, 560)], say: '큰 세모를 그려요. 산이에요.' },
      { paths: [tri(300, 820, 480, 300)], say: '앞에 작은 세모 산을 하나 더 그려요.' },
      { paths: [L(428, 380, 470, 420, 512, 380, 554, 420, 596, 380)], say: '산 꼭대기에 지그재그로 눈을 그려요.' },
      { paths: [C(820, 200, 70)], say: '하늘에 동그라미 해를 그려요.' },
      { paths: ['M150,300 q30,-30 60,0 q30,-30 60,0', 'M260,220 q25,-25 50,0 q25,-25 50,0'], say: '하늘에 날아가는 새를 그려요. 다 됐어!' },
    ] });
  def('house', { name: '네모 집', unit: 0, day: 4, formula: '네모 + 세모 지붕 + 작은 네모 문·창문', colors: ['#ff8a65', '#ffd54f', '#4fc3f7'],
    steps: [
      { paths: [rect(262, 480, 500, 400)], say: '네모를 그려요. 집 몸이에요.' },
      { paths: [tri(512, 480, 600, 260)], say: '위에 세모 지붕을 얹어요.' },
      { paths: [L(452, 880, 452, 700, 572, 700, 572, 880)], say: '가운데에 작은 네모 문을 그려요.' },
      { paths: [rect(312, 560, 100, 100), rect(612, 560, 100, 100)], say: '양쪽에 네모 창문 두 개.' },
      { paths: [L(640, 331, 640, 250, 700, 250, 700, 383), C(670, 200, 25), C(700, 140, 32)], say: '굴뚝과 동그라미 연기를 그려요. 다 됐어!' },
    ] });
  def('village', { name: '모양 마을', unit: 0, day: 5, formula: '해·집·산·나무·길 — 배운 모양 모아서 한 장면', colors: ['#ffd54f', '#ff8a65', '#66bb6a', '#4fc3f7'],
    steps: [
      { paths: [L(80, 800, 944, 800), C(850, 180, 70)], say: '땅 선을 길게 긋고, 하늘에 동그라미 해를 그려요.' },
      { paths: [rect(200, 560, 240, 240), tri(320, 560, 280, 140)], say: '네모 집과 세모 지붕을 그려요.' },
      { paths: [tri(700, 800, 480, 320)], say: '옆에 큰 세모 산을 그려요.' },
      { paths: [rect(560, 700, 40, 100), C(580, 640, 70)], say: '기둥 네모와 동그라미 잎, 나무예요.' },
      { paths: [wave(80, 900, 4, 216, 40)], say: '아래에 물결 길을 그려요.' },
      { paths: [C(180, 260, 40), C(240, 240, 55), C(300, 265, 40)], say: '동그라미 세 개로 구름을 그려요. 모양 마을 완성!' },
    ] });

  /* === 2단원 물고기·바다생물 === */
  def('fish', { name: '물고기', unit: 1, day: 1, formula: '길쭉한 동그라미 몸 + 세모 꼬리 + 작은 동그라미 눈', colors: ['#ffb400', '#ff6f91', '#4fc3f7'],
    steps: [
      { paths: [E(500, 512, 300, 200)], say: '먼저 옆으로 길쭉한 동그라미를 그려요. 물고기 몸이에요.' },
      { paths: [P(800, 512, 950, 392, 950, 632)], say: '오른쪽에 세모를 붙여요. 꼬리예요.' },
      { paths: [C(355, 470, 25)], say: '왼쪽에 작은 동그라미, 눈이에요.' },
      { paths: [smile(510, 560, 120, 40)], say: '웃는 입을 그려요.' },
      { paths: [L(440, 330, 520, 230, 600, 322), L(460, 700, 520, 790, 600, 700)], say: '위아래에 지느러미를 그려요. 다 됐어!' },
    ] });
  def('octopus', { name: '문어', unit: 1, day: 2, formula: '동그라미 머리 + 구불구불 다리 네 개', colors: ['#ab47bc', '#ff6f91', '#4fc3f7'],
    steps: [
      { paths: [C(512, 400, 200)], say: '큰 동그라미를 그려요. 문어 머리예요.' },
      { paths: eyes(512, 400, 72, 25), say: '동그라미 눈 두 개.' },
      { paths: [smile(512, 480, 80, 30)], say: '웃는 입을 그려요.' },
      { paths: ['M360,560 Q260,720 320,860', 'M460,580 Q420,740 440,880'], say: '왼쪽에 구불구불 다리 두 개를 내려요.' },
      { paths: ['M564,580 Q604,740 584,880', 'M664,560 Q764,720 704,860'], say: '오른쪽에도 다리 두 개.' },
      { paths: [C(800, 200, 18), C(840, 150, 25), C(790, 100, 14)], say: '물방울 동그라미를 그려요. 다 됐어!' },
    ] });
  def('turtle', { name: '거북이', unit: 1, day: 3, formula: '반 동그라미 등딱지 + 동그라미 머리 + 작은 동그라미 발', colors: ['#66bb6a', '#8d6e63', '#ffd54f'],
    steps: [
      { paths: ['M212,560 a300,240 0 0,1 600,0', L(212, 560, 812, 560)], say: '반 동그라미를 그리고 아래를 선으로 막아요. 등딱지예요.' },
      { paths: [C(880, 540, 70)], say: '오른쪽에 동그라미 머리를 붙여요.' },
      { paths: [E(330, 620, 60, 35), E(690, 620, 60, 35)], say: '아래에 작은 동그라미 발 두 개.' },
      { paths: [L(362, 560, 412, 420, 612, 420, 662, 560), L(412, 420, 462, 340, 562, 340, 612, 420)], say: '등딱지에 무늬 선을 그려요.' },
      { paths: [C(900, 520, 10), smile(890, 565, 40, 15)], say: '눈과 웃는 입을 그려요. 다 됐어!' },
    ] });
  def('crab', { name: '게', unit: 1, day: 4, formula: '길쭉한 동그라미 몸 + 선 다리 + 동그라미 집게', colors: ['#ff8a65', '#ff6f91', '#ffd54f'],
    steps: [
      { paths: [E(512, 560, 240, 160)], say: '옆으로 길쭉한 동그라미, 게 몸이에요.' },
      { paths: [L(440, 420, 420, 330), C(420, 305, 25), L(584, 420, 604, 330), C(604, 305, 25)], say: '위로 선 두 개를 올리고 끝에 동그라미 눈을 그려요.' },
      { paths: [L(290, 520, 180, 460), L(280, 580, 160, 580), L(300, 640, 190, 720)], say: '왼쪽에 다리 세 개.' },
      { paths: [L(734, 520, 844, 460), L(744, 580, 864, 580), L(724, 640, 834, 720)], say: '오른쪽에도 다리 세 개.' },
      { paths: [L(330, 430, 220, 360), C(180, 330, 55), L(694, 430, 804, 360), C(844, 330, 55)], say: '위쪽에 팔을 올리고 동그라미 집게를 그려요.' },
      { paths: [smile(512, 600, 90, 30)], say: '웃는 입을 그려요. 다 됐어!' },
    ] });
  def('sea', { name: '바다 속', unit: 1, day: 5, formula: '물결 + 물고기 여러 마리 + 해초 + 물방울', colors: ['#4fc3f7', '#ffb400', '#66bb6a', '#ff6f91'],
    steps: [
      { paths: [wave(80, 220, 4, 216, 50), L(80, 860, 944, 860)], say: '위에 물결, 아래에 모래 선을 그려요.' },
      { paths: [E(300, 450, 100, 60), P(400, 450, 470, 400, 470, 500), C(250, 440, 10)], say: '물고기 한 마리. 길쭉한 동그라미, 세모 꼬리, 눈.' },
      { paths: [E(650, 600, 100, 60), P(550, 600, 480, 550, 480, 650), C(700, 590, 10)], say: '반대쪽을 보는 물고기 한 마리 더.' },
      { paths: ['M200,860 q40,-80 0,-160 q-40,-80 0,-160', 'M800,860 q-40,-80 0,-160 q40,-80 0,-160'], say: '모래에서 올라오는 구불구불 해초 두 개.' },
      { paths: [C(500, 320, 15), C(530, 280, 20), C(560, 240, 25)], say: '물방울 동그라미를 그려요.' },
      { paths: [starP(420, 800, 50)], say: '모래 위에 별 모양 불가사리. 바다 속 완성!' },
    ] });

  /* === 3단원 곤충 === */
  def('ladybug', { name: '무당벌레', unit: 2, day: 1, formula: '동그라미 몸 + 작은 동그라미 머리 + 점 동그라미 + 선 다리', colors: ['#ef5350', '#1f2a44', '#ffd54f'],
    steps: [
      { paths: [C(512, 560, 250)], say: '큰 동그라미를 그려요. 무당벌레 몸이에요.' },
      { paths: [C(512, 300, 80)], say: '위에 작은 동그라미 머리.' },
      { paths: [L(512, 310, 512, 810)], say: '몸 한가운데에 세로선을 그려요.' },
      { paths: [C(420, 480, 30), C(600, 470, 30), C(380, 620, 28), C(640, 630, 28), C(480, 720, 25), C(560, 730, 25)], say: '점 동그라미 여섯 개를 찍어요.' },
      { paths: [L(270, 500, 180, 440), L(262, 580, 160, 600), L(290, 660, 200, 740), L(754, 500, 844, 440), L(762, 580, 864, 600), L(734, 660, 824, 740)], say: '양쪽에 다리 세 개씩.' },
      { paths: [L(470, 230, 440, 160), L(554, 230, 584, 160), ...eyes(512, 290, 32, 12)], say: '더듬이와 눈을 그려요. 다 됐어!' },
    ] });
  def('butterfly', { name: '나비', unit: 2, day: 2, formula: '길쭉한 동그라미 몸 + 큰 날개 둘 + 작은 날개 둘', colors: ['#ff6f91', '#ffd54f', '#ab47bc', '#4fc3f7'],
    steps: [
      { paths: [E(512, 560, 30, 200), C(512, 320, 45)], say: '가운데에 길쭉한 동그라미 몸과 동그라미 머리를 그려요.' },
      { paths: ['M490,285 Q450,200 420,180', 'M534,285 Q574,200 604,180'], say: '머리 위에 더듬이 두 개.' },
      { paths: ['M482,420 Q220,200 200,420 Q190,560 480,540', 'M542,420 Q804,200 824,420 Q834,560 544,540'], say: '위쪽에 큰 날개를 양쪽으로 펼쳐요.' },
      { paths: ['M482,560 Q260,560 260,720 Q280,860 484,700', 'M542,560 Q764,560 764,720 Q744,860 540,700'], say: '아래쪽에 작은 날개 두 개.' },
      { paths: [C(330, 420, 30), C(694, 420, 30), C(360, 700, 22), C(664, 700, 22)], say: '날개에 동그라미 무늬를 그려요. 다 됐어!' },
    ] });
  def('ant', { name: '개미', unit: 2, day: 3, formula: '동그라미 세 개(머리·가슴·배) + 선 다리 여섯', colors: ['#8d6e63', '#1f2a44', '#ffd54f'],
    steps: [
      { paths: [C(260, 520, 90), C(430, 520, 70), E(650, 520, 150, 110)], say: '동그라미 머리, 조금 작은 가슴, 길쭉한 배를 나란히 그려요.' },
      { paths: [L(400, 580, 340, 700), L(440, 590, 440, 720), L(480, 580, 540, 700)], say: '가슴 아래로 다리 세 개.' },
      { paths: [L(400, 470, 350, 380), L(460, 460, 480, 370), L(360, 560, 300, 640)], say: '위로도 다리를 그려요. 개미 다리는 여섯 개!' },
      { paths: [L(220, 440, 170, 350), L(300, 440, 330, 350)], say: '머리에 더듬이 두 개.' },
      { paths: [C(230, 500, 12), smile(250, 560, 40, 15)], say: '눈과 웃는 입을 그려요. 다 됐어!' },
    ] });
  def('bee', { name: '꿀벌', unit: 2, day: 4, formula: '길쭉한 동그라미 몸 + 동그라미 머리 + 줄무늬 선 + 동그라미 날개', colors: ['#ffd54f', '#1f2a44', '#4fc3f7'],
    steps: [
      { paths: [E(512, 560, 240, 160)], say: '옆으로 길쭉한 동그라미 몸을 그려요.' },
      { paths: [C(260, 560, 100)], say: '왼쪽에 동그라미 머리를 붙여요.' },
      { paths: [Q(440, 410, 420, 560, 440, 710), Q(540, 400, 530, 560, 540, 720), Q(640, 420, 650, 560, 640, 700)], say: '몸에 줄무늬 세 줄.' },
      { paths: [E(450, 330, 120, 70), E(640, 340, 110, 60)], say: '위에 동그라미 날개 두 개.' },
      { paths: [L(230, 470, 190, 390), L(290, 470, 330, 390), P(752, 560, 830, 540, 830, 580)], say: '더듬이와 뒤에 작은 세모 침.' },
      { paths: [C(230, 540, 14), smile(250, 600, 50, 20)], say: '눈과 웃는 입을 그려요. 다 됐어!' },
    ] });
  def('garden', { name: '꽃밭 친구들', unit: 2, day: 5, formula: '꽃(동그라미 + 꽃잎) + 나비 + 무당벌레 + 해', colors: ['#ff6f91', '#ffd54f', '#66bb6a', '#ef5350'],
    steps: [
      { paths: [L(80, 860, 944, 860), C(850, 170, 65)], say: '땅 선과 해를 그려요.' },
      { paths: [L(300, 860, 300, 560), C(300, 500, 60), C(300, 410, 42), C(390, 500, 42), C(210, 500, 42), C(300, 590, 42)], say: '줄기 선, 동그라미, 둘레에 꽃잎 동그라미 네 개. 꽃이에요.' },
      { paths: [L(700, 860, 700, 620), C(700, 560, 50), C(700, 485, 36), C(775, 560, 36), C(625, 560, 36), C(700, 635, 36)], say: '옆에 조금 작은 꽃 하나 더.' },
      { paths: [E(520, 330, 16, 60), 'M506,300 Q420,230 420,330 Q430,380 504,360', 'M534,300 Q620,230 620,330 Q610,380 536,360'], say: '하늘에 작은 나비. 몸과 날개 두 개.' },
      { paths: [C(500, 760, 55), L(500, 705, 500, 815), C(480, 740, 8), C(520, 775, 8)], say: '땅에 작은 무당벌레.' },
      { paths: ['M80,620 q50,-60 100,0', 'M860,700 q50,-60 100,0'], say: '풀 몇 포기를 그려요. 꽃밭 완성!' },
    ] });

  /* === 4단원 얼굴과 표정 (AREQ-86) === */
  def('face', { name: '웃는 얼굴', unit: 3, day: 1, mode: 'look', formula: '동그라미 + 십자 보조선 + 눈·코·입 자리', colors: ['#ffcc80', '#8d6e63', '#ff6f91'],
    steps: [
      { paths: [C(512, 512, 320)], say: '큰 동그라미를 그려요. 얼굴이에요.' },
      { paths: [L(512, 192, 512, 832), L(192, 512, 832, 512)], say: '가운데에 십자 보조선을 살짝 그려요. 눈·코·입 자리를 잡아 줘요.' },
      { paths: eyes(512, 460, 112, 30), say: '가로선 바로 위에 동그라미 눈 두 개.' },
      { paths: [L(512, 500, 490, 590, 535, 590)], say: '세로선 아래쪽에 작은 코.' },
      { paths: [smile(512, 660, 260, 110)], say: '코 아래에 크게 웃는 입.' },
      { paths: [E(192, 512, 30, 60), E(832, 512, 30, 60)], say: '양옆에 귀를 그려요. 다 됐어!' },
    ] });
  def('faces4', { name: '표정 네 가지', unit: 3, day: 2, mode: 'look', formula: '같은 동그라미 얼굴에 눈·입만 바꾸면 표정이 바뀌어요', colors: ['#ffcc80', '#ff6f91', '#4fc3f7'],
    steps: [
      { paths: [C(300, 300, 170), C(724, 300, 170), C(300, 724, 170), C(724, 724, 170)], say: '동그라미 네 개를 그려요. 얼굴 네 개예요.' },
      { paths: [...eyes(300, 270, 55, 18), smile(300, 340, 130, 55)], say: '첫 얼굴은 기쁜 얼굴. 눈 두 개와 크게 웃는 입.' },
      { paths: [...eyes(724, 270, 55, 30), C(724, 370, 35)], say: '둘째는 놀란 얼굴. 눈을 크게, 입은 동그라미.' },
      { paths: [...eyes(300, 700, 55, 18), frown(300, 790, 110, 45), L(240, 650, 270, 670), L(360, 650, 330, 670)], say: '셋째는 슬픈 얼굴. 입이 아래로, 눈썹도 처져요.' },
      { paths: [...eyes(724, 700, 55, 18), L(724 - 72, 650, 724 - 24, 675), L(724 + 72, 650, 724 + 24, 675), L(680, 790, 768, 790)], say: '넷째는 화난 얼굴. 눈썹이 가운데로 내려오고 입은 쭉 선. 다 됐어!' },
    ] });
  def('hair', { name: '머리 모양과 귀', unit: 3, day: 3, mode: 'look', formula: '동그라미 얼굴 + 둥근 머리 선 + 지그재그 앞머리 + 귀', colors: ['#ffcc80', '#5d4037', '#ff6f91'],
    steps: [
      { paths: [C(512, 540, 280)], say: '동그라미 얼굴을 그려요.' },
      { paths: [E(232, 540, 30, 60), E(792, 540, 30, 60)], say: '양옆에 귀 두 개.' },
      { paths: ['M232,520 Q260,250 512,240 Q764,250 792,520'], say: '머리 위를 둥글게 덮는 선, 머리카락이에요.' },
      { paths: [zig(262, 430, 10, 50, 70)], say: '지그재그로 앞머리를 그려요.' },
      { paths: [...eyes(512, 540, 100, 25), L(512, 580, 495, 650, 530, 650), smile(512, 710, 200, 80)], say: '눈·코·입을 그려요. 다 됐어!' },
    ] });
  def('glasses', { name: '안경과 모자', unit: 3, day: 4, mode: 'look', formula: '동그라미 얼굴 + 동그라미 안경 + 네모 모자', colors: ['#ffcc80', '#4fc3f7', '#ef5350'],
    steps: [
      { paths: [C(512, 560, 260)], say: '동그라미 얼굴을 그려요.' },
      { paths: [C(430, 540, 70), C(594, 540, 70), L(500, 540, 524, 540)], say: '동그라미 두 개와 가운데 짧은 선, 안경이에요.' },
      { paths: [L(360, 540, 252, 530), L(664, 540, 772, 530)], say: '안경 다리를 귀 쪽으로 그려요.' },
      { paths: [L(222, 320, 802, 320), L(312, 320, 312, 160, 712, 160, 712, 320)], say: '머리 위에 긴 선과 네모, 모자예요.' },
      { paths: [C(430, 540, 12), C(594, 540, 12), L(512, 600, 495, 660, 530, 660), smile(512, 720, 180, 70)], say: '안경 속 눈, 코, 웃는 입. 다 됐어!' },
    ] });
  def('me', { name: '내 얼굴', unit: 3, day: 5, mode: 'look', formula: '얼굴 + 목 + 어깨 — 배운 것 모아서', colors: ['#ffcc80', '#5d4037', '#4fc3f7', '#ff6f91'],
    steps: [
      { paths: [C(512, 420, 240)], say: '동그라미 얼굴을 위쪽에 그려요.' },
      { paths: [L(452, 650, 452, 740), L(572, 650, 572, 740)], say: '얼굴 아래에 목, 세로선 두 개.' },
      { paths: ['M452,740 Q200,760 160,900', 'M572,740 Q824,760 864,900', L(160, 900, 864, 900)], say: '목에서 양쪽으로 어깨를 둥글게 내려요.' },
      { paths: ['M272,400 Q300,170 512,160 Q724,170 752,400', zig(300, 320, 8, 53, 60)], say: '머리카락을 그려요. 윤이 머리처럼!' },
      { paths: [E(272, 430, 28, 50), E(752, 430, 28, 50)], say: '귀 두 개.' },
      { paths: [...eyes(512, 420, 90, 24), L(512, 460, 498, 520, 528, 520), smile(512, 580, 170, 70)], say: '눈·코·입을 그려요. 내 얼굴 완성!' },
    ] });

  /* === 5단원 사람 몸 (AREQ-86) === */
  def('stick', { name: '막대 사람', unit: 4, day: 1, mode: 'look', formula: '동그라미 머리 + 선 몸 + 선 팔다리 + 동그라미 손발', colors: ['#ffcc80', '#4fc3f7', '#ff6f91'],
    steps: [
      { paths: [C(512, 220, 100)], say: '위에 동그라미 머리.' },
      { paths: [L(512, 320, 512, 640)], say: '아래로 긴 선, 몸이에요.' },
      { paths: [L(512, 400, 350, 540), L(512, 400, 674, 540)], say: '몸 위쪽에서 양쪽으로 팔 선 두 개.' },
      { paths: [L(512, 640, 400, 880), L(512, 640, 624, 880)], say: '몸 아래에서 다리 선 두 개.' },
      { paths: [C(350, 560, 22), C(674, 560, 22), C(400, 900, 22), C(624, 900, 22), ...eyes(512, 210, 35, 10), smile(512, 250, 60, 25)], say: '손발 동그라미와 얼굴을 그려요. 다 됐어!' },
    ] });
  def('potato', { name: '감자 사람', unit: 4, day: 2, mode: 'look', formula: '동그라미 머리 + 감자 모양 몸 + 둥근 팔 + 선 다리', colors: ['#ffcc80', '#66bb6a', '#4fc3f7'],
    steps: [
      { paths: [C(512, 220, 100)], say: '동그라미 머리를 그려요.' },
      { paths: [E(512, 500, 130, 190)], say: '머리 아래에 길쭉한 감자 모양 몸.' },
      { paths: ['M400,420 Q300,520 260,620', 'M624,420 Q724,520 764,620'], say: '몸 양쪽에서 둥글게 내려오는 팔.' },
      { paths: [L(460, 680, 430, 900), L(564, 680, 594, 900)], say: '몸 아래로 다리 두 개.' },
      { paths: [C(260, 650, 30), C(764, 650, 30), E(420, 910, 50, 20), E(604, 910, 50, 20)], say: '손 동그라미, 발 길쭉 동그라미.' },
      { paths: [...eyes(512, 210, 35, 10), smile(512, 250, 60, 25)], say: '얼굴을 그려요. 다 됐어!' },
    ] });
  def('dressed', { name: '옷 입은 사람', unit: 4, day: 3, mode: 'look', formula: '머리 + 네모 윗옷 + 네모 바지 + 팔다리', colors: ['#ffcc80', '#ef5350', '#4fc3f7', '#5d4037'],
    steps: [
      { paths: [C(512, 200, 95)], say: '동그라미 머리를 그려요.' },
      { paths: [P(380, 330, 644, 330, 660, 600, 364, 600)], say: '머리 아래에 네모 윗옷.' },
      { paths: [L(380, 350, 290, 540), L(644, 350, 734, 540), C(290, 570, 28), C(734, 570, 28)], say: '소매 선 두 개와 손 동그라미.' },
      { paths: [L(370, 600, 360, 880, 480, 880, 495, 600), L(530, 600, 545, 880, 665, 880, 655, 600)], say: '길쭉한 네모 두 개, 바지예요.' },
      { paths: [E(420, 895, 65, 20), E(605, 895, 65, 20)], say: '신발을 그려요.' },
      { paths: ['M417,180 Q450,90 512,100 Q574,90 607,180', ...eyes(512, 195, 35, 10), smile(512, 235, 60, 25)], say: '머리카락과 얼굴. 다 됐어!' },
    ] });
  def('running', { name: '뛰는 사람', unit: 4, day: 4, mode: 'look', formula: '머리 + 기울어진 몸 선 + 굽힌 팔다리 + 바람 선', colors: ['#ffcc80', '#ff8a65', '#4fc3f7'],
    steps: [
      { paths: [C(580, 200, 90)], say: '동그라미 머리를 조금 앞쪽에 그려요.' },
      { paths: [L(555, 285, 470, 560)], say: '몸을 앞으로 기울여서 선을 그려요. 달릴 때는 몸이 기울어요.' },
      { paths: [L(530, 370, 660, 300, 740, 340), L(530, 370, 400, 440, 340, 400)], say: '팔은 앞뒤로 굽혀서. 하나는 앞, 하나는 뒤.' },
      { paths: [L(470, 560, 620, 700, 640, 880), L(470, 560, 330, 690, 360, 870)], say: '다리도 굽혀서 하나는 앞, 하나는 뒤.' },
      { paths: [L(250, 300, 160, 300), L(270, 380, 170, 380), L(240, 460, 150, 460), ...eyes(590, 190, 30, 9), smile(595, 230, 50, 20)], say: '바람 선과 얼굴을 그려요. 다 됐어!' },
    ] });
  def('playground', { name: '운동장에서', unit: 4, day: 5, mode: 'look', formula: '사람 둘 + 공 + 나무 + 해 — 앞에 있는 사람은 크게', colors: ['#ffcc80', '#66bb6a', '#ff8a65', '#ffd54f'],
    steps: (() => { const a = person(330, 300, 560), b = person(720, 380, 420); return [
      { paths: [L(60, 880, 964, 880), C(860, 150, 60)], say: '땅 선과 해를 그려요.' },
      { paths: [a.head, a.body, ...a.arms, ...a.legs], say: '앞에 큰 사람. 동그라미 머리, 감자 몸, 팔다리 선.' },
      { paths: [b.head, b.body, ...b.arms, ...b.legs], say: '뒤에 조금 작은 사람. 멀리 있으면 작게 그려요.' },
      { paths: [C(530, 820, 60), L(500, 790, 560, 850), L(560, 790, 500, 850)], say: '가운데에 동그라미 공과 무늬.' },
      { paths: [rect(120, 700, 40, 180), C(140, 630, 90)], say: '옆에 기둥과 동그라미 잎, 나무.' },
      { paths: [...a.face, ...b.face, a.hair, b.hair], say: '두 사람 얼굴과 머리카락. 운동장 완성!' },
    ]; })() });

  /* === 6단원 우리 가족 (AREQ-86: 키·안경·머리 모양으로 구별) === */
  const momDad = (() => { const d = person(330, 140, 760, { wide: true }), m = person(700, 240, 660); return { d, m }; })();
  def('momdad', { name: '엄마와 아빠', unit: 5, day: 1, mode: 'look', formula: '아빠는 크게, 엄마는 조금 작게 + 긴 머리', colors: ['#ffcc80', '#5c7cfa', '#ec407a', '#5d4037'],
    steps: [
      { paths: [momDad.d.head, momDad.d.body], say: '왼쪽에 큰 동그라미 머리와 넓은 감자 몸. 아빠예요.' },
      { paths: [...momDad.d.arms, ...momDad.d.legs, ...momDad.d.feet], say: '아빠 팔다리와 발.' },
      { paths: [momDad.m.head, momDad.m.body], say: '오른쪽에 조금 작은 동그라미와 몸. 엄마예요.' },
      { paths: [...momDad.m.arms, ...momDad.m.legs, ...momDad.m.feet], say: '엄마 팔다리와 발.' },
      { paths: [momDad.d.hair, momDad.m.hair, ...momDad.m.longHair], say: '아빠는 짧은 머리, 엄마는 어깨까지 긴 머리.' },
      { paths: [...momDad.d.face, ...momDad.m.face], say: '두 사람 웃는 얼굴. 다 됐어!' },
    ] });
  const gp = (() => { const a = person(330, 200, 680), b = person(700, 260, 620); return { a, b }; })();
  def('grand', { name: '할아버지와 할머니', unit: 5, day: 2, mode: 'look', formula: '안경 + 지팡이 + 동그라미 쪽머리로 할아버지·할머니 구별', colors: ['#ffcc80', '#8d6e63', '#ab47bc', '#9e9e9e'],
    steps: [
      { paths: [gp.a.head, gp.a.body, ...gp.a.legs, ...gp.a.feet], say: '왼쪽에 할아버지. 머리, 몸, 다리.' },
      { paths: [gp.b.head, gp.b.body, ...gp.b.legs, ...gp.b.feet], say: '오른쪽에 할머니. 머리, 몸, 다리.' },
      { paths: [gp.a.arms[1], gp.a.arms[0], L(330 - gp.a.bw * 2.1, gp.a.bodyTop + gp.a.bodyH * 0.95, 330 - gp.a.bw * 2.1, 870)], say: '할아버지 팔과 길게 내려오는 지팡이.' },
      { paths: [...gp.b.arms, C(700, gp.b.headY - gp.b.r - 25, 35)], say: '할머니 팔, 그리고 머리 위에 동그라미 쪽머리.' },
      { paths: [...gp.a.glasses, ...gp.b.glasses], say: '두 분 다 동그라미 안경을 써요.' },
      { paths: [smile(330, gp.a.headY + gp.a.r * 0.35, gp.a.r * 0.7, gp.a.r * 0.3), smile(700, gp.b.headY + gp.b.r * 0.35, gp.b.r * 0.7, gp.b.r * 0.3), zig(330 - gp.a.r * 0.9, gp.a.headY - gp.a.r * 0.95, 6, gp.a.r * 0.3, 28)], say: '웃는 입과 할아버지 흰 머리. 다 됐어!' },
    ] });
  const is = (() => { const s = person(330, 160, 740), i = person(700, 240, 660); return { s, i }; })();
  def('imosamchon', { name: '이모와 삼촌', unit: 5, day: 3, mode: 'look', formula: '삼촌은 크고 수염, 이모는 긴 머리와 가방', colors: ['#ffcc80', '#26a69a', '#ff7043', '#5d4037'],
    steps: [
      { paths: [is.s.head, is.s.body, ...is.s.arms, ...is.s.legs, ...is.s.feet], say: '왼쪽에 키 큰 삼촌. 머리, 몸, 팔다리.' },
      { paths: [is.i.head, is.i.body, ...is.i.arms, ...is.i.legs, ...is.i.feet], say: '오른쪽에 이모. 머리, 몸, 팔다리.' },
      { paths: [zig(330 - is.s.r * 0.7, is.s.headY + is.s.r * 0.75, 6, is.s.r * 0.23, 25), is.s.hair], say: '삼촌 턱에 지그재그 수염, 머리카락.' },
      { paths: [is.i.hair, ...is.i.longHair, Q(700 - is.i.r * 1.1, is.i.headY + is.i.r * 2.6, 700, is.i.headY + is.i.r * 2.6 + 60, 700 + is.i.r * 1.1, is.i.headY + is.i.r * 2.6)], say: '이모는 길고 둥근 머리.' },
      { paths: [rect(700 + is.i.bw * 1.6, is.i.bodyTop + is.i.bodyH * 0.95, 90, 80), L(700 + is.i.bw * 1.6 + 20, is.i.bodyTop + is.i.bodyH * 0.95, 700 + is.i.bw * 1.6 + 45, is.i.bodyTop + is.i.bodyH * 0.6, 700 + is.i.bw * 1.6 + 70, is.i.bodyTop + is.i.bodyH * 0.95)], say: '이모 손에 네모 가방.' },
      { paths: [...is.s.face, ...is.i.face], say: '두 사람 웃는 얼굴. 다 됐어!' },
    ] });
  const kids = (() => { const y = person(380, 300, 560), c = person(680, 400, 460); return { y, c }; })();
  def('chorokme', { name: '초록이와 나', unit: 5, day: 4, mode: 'look', formula: '나는 조금 크게, 동생은 작게 + 손잡기 선', colors: ['#ffcc80', '#66bb6a', '#4fc3f7', '#ffd54f'],
    steps: [
      { paths: [kids.y.head, kids.y.body, ...kids.y.legs, ...kids.y.feet], say: '왼쪽에 나, 윤이. 머리, 몸, 다리.' },
      { paths: [kids.c.head, kids.c.body, ...kids.c.legs, ...kids.c.feet], say: '오른쪽에 조금 작은 초록이.' },
      { paths: [kids.y.arms[0], kids.c.arms[1], Q(380 + kids.y.bw * 0.8, kids.y.bodyTop + kids.y.bodyH * 0.25, 530, kids.y.bodyTop + kids.y.bodyH * 0.9, 680 - kids.c.bw * 0.8, kids.c.bodyTop + kids.c.bodyH * 0.25)], say: '바깥쪽 팔을 그리고, 가운데에서 손을 잡은 선을 그려요.' },
      { paths: [kids.y.hair, kids.c.hair], say: '두 사람 머리카락.' },
      { paths: [...kids.y.face, ...kids.c.face, heart(530, 230, 40)], say: '웃는 얼굴과 사이에 작은 하트. 다 됐어!' },
    ] });
  const fam = (() => { const xs = [150, 300, 450, 600, 740, 880]; const hs = [560, 620, 500, 540, 380, 420]; return xs.map((x, i) => person(x, 880 - hs[i], hs[i], { wide: i === 0 })); })();
  def('family', { name: '우리 가족', unit: 5, day: 5, mode: 'look', formula: '키가 다른 사람 여럿을 나란히 + 특징(안경·쪽머리·수염) + 하트', colors: ['#ffcc80', '#ff6f91', '#5c7cfa', '#66bb6a'],
    steps: [
      { paths: [L(40, 880, 984, 880), ...fam.map(p => p.head)], say: '땅 선을 긋고 동그라미 머리 여섯 개를 높이를 다르게 그려요. 아빠, 엄마, 할아버지, 할머니, 나, 초록이.' },
      { paths: fam.map(p => p.body), say: '머리마다 감자 몸을 붙여요.' },
      { paths: fam.flatMap(p => p.legs), say: '다리를 그려요.' },
      { paths: fam.flatMap(p => p.arms), say: '팔을 그려요. 옆 사람과 손이 닿아도 좋아요.' },
      { paths: [...fam[2].glasses, ...fam[3].glasses, C(600, fam[3].headY - fam[3].r - 18, 24), fam[0].hair, fam[4].hair, fam[5].hair, ...fam[1].longHair], say: '할아버지·할머니 안경, 할머니 쪽머리, 엄마 긴 머리, 머리카락.' },
      { paths: [...fam.flatMap(p => p.face), heart(512, 120, 60)], say: '모두 웃는 얼굴, 위에 하트. 우리 가족 완성!' },
    ] });

  /* ---------- 단원 12개 × 5일 (AREQ-81). 7~12단원은 준비 중(soon) ---------- */
  const units = [
    { title: '선과 모양', bg: '✏️', thing: '모양 마을', theme: '#fff3e0', days: ['lines', 'snowman', 'mountain', 'house', 'village'], warm: ['hline', 'vline', 'slant', 'circle', 'tri', 'square', 'wave', 'zigzag'] },
    { title: '물고기·바다생물', bg: '🐟', thing: '바다 속', theme: '#e1f5fe', days: ['fish', 'octopus', 'turtle', 'crab', 'sea'], warm: ['circle', 'wave', 'tri', 'arc', 'loops', 'slant'] },
    { title: '곤충', bg: '🐞', thing: '꽃밭', theme: '#f1f8e9', days: ['ladybug', 'butterfly', 'ant', 'bee', 'garden'], warm: ['circle', 'zigzag', 'arc', 'spiral', 'hline', 'loops'] },
    { title: '얼굴과 표정', bg: '🙂', thing: '내 얼굴', theme: '#fff8e1', days: ['face', 'faces4', 'hair', 'glasses', 'me'], warm: ['circle', 'hline', 'vline', 'arc', 'zigzag', 'heart'] },
    { title: '사람 몸', bg: '🧍', thing: '운동장', theme: '#fce4ec', days: ['stick', 'potato', 'dressed', 'running', 'playground'], warm: ['vline', 'circle', 'slant', 'square', 'arc', 'loops'] },
    { title: '우리 가족', bg: '👨‍👩‍👧', thing: '우리 가족 그림', theme: '#ede7f6', days: ['momdad', 'grand', 'imosamchon', 'chorokme', 'family'], warm: ['circle', 'heart', 'vline', 'arc', 'zigzag', 'spiral'] },
    { title: '나무·꽃·풀', bg: '🌳', thing: '숲', theme: '#e8f5e9', soon: true, days: [] },
    { title: '하늘', bg: '🌈', thing: '하늘 그림', theme: '#e3f2fd', soon: true, days: [] },
    { title: '산·강·바다 풍경', bg: '⛰️', thing: '풍경', theme: '#e0f7fa', soon: true, days: [] },
    { title: '로봇·탈것', bg: '🤖', thing: '로봇 공장', theme: '#eceff1', soon: true, days: [] },
    { title: '집·동네·여행', bg: '🏠', thing: '우리 동네', theme: '#fff3e0', soon: true, days: [] },
    { title: '과학실험·우주', bg: '🚀', thing: '우주', theme: '#ede7f6', soon: true, days: [] },
  ];

  /* ---------- 가족 미션 카드 (AREQ-87): 단원마다 5장(일차별), 초록이 카드는 이어 그리기(given) ---------- */
  const missions = [
    [ { who: 'grandma', ask: '윤이가 그린 예쁜 선 그림이 보고 싶어.', topic: '선 그림' }, { who: 'dad', ask: '아빠한테 눈사람 그림 하나 그려 줄래?', topic: '눈사람' }, { who: 'grandpa', ask: '할아버지는 높은 산 그림을 받고 싶구나.', topic: '산' }, { who: 'mom', ask: '엄마는 우리 집을 그려 주면 좋겠어.', topic: '우리 집' }, { who: 'chorok', ask: '형, 내 마을 그림 좀 완성해 줘!', topic: '모양 마을', given: 'village' } ],
    [ { who: 'chorok', ask: '형, 내 물고기 좀 완성해 줘!', topic: '물고기', given: 'fish' }, { who: 'imo', ask: '이모는 다리가 많은 문어가 보고 싶어!', topic: '문어' }, { who: 'grandpa', ask: '할아버지한테 느릿느릿 거북이를 그려 줄래?', topic: '거북이' }, { who: 'samchon', ask: '삼촌은 옆으로 걷는 게 그림을 받고 싶어.', topic: '게' }, { who: 'mom', ask: '엄마는 윤이가 그린 바다가 보고 싶어.', topic: '바다 속' } ],
    [ { who: 'grandma', ask: '할머니 마당에 무당벌레가 왔어. 그려 줄래?', topic: '무당벌레' }, { who: 'mom', ask: '엄마는 예쁜 나비를 받고 싶어.', topic: '나비' }, { who: 'chorok', ask: '형, 내 개미 그림 좀 완성해 줘!', topic: '개미', given: 'ant' }, { who: 'dad', ask: '아빠한테 부지런한 꿀벌을 그려 줄래?', topic: '꿀벌' }, { who: 'imo', ask: '이모는 꽃밭 그림을 벽에 붙이고 싶어!', topic: '꽃밭' } ],
    [ { who: 'mom', ask: '엄마는 윤이가 그린 웃는 얼굴이 보고 싶어.', topic: '웃는 얼굴' }, { who: 'samchon', ask: '삼촌한테 깜짝 놀란 얼굴을 그려 줄래?', topic: '놀란 얼굴' }, { who: 'chorok', ask: '형, 내 얼굴 그림 좀 완성해 줘!', topic: '초록이 얼굴', given: 'hair' }, { who: 'grandpa', ask: '할아버지는 안경 쓴 얼굴을 받고 싶구나.', topic: '안경 쓴 얼굴' }, { who: 'dad', ask: '아빠한테 윤이 얼굴을 그려 줄래?', topic: '내 얼굴' } ],
    [ { who: 'dad', ask: '아빠한테 막대 사람을 그려 줄래?', topic: '막대 사람' }, { who: 'grandma', ask: '할머니는 감자 사람이 궁금해!', topic: '감자 사람' }, { who: 'imo', ask: '이모한테 멋진 옷 입은 사람을 그려 줄래?', topic: '옷 입은 사람' }, { who: 'chorok', ask: '형, 뛰는 사람 그림 좀 완성해 줘!', topic: '뛰는 사람', given: 'running' }, { who: 'samchon', ask: '삼촌은 운동장 그림을 받고 싶어.', topic: '운동장' } ],
    [ { who: 'mom', ask: '엄마와 아빠를 그려 줄래? 냉장고에 붙일 거야.', topic: '엄마와 아빠' }, { who: 'grandpa', ask: '할아버지와 할머니를 그려 주면 정말 기쁘겠구나.', topic: '할아버지와 할머니' }, { who: 'imo', ask: '이모와 삼촌을 그려 줄래?', topic: '이모와 삼촌' }, { who: 'chorok', ask: '형, 우리 둘 그림 좀 완성해 줘!', topic: '초록이와 나', given: 'chorokme' }, { who: 'grandma', ask: '할머니는 우리 가족 모두 그린 그림을 받고 싶어.', topic: '우리 가족' } ],
  ];
  // 가족 칭찬 (AREQ-95: 노력·윤이만의 것·가족 반응). {T} = 주제, {NAME} = 아이 이름
  const thanks = {
    mom: ['{NAME}, 고마워! 엄마가 받은 선물 중에 제일 예쁜 그림이야.', '{NAME}가 그린 {T}, 엄마가 냉장고에 붙여 둘게!'],
    dad: ['우와, {NAME}! 아빠는 이 {T}가 정말 마음에 들어.', '{NAME}가 끝까지 그린 걸 아빠가 다 봤어. 정말 멋지다!'],
    grandpa: ['허허, {NAME}가 그린 {T}로구나. 할아버지 방에 걸어 두마.', '{NAME}, 고맙다. 할아버지가 기분이 좋아지는구나.'],
    grandma: ['아이고, 우리 {NAME}가 이걸 다 그렸어? 할머니 눈에는 보물이야.', '{NAME}, 고마워. 할머니가 매일 볼게.'],
    imo: ['{NAME}! 이모가 받은 {T} 그림, 친구들한테 자랑할게!', '이모는 {NAME}의 색깔 고르는 센스가 좋아!'],
    samchon: ['오, {NAME}! 삼촌 사무실에 걸어 둘게. 멋지다!', '{NAME}가 그린 {T}, 삼촌이 제일 좋아하는 그림이 됐어.'],
    chorok: ['형, 고마워! 형이 그려 주니까 훨씬 멋있어졌어!', '와, 형은 정말 그림을 잘 그려. 나도 형처럼 그릴래!'],
  };

  /* ---------- 칭찬 (AREQ-94·95, 30개 이상): ① 노력 ② 윤이만의 것. 예제와 비교하는 말 없음. {NAME} = 아이 이름 ---------- */
  const praise = [
    '끝까지 그렸네! 멋져!', '와, 스스로 다 그렸어!', '{NAME}만의 그림이 됐어!', '선이 힘차다! 마음에 들어.', '정성이 느껴져!', '오늘도 한 장 더! 대단해!',
    '{NAME}가 그린 건 세상에 하나뿐이야.', '색을 참 재미있게 골랐네!', '손이 점점 부드러워지고 있어!', '포기하지 않고 그렸구나!', '{NAME}의 그림엔 {NAME}의 생각이 담겨 있어.',
    '우와, 이 선 좀 봐! 신나게 그렸구나!', '천천히 꼼꼼하게 그렸네!', '멋진 그림이 또 하나 생겼어!', '이 그림, 미술관에 걸어야겠다!', '{NAME}는 그리는 걸 정말 즐기는구나!',
    '하나하나 차근차근, 잘했어!', '오, 이렇게 그릴 수도 있구나! 재미있다!', '{NAME} 손은 마법 손이야!', '그림이 살아 움직이는 것 같아!', '매일 그리니까 점점 더 신나지?',
    '이 부분, {NAME}만의 멋진 생각이야!', '씩씩하게 그렸네!', '다 그렸다! 뿌듯하지?', '{NAME}가 그린 그림을 보니 내가 기분이 좋아!', '멋지게 완성!', '한 장 한 장 모여서 화가가 되는 거야!',
    '오늘 그림도 보물이야!', '손풀기 효과가 있나 봐! 선이 쭉쭉!', '정말 열심히 그렸어!', '{NAME}의 상상이 종이 위에 나왔어!', '그림마다 {NAME}의 색깔이 있어!',
  ];
  const lines = {
    praise,
    warmGood: ['좋아! 손이 잘 풀렸어!', '선이 쭉쭉! 좋아!', '멋지게 따라 갔어!'],
    warmOk: ['손이 풀렸네! 다음으로 가자!', '좋아, 이제 그릴 준비 끝!', '괜찮아, 손풀기는 이걸로 충분해!'],
    hint1: '같이 그려 볼까? 천천히 다시 보여줄게.',
    hint2: '그림판에 연한 점선을 깔아 줄게. 점선 위를 따라 그려 봐.',
    hint3: '이 정도면 충분해! 다음으로 가자.',
  };

  /* ---------- 도장 (AREQ-89, 직접 만든 SVG, 100×100 상자) + 마법 붓 ---------- */
  const stamps = {
    star: { name: '별', d: 'M50,6 L61,38 L95,38 L68,58 L78,92 L50,72 L22,92 L32,58 L5,38 L39,38 Z', c: '#ffd54f' },
    heart: { name: '하트', d: 'M50,88 C20,65 5,45 12,28 C18,12 38,10 50,26 C62,10 82,12 88,28 C95,45 80,65 50,88 Z', c: '#ff6f91' },
    drop: { name: '물방울', d: 'M50,6 C50,6 18,48 18,66 A32,32 0 0,0 82,66 C82,48 50,6 50,6 Z', c: '#4fc3f7' },
    leaf: { name: '잎', d: 'M10,90 C10,40 50,10 92,10 C92,55 55,92 10,90 Z M10,90 L70,30', c: '#66bb6a' },
    dots: { name: '점박이', d: 'M30,30 a12,12 0 1,0 .1,0 Z M70,25 a9,9 0 1,0 .1,0 Z M60,65 a14,14 0 1,0 .1,0 Z M25,72 a8,8 0 1,0 .1,0 Z', c: '#ef5350' },
    flower: { name: '꽃', d: 'M50,22 a14,14 0 1,0 .1,0 Z M78,42 a14,14 0 1,0 .1,0 Z M68,76 a14,14 0 1,0 .1,0 Z M32,76 a14,14 0 1,0 .1,0 Z M22,42 a14,14 0 1,0 .1,0 Z M50,52 a11,11 0 1,0 .1,0 Z', c: '#ff8a65' },
    sun: { name: '해', d: 'M50,25 a25,25 0 1,0 .1,0 Z M50,4 L50,14 M50,86 L50,96 M4,50 L14,50 M86,50 L96,50 M18,18 L25,25 M82,82 L75,75 M18,82 L25,75 M82,18 L75,25', c: '#ffd54f' },
    bubble: { name: '비눗방울', d: 'M50,12 a38,38 0 1,0 .1,0 Z M36,30 a10,10 0 1,0 .1,0 Z', c: '#b3e5fc' },
    shell: { name: '조개', d: 'M50,90 L10,45 A40,40 0 0,1 90,45 Z M50,90 L35,42 M50,90 L50,40 M50,90 L65,42', c: '#ffe0b2' },
    zig: { name: '번개', d: 'M58,4 L22,54 L46,54 L36,96 L78,40 L54,40 Z', c: '#fff176' },
  };
  // 레벨 10마다 열리는 도장 (AREQ-92): 처음 6개, 레벨 10에 sun·bubble, 레벨 20에 shell·zig
  const stampUnlock = { 0: ['star', 'heart', 'drop', 'leaf', 'dots', 'flower'], 10: ['sun', 'bubble'], 20: ['shell', 'zig'] };
  const magic = { rainbow: { name: '무지개 붓', icon: '🌈' }, sparkle: { name: '반짝이 붓', icon: '✨' } };
  // 색연필 12색 + 피부색 3 (AREQ-84)
  const colors = ['#1f2a44', '#ef5350', '#ff8a65', '#ffd54f', '#66bb6a', '#26a69a', '#4fc3f7', '#5c7cfa', '#ab47bc', '#ff6f91', '#8d6e63', '#9e9e9e'];
  const skins = ['#ffe0b2', '#ffcc80', '#d7a86e'];
  // 룰렛 주제 (AREQ-91): 배운 그림 + 윤이가 좋아하는 것
  const favorites = ['곤충', '물고기', '로봇', '여행 가는 날', '바다 생물', '과학실험', '우주', '공룡'];

  return { leaders, family, warmups, drawings: D, units, missions, thanks, lines, stamps, stampUnlock, magic, colors, skins, favorites, helpers: { C, E, L, P, Q } };
})();
