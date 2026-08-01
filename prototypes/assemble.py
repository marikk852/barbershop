#!/usr/bin/env python3
"""Собирает prototypes/index.html: заставка-гравировка поверх 3D-сцены."""

SCENE = '/Users/mac/Desktop/barbershop/prototypes/scene-3d.html'
OUT   = '/Users/mac/Desktop/barbershop/prototypes/index.html'

SPLASH_CSS = '''
/* ================= ЗАСТАВКА ================= */
#gl{opacity:0;transition:opacity 1.5s ease .15s}
#gl.on{opacity:1}

#splash{
  position:fixed;inset:0;z-index:30;display:grid;place-items:center;overflow:hidden;
  --red:#e02128;--red-lo:#8f1418;--steelC:#f4f6f8;
  --t-sweep:1.70s;--t-rule:1.85s;--t-word:2.00s;--t-sub:2.55s;
  background:
    radial-gradient(90% 65% at 50% 22%, #16181c 0%, transparent 62%),
    radial-gradient(120% 100% at 50% 55%, #0c0d10 0%, #050506 70%);
}
#splash.out{opacity:0;filter:blur(10px);pointer-events:none;
  transition:opacity .85s ease,filter .85s ease}
#splash::after{
  content:"";position:absolute;inset:0;pointer-events:none;z-index:6;
  background:radial-gradient(72% 58% at 50% 48%, transparent 38%, rgba(0,0,0,.78) 100%);
}
#splash .grain{
  position:absolute;inset:-60%;pointer-events:none;z-index:7;
  opacity:.13;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='sn'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23sn)'/%3E%3C/svg%3E");
  animation:sGrain 1.2s steps(4) infinite;
}
@keyframes sGrain{
  0%{transform:translate(0,0)}25%{transform:translate(-2%,1%)}
  50%{transform:translate(1%,-2%)}75%{transform:translate(-1%,-1%)}100%{transform:translate(0,0)}
}
#splash .lockup{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center}
#splash .markwrap{
  position:relative;width:min(30vw,260px);aspect-ratio:874/654;
  transform:scale(1.018);
  animation:sSettle 1.1s cubic-bezier(.16,1,.3,1) var(--t-sweep) forwards;
}
@keyframes sSettle{to{transform:scale(1)}}
#splash .mark{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
#splash .mark path{fill:none;stroke-width:160;stroke-linecap:round}

#splash .rule{
  width:min(26vw,220px);height:1px;margin-top:26px;
  background:linear-gradient(90deg,transparent,var(--red-lo) 18%,var(--red) 50%,var(--red-lo) 82%,transparent);
  transform:scaleX(0);opacity:0;
  animation:sRule .85s cubic-bezier(.16,1,.3,1) var(--t-rule) forwards;
}
@keyframes sRule{to{transform:scaleX(1);opacity:.85}}
#splash .word{
  margin-top:22px;display:flex;
  font-family:"Bodoni Moda",Didot,"Times New Roman",serif;
  font-weight:500;font-size:clamp(26px,4.4vw,46px);line-height:1;
  letter-spacing:.2em;text-indent:.2em;color:var(--steelC);
}
#splash .word span{
  display:inline-block;opacity:0;
  transform:translateY(18px) scale(.96);filter:blur(9px);
  animation:sLetter .95s cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes sLetter{to{opacity:1;transform:none;filter:blur(0)}}
#splash .word span:nth-child(1){animation-delay:calc(var(--t-word) + 0ms)}
#splash .word span:nth-child(2){animation-delay:calc(var(--t-word) + 60ms)}
#splash .word span:nth-child(3){animation-delay:calc(var(--t-word) + 120ms)}
#splash .word span:nth-child(4){animation-delay:calc(var(--t-word) + 180ms)}
#splash .word span:nth-child(5){animation-delay:calc(var(--t-word) + 240ms)}
#splash .word span:nth-child(6){animation-delay:calc(var(--t-word) + 300ms)}
#splash .word span:nth-child(7){animation-delay:calc(var(--t-word) + 360ms)}
#splash .word span:nth-child(8){animation-delay:calc(var(--t-word) + 420ms)}
#splash .sub{
  margin-top:14px;font-size:clamp(9px,1.1vw,12px);
  text-transform:uppercase;color:var(--red);opacity:0;
  letter-spacing:1.1em;text-indent:1.1em;
  animation:sSub 1.1s cubic-bezier(.16,1,.3,1) var(--t-sub) forwards;
}
@keyframes sSub{to{opacity:.92;letter-spacing:.46em;text-indent:.46em}}

#splash .cut{
  stroke-dasharray:1 2;stroke-dashoffset:1.02;
  animation:sDraw var(--d) cubic-bezier(.45,.05,.25,1) var(--s) forwards;
}
@keyframes sDraw{to{stroke-dashoffset:0}}
#splash .heat{
  stroke:#fff;stroke-width:150;opacity:.3;
  stroke-dasharray:1 2;stroke-dashoffset:1.02;
  animation:sDraw var(--d) cubic-bezier(.45,.05,.25,1) var(--s) forwards,
            sCool .42s ease-out calc(var(--s) + var(--d) - .16s) forwards;
  filter:url(#sSoften);
}
@keyframes sCool{to{opacity:0}}
#splash .spark{
  stroke:#fff;stroke-width:34;stroke-linecap:round;
  stroke-dasharray:.016 3;stroke-dashoffset:0;opacity:0;
  animation:sSpark var(--d) cubic-bezier(.45,.05,.25,1) var(--s) forwards,
            sSparkF var(--d) ease-out var(--s) forwards;
  filter:url(#sGlow);
}
@keyframes sSpark{to{stroke-dashoffset:-1}}
@keyframes sSparkF{0%{opacity:0}12%{opacity:1}82%{opacity:1}100%{opacity:0}}

#splash .sweep{
  position:absolute;inset:0;z-index:4;pointer-events:none;
  -webkit-mask-image:linear-gradient(100deg,transparent 44%,#000 50%,transparent 56%);
  mask-image:linear-gradient(100deg,transparent 44%,#000 50%,transparent 56%);
  -webkit-mask-size:300% 100%;mask-size:300% 100%;
  -webkit-mask-position:180% 0;mask-position:180% 0;
  animation:sSweep .95s cubic-bezier(.45,0,.25,1) var(--t-sweep) forwards;
}
#splash .sweep .mark path{stroke:#fff;opacity:.85;filter:url(#sSoften)}
@keyframes sSweep{to{-webkit-mask-position:-140% 0;mask-position:-140% 0}}

#splash .skip{
  position:absolute;right:22px;bottom:20px;z-index:9;
  border:1px solid #1d2126;background:transparent;color:#5a636e;
  font-family:"Barlow Condensed",sans-serif;font-size:12px;
  letter-spacing:.2em;text-transform:uppercase;
  padding:8px 18px;cursor:pointer;opacity:0;
  transition:color .2s,border-color .2s,background .2s;
  animation:sFade .5s ease-out .6s forwards;
}
#splash .skip:hover{color:#e8ecf1;border-color:#39414a;background:#0d0f12}
@keyframes sFade{to{opacity:1}}

@media (prefers-reduced-motion:reduce){
  #splash .grain,#splash::after{animation:none}
  #splash .heat,#splash .spark,#splash .sweep{display:none}
  #splash .cut{stroke-dashoffset:0;animation:none}
  #splash .rule{transform:scaleX(1);opacity:.85;animation:none}
  #splash .markwrap{transform:scale(1);animation:none}
  #splash .word span{opacity:1;transform:none;filter:none;animation:none}
  #splash .sub{opacity:.92;letter-spacing:.46em;text-indent:.46em;animation:none}
}
'''

