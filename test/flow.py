# 윤이 미술 자동 테스트: 저장소 폴더에서 python3 -m http.server 8766 (다른 포트는 PORT=8781), test 폴더에서 python3 flow.py tab 1280 800 0 / phone 390 844 1
# 점검 (기획서 4-5장): 하루 흐름(인사→손풀기→오늘의 그림→색칠→자유 그리기→하루 끝), 별 18·64(선 긋고 ✔ = 1, 안 긋고 다음▶ = 0, 같은 단계 두 번 0),
#   손풀기 커버율 60%·X 없음, 겹쳐/보고 토글, ◀ 이전으로 돌아가도 선 유지, 되돌리기 20단계, 미술관(IndexedDB) 저장, 레벨·스티커·보너스·하루 50 상한,
#   공통 61(암호)·62(통계)·63(탭 6개)·21(기획서)·65(녹음), 폰 세로에서 그림판이 화면 밖으로 안 넘침, 왼손 설정, 30그림 단계 4~6
import asyncio, sys, json, os
from playwright.async_api import async_playwright
URL = 'http://localhost:%s/' % os.environ.get('PORT', '8766')
MOCK = r"""
window.speechSynthesis.speak = function(u){ window.__said=(window.__said||[]); window.__said.push(u.text); setTimeout(()=>u.onend&&u.onend(), 5); };
window.speechSynthesis.cancel = function(){};
window.__KO_LOG = [];
const _play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function(){ const p = _play.call(this); if (/audio-ko\//.test(this.src)) { const a = this; const end = () => setTimeout(()=>{ try{ a.pause(); }catch(e){} a.dispatchEvent(new Event('ended')); }, 60); if (a.readyState >= 4) end(); else { a.addEventListener('canplaythrough', end, {once:true}); a.addEventListener('error', end, {once:true}); setTimeout(end, 800); } } return p; };
if(!localStorage.getItem("yuni-art-v1")) localStorage.setItem("yuni-art-v1", JSON.stringify({settings:{}}));
"""

