// 한국어 녹음이 필요한 문장 목록 (공통 65번): node tools/ko_sentences.js > tools/ko_sentences.json
// key = app.js ko()가 받는 글을 koSentences()와 똑같이 문장(. ! ?)으로 나눈 것(공백 정리), say = 실제로 읽을 글
// app.js·content.js의 한국어 문장을 고치면 이 파일도 맞추고 tools/make_ko_audio.py로 녹음을 다시 만들어요 (블록 앱과 같은 도구)
global.window = {}; global.document = undefined; require('../content.js'); const C = window.CONTENT;
const koKey = t => String(t).replace(/\s+/g, ' ').trim();
const koSentences = t => String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
const sayOf = k => koKey(k.replace(/\p{Extended_Pictographic}|️|‍/gu, '').replace(/['"‘’“”\[\]()]/g, '').replace(/·/g, ', ').replace(/:/g, ',').replace(/\+/g, ' 더하기 ').replace(/\s*\/\s*/g, ' 중 '));
const out = new Map();
const add = t => { if (!t) return; const all = koSentences(t).map(koKey); for (const k of all) if (k && !out.has(k) && /[가-힣]/.test(k)) out.set(k, sayOf(k)); };
const names = C.leaders.map(l => l.name); const child = '윤이';
const fill = (t, topic) => String(t).replace(/\{NAME\}/g, child).replace(/\{T\}/g, topic || '');
// 1) app.js 고정 문장
['오늘 그림 그리기는 여기까지! 정말 잘했어요.', '목표 달성! 아빠에게 보여줘요!', '이 단원은 아직 준비 중이야. 다음 버전에서 만나!', `안녕, ${child}! 오늘도 같이 그림 그리자!`,
  '먼저 손풀기! 연한 선 위를 손가락으로 따라 그어 봐.', '내가 먼저 그리는 걸 보고, 그림판의 연한 선 위를 따라 그려 봐. 다 그리면 다 그렸어요 버튼!', '내가 먼저 그리는 걸 보고, 빈 종이에 보고 그려 봐. 다 그리면 다 그렸어요 버튼!',
  '예제를 그림판에 연하게 깔았어. 그 위를 따라 그려 봐.', '이제 예제를 보고 빈 종이에 그려 봐.', '마지막은 자유 그리기! 미션 카드나 룰렛으로 주제를 정하거나, 그냥 그려도 좋아.',
  '초록이가 반쯤 그렸어. 형이 이어서 완성해 줘!', '이 날 그림을 끝내면 받을 수 있어', '그림을 미술관에 걸었어!',
  '먼저 손풀기! 연한 선 위를 손가락으로 따라 그어 봐. 오늘 그림 그리기 끝! 정말 잘했어, 윤이.', C.lines.hint1, C.lines.hint2, C.lines.hint3].forEach(add);
C.lines.praise.forEach(p => add(fill(p))); C.lines.warmGood.forEach(add); C.lines.warmOk.forEach(add);
['인사', '손풀기', '오늘의 그림', '색칠·꾸미기', '자유 그리기'].forEach(n => add(`다음은 ${n}!`));
for (let lv = 1; lv <= 60; lv++) { const j = [2, 4, 5, 9].includes(lv % 10) ? '가' : '이'; add(`레벨 ${lv}${j} 됐어!`); }
// 2) 손풀기·그림 단계 설명·칭찬 조합
for (const w of Object.values(C.warmups)) add(w.say);
for (const d of Object.values(C.drawings)) {
  add(`오늘은 ${d.name}를 그려 볼 거야! ${d.formula}.`);
  for (const s of d.steps) { add(s.say); add(`복습! ${d.name}의 ${s.say}`); }
  for (const p of C.lines.praise) add(`${fill(p)} ${d.name} 완성!`);
  for (const p of C.lines.praise) add(`${fill(p)} ${d.name} 그림을 미술관에 걸었어!`);
  add(`이제 ${d.name}에 색을 칠하고 꾸며 보자! 도장과 스티커도 써 봐.`);
  add(`${d.name}! ${d.name}를 그려 보자!`);
}
for (const t of C.favorites) add(`${t}! ${t}를 그려 보자!`);
// 3) 단원·하루 끝
C.units.forEach(u => {
  for (let d = 1; d <= 5; d++) add(`안녕, ${child}! 오늘은 ${u.title} ${d}일차야.`);
  add(`${u.title}을 5일 다 하면 받을 수 있어`);
  add(`오늘 그림 그리기 끝! 정말 잘했어, ${child}. 스티커도 받았어! ${u.thing} 완성!`);
  add(`오늘 그림 그리기 끝! 정말 잘했어, ${child}. 스티커도 받았어! 내일 또 만나!`);
  for (let lv = 1; lv <= 60; lv++) { const j = [2, 4, 5, 9].includes(lv % 10) ? '가' : '이'; add(`오늘 그림 그리기 끝! 정말 잘했어, ${child}. 레벨 ${lv}${j} 됐어! 스티커도 받았어! 내일 또 만나!`); }
});
// 4) 가족 미션 카드·칭찬 (AREQ-87)
C.missions.flat().forEach(m => { add(fill(m.ask)); add(`${C.family[m.who].name}가 부탁했어. ${fill(m.ask)}`); for (const t of C.thanks[m.who]) add(fill(t, m.topic)); });
process.stdout.write(JSON.stringify([...out].map(([key, say]) => (say === key ? { key } : { key, say })), null, 0));