SPLASH_HTML = '''<div id="splash">
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <linearGradient id="swg1" gradientUnits="userSpaceOnUse" x1="336" y1="353" x2="456" y2="887">
        <stop offset="0" stop-color="#ffffff"/><stop offset=".075" stop-color="#fefefe"/><stop offset=".5" stop-color="#838383"/><stop offset=".915" stop-color="#464646"/><stop offset="1" stop-color="#3a3a3a"/>
      </linearGradient>
      <linearGradient id="swg2" gradientUnits="userSpaceOnUse" x1="636" y1="411" x2="456" y2="887">
        <stop offset="0" stop-color="#f6f6f6"/><stop offset=".08" stop-color="#eeeeee"/><stop offset=".5" stop-color="#7d7d7d"/><stop offset=".92" stop-color="#454545"/><stop offset="1" stop-color="#3a3a3a"/>
      </linearGradient>
      <linearGradient id="swg3" gradientUnits="userSpaceOnUse" x1="636" y1="411" x2="796" y2="886">
        <stop offset="0" stop-color="#f6f6f6"/><stop offset=".08" stop-color="#eeeeee"/><stop offset=".5" stop-color="#7f7f7f"/><stop offset=".92" stop-color="#474747"/><stop offset="1" stop-color="#3c3c3c"/>
      </linearGradient>
      <linearGradient id="swg4" gradientUnits="userSpaceOnUse" x1="936" y1="353" x2="796" y2="886">
        <stop offset="0" stop-color="#ffffff"/><stop offset=".075" stop-color="#fefefe"/><stop offset=".5" stop-color="#878787"/><stop offset=".92" stop-color="#535353"/><stop offset="1" stop-color="#464646"/>
      </linearGradient>
      <filter id="sShadow" filterUnits="userSpaceOnUse" x="156" y="253" width="954" height="734">
        <feDropShadow dx="0" dy="6" stdDeviation="16" flood-color="#000" flood-opacity=".55"/>
      </filter>
      <filter id="sGlow" filterUnits="userSpaceOnUse" x="156" y="253" width="954" height="734">
        <feGaussianBlur stdDeviation="26" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="sSoften" filterUnits="userSpaceOnUse" x="156" y="253" width="954" height="734">
        <feGaussianBlur stdDeviation="7"/>
      </filter>
    </defs>
  </svg>

  <div class="grain"></div>
  <div class="lockup">
    <div class="markwrap">
      <svg class="mark" id="sMarkMain" viewBox="196 293 874 654" role="img" aria-label="W"></svg>
      <div class="sweep"><svg class="mark" id="sMarkSweep" viewBox="196 293 874 654" aria-hidden="true"></svg></div>
    </div>
    <div class="rule"></div>
    <div class="word" id="sWord"></div>
    <div class="sub">Barber · Chișinău</div>
  </div>
  <button class="skip" id="sSkip">Пропустить</button>
</div>
'''