async def run(name, vw, vh, mobile):
    REQ = {}
    src = open('../app.js', encoding='utf-8').read()
    REQ['공통 11 밤 잠금 없음'] = 'nightHour' not in src
    REQ['공통 16 저장 키 yuni-art-v1'] = "const KEY = 'yuni-art-v1'" in src and "'yuni-art-works'" in open('../store.js', encoding='utf-8').read()
    REQ['공통 34 타이머 없음'] = 'setInterval(() => { if (screen === \'lesson\'' in src and 'countdown' not in src
    REQ['공통 07 땡·빨간 X·점수 없음'] = '땡' not in src and 'wrong' not in src and '점수' not in src
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': vw, 'height': vh}, device_scale_factor=1.5 if not mobile else 2, is_mobile=mobile, has_touch=True, locale='ko-KR')
        await ctx.add_init_script(MOCK)
        pg = await ctx.new_page()
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto(URL); await pg.wait_for_timeout(500)
        await pg.evaluate("indexedDB.deleteDatabase('yuni-art-works')"); await pg.goto(URL); await pg.wait_for_timeout(400)
        await pg.screenshot(path=f'../shots/{name}-1-home.png')
        REQ['AREQ-81 12단원, 1~6단원 5그림(30), 단계 4~6'] = await pg.evaluate("CONTENT.units.length===12 && CONTENT.units.slice(0,6).every(u=>u.days.length===5 && u.days.every(id=>{const d=CONTENT.drawings[id]; return d && d.steps.length>=4 && d.steps.length<=6 && d.steps.every(s=>s.paths.length>=1 && s.say)})) && CONTENT.units.slice(6).every(u=>u.soon)")
        REQ['AREQ-94·95 칭찬 30개 이상, 비교하는 말 없음'] = await pg.evaluate("CONTENT.lines.praise.length>=30 && CONTENT.lines.praise.every(p=>!/똑같|비슷|닮/.test(p))")
        REQ['AREQ-87 가족 미션 카드 30장, 초록이 이어 그리기 있음'] = await pg.evaluate("CONTENT.missions.flat().length===30 && CONTENT.missions.flat().some(m=>m.who==='chorok'&&m.given) && !JSON.stringify(CONTENT).includes('은후')")
        REQ['AREQ-89 도장 10종 SVG, 마법 붓 2'] = await pg.evaluate("Object.keys(CONTENT.stamps).length===10 && Object.keys(CONTENT.magic).length===2")
        stars = lambda: pg.evaluate("YUNI.state.stars")
        cur = lambda: pg.evaluate("YUNI.lesson.s+':'+YUNI.lesson.i")
        async def moved_from(k, t=8000): await pg.wait_for_function("YUNI.lesson && (YUNI.lesson.s+':'+YUNI.lesson.i)!==%s" % json.dumps(k), timeout=t); await pg.wait_for_timeout(250)
        async def stroke(x1, y1, x2, y2, n=20):  # 캔버스 1024 좌표로 포인터 선 긋기
            box = await pg.locator('.board-canvas').bounding_box(); k = box['width'] / 1024
            await pg.mouse.move(box['x'] + x1 * k, box['y'] + y1 * k); await pg.mouse.down()
            for i in range(1, n + 1): await pg.mouse.move(box['x'] + (x1 + (x2 - x1) * i / n) * k, box['y'] + (y1 + (y2 - y1) * i / n) * k)
            await pg.mouse.up(); await pg.wait_for_timeout(120)
        # ---- 하루 흐름 (1단원 1일차) ----
        await pg.click('[data-act=go]'); await pg.wait_for_timeout(400)
        seen = set(); T = {}; warm_i = 0; step_i = 0
        for loop in range(300):
            await pg.wait_for_timeout(250)
            if await pg.evaluate("!!document.querySelector('.reward .big-stars')"):
                await pg.screenshot(path=f'../shots/{name}-9-reward.png')
                day_stars = await stars(); REQ['공통 18 하루 별 50개 이하, 보너스 3 포함'] = 0 < day_stars <= 50 and await pg.evaluate("YUNI.state.log[YUNI.today()].stars>=4")
                REQ['AREQ-93 스티커 받음(썸네일)'] = await pg.evaluate("Object.keys(YUNI.state.stickers).length>=1 && Object.values(YUNI.state.stickers)[0].thumb.startsWith('data:image/png')")
                REQ['AREQ-92 레벨(배운 그림) 1'] = await pg.evaluate("YUNI.level()===1")
                n = await pg.evaluate("YUNI.store.count()")
                REQ['AREQ-88 미술관에 그림 저장(IndexedDB, 오늘 그림 + 자유 그림)'] = n >= 2
                break
            act = await pg.evaluate("(()=>{const a=YUNI.act; if(!a) return null; return {type:a.type, k:a.k, w:a.w&&a.w.id}})()")
            if not act: continue
            t = act['type']
            if t not in seen: seen.add(t); await pg.wait_for_timeout(700); await pg.screenshot(path=f'../shots/{name}-2-{t}.png')
            if t == 'greet': await pg.click('[data-act=next]'); await pg.wait_for_timeout(300)
            elif t == 'warmup':
                warm_i += 1; k = await cur(); s0 = await stars()
                if warm_i == 1:
                    # AREQ-85 가로선 가이드를 따라 긋기 → 커버율 60% 이상, ✔ → 별 1
                    disabled0 = await pg.evaluate("document.getElementById('doneBtn').disabled")
                    await stroke(150, 512, 874, 512, 40)
                    ratio = await pg.evaluate("YUNI.warm.ratio()"); disabled1 = await pg.evaluate("document.getElementById('doneBtn').disabled")
                    await pg.screenshot(path=f'../shots/{name}-3-warm.png')
                    await pg.click('#doneBtn'); await moved_from(k); s1 = await stars()
                    print(' warmup: ratio', round(ratio, 2), 'done btn', disabled0, '->', disabled1, 'stars', s0, '->', s1)
                    T['warm'] = ratio >= 0.6 and disabled0 and not disabled1 and s1 == s0 + 1
                elif warm_i == 2:
                    # 아무렇게나 그어도 X 없이 넘어감, 별 1 (스스로 그었으니)
                    await stroke(100, 100, 300, 900, 10)
                    body = await pg.inner_text('body'); calm = '땡' not in body and 'X' not in body
                    await pg.click('#doneBtn'); await moved_from(k); s1 = await stars()
                    T['warm2'] = calm and s1 == s0 + 1
                else:
                    # 안 긋고 다음 ▶ → 별 0, ◀ 이전으로 와서 그어도 별 0
                    await pg.click('[data-act=skip]'); await moved_from(k); s1 = await stars()
                    await pg.click('[data-act=prev]'); await pg.wait_for_timeout(400); back = (await cur()) == k
                    await stroke(150, 512, 874, 512, 20); await pg.click('#doneBtn'); await moved_from(k); s2 = await stars()
                    print(' warmup skip: stars', s0, s1, s2, 'back', back)
                    T['skip'] = s1 == s0 and s2 == s0 and back
            elif t == 'step':
                step_i += 1; k = await cur(); s0 = await stars()
                if step_i == 1:
                    # AREQ-82·83: 예제 가이드(이번 단계 진하게), 겹쳐 그리기 기본(1단원), 토글 → 보고 그리기, 다시 겹쳐
                    g_now = await pg.locator('#guide .g-now').count(); ov = await pg.locator('#overlay .g-over').count()
                    await pg.click('[data-act=trace]'); await pg.wait_for_timeout(300); ov2 = await pg.locator('#overlay path').count(); mode2 = await pg.evaluate("YUNI.lesson.trace")
                    await pg.click('[data-act=trace]'); await pg.wait_for_timeout(300); ov3 = await pg.locator('#overlay .g-over').count()
                    print(' trace: guide now', g_now, 'overlay', ov, '-> look', ov2, mode2, '-> overlay', ov3)
                    T['trace'] = g_now >= 1 and ov >= 1 and ov2 == 0 and mode2 == 'look' and ov3 >= 1
                    # 되돌리기 20단계: 선 22개 긋고 되돌리기 22번 → 2개 남음(되돌리기 기록 20)? → 모두 되돌릴 수 있되 redo는 20개까지
                    for i in range(22): await pg.evaluate("YUNI.board.strokeAt([100,%d,900,%d])" % (100 + i * 30, 100 + i * 30))
                    n0 = await pg.evaluate("YUNI.board.ops.length")
                    for i in range(22): await pg.evaluate("YUNI.board.undo()")
                    n1 = await pg.evaluate("YUNI.board.ops.length"); r1 = await pg.evaluate("YUNI.board.redo.length")
                    for i in range(25): await pg.evaluate("YUNI.board.redoOp()")
                    n2 = await pg.evaluate("YUNI.board.ops.length")
                    print(' undo: ops', n0, '-> undo all', n1, 'redo stack', r1, '-> redo', n2)
                    T['undo'] = n0 == 22 and n1 == 0 and r1 == 20 and n2 == 20
                    await pg.evaluate("YUNI.board.clear()"); await pg.wait_for_timeout(100)
                    disabled = await pg.evaluate("document.getElementById('doneBtn').disabled")
                    # 공통 64: 선을 긋고 ✔ → 별 1
                    await stroke(150, 200, 874, 200, 30); d2 = await pg.evaluate("document.getElementById('doneBtn').disabled")
                    await pg.click('#doneBtn'); await moved_from(k); s1 = await stars()
                    T['step1'] = disabled and not d2 and s1 == s0 + 1
                    # 공통 17: ◀ 이전으로 돌아가도 같은 단계·그린 선 유지, 같은 단계 두 번 별 없음
                    await pg.click('[data-act=prev]'); await pg.wait_for_timeout(400); back = (await cur()) == k; ops = await pg.evaluate("YUNI.lesson.ops.length")
                    await stroke(150, 230, 874, 230, 10); await pg.click('#doneBtn'); await moved_from(k); s2 = await stars()
                    print(' step1: stars', s0, '->', s1, ' prev back', back, 'ops kept', ops, ' again', s2)
                    T['prev'] = back and ops >= 1 and s2 == s1
                elif step_i == 2:
                    # 공통 07 힌트 3단계: 1 애니메이션 다시(천천히) → 2 점선 가이드 → 3 "충분해" 다음으로 (선 그었으면 별 1)
                    await pg.click('[data-act=hint]'); await pg.wait_for_timeout(300); h1 = await pg.evaluate("YUNI.lesson.hints[YUNI.lesson.s+':'+YUNI.lesson.i]")
                    await pg.wait_for_timeout(3600)
                    await pg.click('[data-act=hint]'); await pg.wait_for_timeout(400); dot = await pg.locator('#overlay .g-dot').count(); weak = await pg.evaluate("Object.keys(YUNI.state.weak).length")
                    await pg.screenshot(path=f'../shots/{name}-4-hint.png')
                    await stroke(300, 300, 300, 820, 20)
                    await pg.click('[data-act=hint]'); await moved_from(k); s1 = await stars()
                    print(' hint: h1', h1, 'dotted', dot, 'weak', weak, 'stars', s0, '->', s1)
                    T['hint'] = h1 == 1 and dot >= 1 and weak == 1 and s1 == s0 + 1
                elif step_i == 3:
                    # 안 그리고 다음 ▶ → 별 0
                    await pg.click('[data-act=skip]'); await moved_from(k); s1 = await stars(); T['stepskip'] = s1 == s0
                else:
                    await stroke(300, 560, 724, 560, 20); await pg.click('#doneBtn'); await moved_from(k)
            elif t == 'color':
                k = await cur(); s0 = await stars()
                # AREQ-89: 색연필·채우기·도장·스티커·마법 붓
                await pg.click('[data-act=color][data-arg="#ef5350"]'); await stroke(200, 700, 800, 700, 20)
                await pg.click('[data-act=tool][data-arg=fill]'); await pg.click('[data-act=color][data-arg="#4fc3f7"]')
                async def tap(x, y):  # 캔버스 1024 좌표를 톡 (버튼을 누르면 페이지가 스크롤될 수 있어 매번 위치를 다시 잼)
                    box = await pg.locator('.board-canvas').bounding_box(); kk = box['width'] / 1024
                    await pg.mouse.click(box['x'] + x * kk, box['y'] + y * kk); await pg.wait_for_timeout(200)
                await tap(512, 900)
                await pg.click('[data-act=stamp][data-arg=star]'); await tap(150, 150)
                await pg.click('[data-act=sticker]'); await tap(800, 400)
                await pg.click('[data-act=tool][data-arg=rainbow]'); await stroke(100, 850, 900, 850, 20)
                await pg.click('[data-act=tool][data-arg=sparkle]'); await stroke(100, 950, 900, 950, 20)
                kinds = await pg.evaluate("JSON.stringify([...new Set(YUNI.lesson.ops.map(o=>o.t+':'+(o.tool||'')))])")
                filled = await pg.evaluate("(()=>{const c=document.querySelector('.board-canvas').getContext('2d').getImageData(512,980,1,1).data; return c[0]<120 && c[2]>200})()")
                await pg.screenshot(path=f'../shots/{name}-5-color.png')
                await pg.click('#doneBtn'); await moved_from(k, 15000); s1 = await stars()
                print(' color: ops kinds', kinds, 'fill ok', filled, 'stars', s0, '->', s1)
                T['color'] = all(x in kinds for x in ['s:color', 'f:', 'st:', 'sk:', 's:rainbow', 's:sparkle']) and filled and s1 == s0 + 1
            elif t == 'free':
                k = await cur(); s0 = await stars()
                if await pg.locator('[data-act=mission]').count():
                    await pg.click('[data-act=mission]'); await pg.wait_for_timeout(500)
                    given = await pg.evaluate("YUNI.lesson.free.given || ''")
                elif await pg.locator('[data-act=roulette]').count():
                    await pg.click('[data-act=roulette]'); await pg.wait_for_timeout(300); await pg.click('[data-act=spin]'); await pg.wait_for_timeout(3500); given = ''
                await pg.wait_for_timeout(300)
                disabled = await pg.evaluate("document.getElementById('doneBtn').disabled")
                await stroke(200, 200, 800, 800, 20)
                await pg.screenshot(path=f'../shots/{name}-6-free.png')
                await pg.click('#doneBtn'); await moved_from(k, 15000); s1 = await stars()
                md = await pg.evaluate("YUNI.state.missionDone[YUNI.today()] || ''")
                print(' free: mission done', md, 'given', given, 'stars', s0, '->', s1)
                T['free'] = disabled and s1 >= s0 + 1 and md != ''  # 자유 그리기 별 1 + 바로 이어지는 하루 끝 보너스 3
        print(' T', T)
        REQ['AREQ-85 손풀기: 가이드 따라 60% 이상, ✔ 별 1, 아무렇게나 그어도 X 없음'] = T.get('warm') is True and T.get('warm2') is True
        REQ['공통 64 안 긋고 다음▶ 별 0, 이전으로 와서 그어도 0'] = T.get('skip') is True and T.get('stepskip') is True
        REQ['AREQ-82·83 예제 가이드·겹쳐/보고 토글'] = T.get('trace') is True
        REQ['AREQ-84 되돌리기·다시 20단계'] = T.get('undo') is True
        REQ['공통 18·64 선 긋고 ✔ 별 1, ✔은 그어야 켜짐'] = T.get('step1') is True
        REQ['공통 17 ◀ 이전: 같은 단계·그린 선 유지, 두 번 별 없음'] = T.get('prev') is True
        REQ['공통 07 힌트 3단계(애니메이션→점선→넘어감), 복습 대상 기록'] = T.get('hint') is True
        REQ['AREQ-89 색칠·채우기·도장·스티커·마법 붓, ✔ 별 1'] = T.get('color') is True
        REQ['AREQ-87·91 자유 그리기: 미션 카드 완료 → 가족 칭찬, 별 1'] = T.get('free') is True
        # 공통 65: 녹음 목록 대비 읽은 문장
        cov = await pg.evaluate("""fetch('audio-ko/index.json').then(r=>r.json()).then(idx=>{ const key=t=>String(t).replace(/\\s+/g,' ').trim();
          const sen=t=>String(t).split(/(?<=[.!?])\\s+/).map(x=>x.trim()).filter(Boolean); const all=new Set(), miss=new Set();
          for (const t of window.__KO_LOG) { const parts = idx[key(t)] ? [t] : sen(t); for (const p of parts) { all.add(key(p)); if (!idx[key(p)]) miss.add(key(p)); } }
          return {n:all.size, miss:[...miss], files:Object.keys(idx).length}; })""")
        pct = 100 * (cov['n'] - len(cov['miss'])) / max(1, cov['n'])
        print(f" 65 한국어 녹음: 읽은 문장 {cov['n']}개 중 녹음 있음 {pct:.1f}% (녹음 목록 {cov['files']}개)")
        if cov['files']: REQ['공통 65 읽은 한국어 문장 95% 이상 녹음'] = cov['n'] > 0 and pct >= 95
        else: print(' (녹음 파일이 아직 없어 공통 65는 건너뜀 — tools/ko_sentences.js로 목록을 만들고 make_ko_audio.py로 녹음하세요)'); print(' 빠진 문장:', cov['miss'][:8], '...')
        # ---- 미술관: 그린 순서 보기·내보내기 버튼 (AREQ-88·90) ----
        await pg.goto(URL); await pg.wait_for_timeout(300); await pg.click('[data-act=gallery]'); await pg.wait_for_timeout(600)
        nf = await pg.locator('.frame').count(); await pg.screenshot(path=f'../shots/{name}-7-gallery.png')
        await pg.locator('.frame').first.click(); await pg.wait_for_timeout(500)
        await pg.click('[data-act=replay]'); await pg.wait_for_timeout(600); playing = not await pg.evaluate("document.getElementById('replayCanvas').hidden")
        REQ['AREQ-88·90 미술관 액자·그린 순서 보기·내보내기'] = nf >= 2 and playing and await pg.locator('[data-act=share]').count() == 1 and await pg.locator('[data-act=more]').count() == 1
        # ---- 폰 세로: 그림판이 화면 밖으로 안 넘침 (공통 01) ----
        await pg.evaluate("YUNI.state.pos={u:1,d:1,s:2}; YUNI.state.log={}; localStorage.setItem('yuni-art-v1', JSON.stringify(YUNI.state))")
        await pg.goto(URL); await pg.wait_for_timeout(300); await pg.click('[data-act=go]'); await pg.wait_for_timeout(1200)
        fit = await pg.evaluate("(()=>{const r=document.querySelector('.board-wrap').getBoundingClientRect(); const t=document.querySelector('.tools').getBoundingClientRect(); return r.right<=innerWidth+1 && r.left>=-1 && t.right<=innerWidth+1 && document.documentElement.scrollWidth<=innerWidth+1})()")
        REQ['공통 01 그림판·도구 막대가 화면 폭 안에 있음'] = fit
        # 2단원 물고기: 겹쳐 그리기 기본(overlay), 4단원 얼굴: 보고 그리기 기본(look)
        m2 = await pg.evaluate("YUNI.lesson.trace")
        await pg.evaluate("YUNI.state.pos={u:3,d:1,s:2}; localStorage.setItem('yuni-art-v1', JSON.stringify(YUNI.state))"); await pg.goto(URL); await pg.wait_for_timeout(300); await pg.click('[data-act=go]'); await pg.wait_for_timeout(800)
        m4 = await pg.evaluate("YUNI.lesson.trace")
        REQ['AREQ-83 기본값: 1~3단원 겹쳐, 4단원부터 보고'] = m2 == 'overlay' and m4 == 'look'
        await pg.screenshot(path=f'../shots/{name}-8-face.png')
        # ---- 복습 손풀기 (공통 08): 힌트 2번 쓴 그림은 다음 날 손풀기 첫 번째로 ----
        await pg.evaluate("YUNI.state.pos={u:0,d:2,s:1}; YUNI.state.weak={lines:{n:0,date:'2020-01-01'}}; localStorage.setItem('yuni-art-v1', JSON.stringify(YUNI.state))"); await pg.goto(URL); await pg.wait_for_timeout(300); await pg.click('[data-act=go]'); await pg.wait_for_timeout(600)
        acts = await pg.evaluate("YUNI.lesson.acts.map(a=>({t:a.type, r:a.review||'', w:a.w&&a.w.id}))")
        print(' review warmups:', acts)
        REQ['공통 08 복습 모양이 손풀기 첫 번째, 손풀기 3개'] = len(acts) == 3 and acts[0]['r'] == 'lines'
        await pg.evaluate("YUNI.state.weak={}; localStorage.setItem('yuni-art-v1', JSON.stringify(YUNI.state))")
        # ---- 아빠 화면: 암호(61)·통계(62)·탭(63)·미술 카드 ----
        await pg.goto(URL); await pg.wait_for_timeout(300)
        await pg.click('[data-act=parent]'); await pg.wait_for_timeout(200)
        await pg.fill('#ans', '9999'); await pg.click('[data-act=ok]'); await pg.wait_for_timeout(200)
        no_open = await pg.locator('.ptabs').count() == 0
        await pg.fill('#ans', '1234'); await pg.click('[data-act=ok]'); await pg.wait_for_timeout(300)
        REQ['공통 61 암호 1234로 열림, 틀리면 안 열림'] = no_open and await pg.locator('.ptabs').count() == 1
        REQ['공통 63 탭 6개, 패널 1개만 보임'] = await pg.evaluate("document.querySelectorAll('.ptab').length===6 && [...document.querySelectorAll('.ppanel')].filter(p=>!p.hidden).length===1")
        await pg.click('[data-act=ptab][data-arg=stats]'); await pg.wait_for_timeout(200)
        REQ['공통 62 통계 탭 날짜별 7줄'] = await pg.evaluate("document.querySelectorAll('.stat-row').length===7 && document.querySelector('.stat-row.today')!==null")
        await pg.click('[data-act=ptab][data-arg=settings]'); await pg.wait_for_timeout(200)
        REQ['AREQ-94 리딩 캐릭터 6종'] = await pg.evaluate("document.querySelector('[data-set=leader]').options.length===6")
        REQ['AREQ-96·83 아빠 화면: 왼손·굵기·손바닥·겹쳐/보고 설정'] = await pg.evaluate("['leftHand','brush','palmReject','traceMode'].every(k=>document.querySelector(`[data-set=${k}]`))")
        await pg.select_option('[data-set=leftHand]', 'true'); await pg.select_option('[data-set=leader]', 'robot'); await pg.wait_for_timeout(200)
        await pg.click('[data-act=ptab][data-arg=progress]'); await pg.wait_for_timeout(200)
        REQ['공통 14·63 진도 초기화·미술관 내보내기 카드'] = await pg.locator('[data-act=resetprog]').count() == 1 and await pg.locator('[data-act=exportall]').count() == 1
        await pg.screenshot(path=f'../shots/{name}-7-parent.png')
        await pg.click('[data-act=spec]'); await pg.wait_for_timeout(600)
        REQ['공통 21 기획·변경 기록 보기'] = '요구사항' in await pg.inner_text('#spec')
        await pg.click('[data-act=back]'); await pg.wait_for_timeout(200); await pg.click('[data-act=home]'); await pg.wait_for_timeout(300)
        REQ['AREQ-94 캐릭터 바꾸면 홈에 반영'] = '🤖' in await pg.inner_text('.robot')
        # 왼손: 도구 막대가 그림판 왼쪽
        await pg.evaluate("YUNI.state.pos={u:0,d:1,s:2}; localStorage.setItem('yuni-art-v1', JSON.stringify(YUNI.state))"); await pg.goto(URL); await pg.wait_for_timeout(300); await pg.click('[data-act=go]'); await pg.wait_for_timeout(800)
        left = await pg.evaluate("(()=>{const s=document.querySelector('.studio'); const t=document.querySelector('.tools').getBoundingClientRect(); const b=document.querySelector('.board-wrap').getBoundingClientRect(); return s.classList.contains('left') && (t.left<=b.left+1 || t.top<b.top)})()")
        REQ['AREQ-96 왼손 설정 → 도구 막대 왼쪽(폰은 위)'] = left
        await pg.click('[data-act=quit]'); await pg.wait_for_timeout(200); await pg.click('[data-act=stickers]'); await pg.wait_for_timeout(300); await pg.screenshot(path=f'../shots/{name}-8-stickers.png')
        REQ['AREQ-93 스티커북 12페이지'] = '/ 12 페이지' in await pg.inner_text('body')
        await b.close()
    print(f'=== {name} ===')
    for k, v in REQ.items(): print(('OK  ' if v else 'FAIL'), k)
    if errs: print(' page errors:', errs[:5])
    return all(REQ.values()) and not errs

if __name__ == '__main__':
    a = sys.argv[1:] or ['tab', '1280', '800', '0']
    os.makedirs('../shots', exist_ok=True)
    ok = asyncio.run(run(a[0], int(a[1]), int(a[2]), a[3] == '1'))
    print('ALL OK' if ok else 'SOME FAILED'); sys.exit(0 if ok else 1)