SPLASH_JS = '''<script>
/* ================= ЗАСТАВКА: сборка знака и передача сцене ================= */
(function(){
  const BRAND = 'CONDREA';
  const STROKES = [
    {cls:'w-s1', d:'M336 433 L456 807', grad:'swg1', dur:.44, start:.18},
    {cls:'w-s2', d:'M456 807 L636 491', grad:'swg2', dur:.41, start:.56},
    {cls:'w-s3', d:'M636 491 L796 806', grad:'swg3', dur:.40, start:.91},
    {cls:'w-s4', d:'M796 806 L936 433', grad:'swg4', dur:.45, start:1.25},
  ];
  function buildMark(el, plain){
    el.innerHTML = STROKES.map(s=>{
      const v = `--d:${s.dur}s;--s:${s.start}s`;
      return plain
        ? `<path class="cut" d="${s.d}" stroke="#fff" pathLength="1" style="${v}"/>`
        : `<path class="cut" d="${s.d}" stroke="url(#${s.grad})" filter="url(#sShadow)" pathLength="1" style="${v}"/>
           <path class="heat" d="${s.d}" pathLength="1" style="${v}"/>
           <path class="spark" d="${s.d}" pathLength="1" style="${v}"/>`;
    }).join('');
  }

  const splash = document.getElementById('splash');
  const gl = document.getElementById('gl');
  const KEY = 'ws-intro-seen';
  let seen = null; try{ seen = localStorage.getItem(KEY); }catch(e){}

  function reveal(){ gl.classList.add('on'); }
  function finish(){
    try{ localStorage.setItem(KEY, Date.now()); }catch(e){}
    splash.classList.add('out');
    reveal();
    setTimeout(()=>splash.remove(), 950);
  }

  if(seen){ splash.remove(); reveal(); }
  else{
    buildMark(document.getElementById('sMarkMain'), false);
    buildMark(document.getElementById('sMarkSweep'), true);
    document.getElementById('sWord').innerHTML =
      [...BRAND].map(c=>`<span>${c}</span>`).join('');

    /* Автозакрытие ждёт двух условий, а не просто таймер:
       1) прошла минимальная длительность анимации (4.3s), чтобы её
          не обрывало на медленной сети раньше, чем она успела доиграть;
       2) сцена реально готова (модуль Three.js исполнился и отрендерил
          первый кадр) — иначе на медленном канале можно увидеть
          пустой канвас вместо шаветты.
       Жёсткий потолок в 7s не даёт застрять, если сцена не поднимется
       вовсе (например WebGL недоступен) — тогда просто показываем
       чёрный кадр под заставкой, ничего не сломано. */
    const MIN_MS = 4300, MAX_MS = 7000, t0 = performance.now();
    let done = false;
    function ready(){ return !!(window.__scene && gl.width > 0); }
    function tick(){
      if(done) return;
      const elapsed = performance.now() - t0;
      if((elapsed >= MIN_MS && ready()) || elapsed >= MAX_MS){ done = true; finish(); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    function skipNow(){ if(done) return; done = true; finish(); }
    document.getElementById('sSkip').addEventListener('click', skipNow);
    document.addEventListener('keydown', e=>{
      if(e.code==='Escape' && document.getElementById('splash')) skipNow();
    });
  }

  /* повтор интро из панели сцены */
  const bIntro = document.getElementById('bIntro');
  if(bIntro) bIntro.addEventListener('click', ()=>{
    try{ localStorage.removeItem(KEY); }catch(e){}
    location.reload();
  });
})();
</script>
'''

s = open(SCENE, encoding='utf-8').read()

s = s.replace('<title>Шаветта — 3D</title>', '<title>W Condrea Barber — интро</title>')
s = s.replace('</style>', SPLASH_CSS + '</style>')
s = s.replace('<canvas id="gl"></canvas>', SPLASH_HTML + '\n<canvas id="gl"></canvas>')
s = s.replace('<button id="bEnd">В конец</button>',
              '<button id="bEnd">В конец</button>\n  <button id="bIntro">Интро</button>')
s = s.replace('</body>', SPLASH_JS + '</body>')

open(OUT, 'w', encoding='utf-8').write(s)
print('index.html собран:', len(s), 'байт')
