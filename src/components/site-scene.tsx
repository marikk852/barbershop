"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import styles from "./site-scene.module.css";

const NAV_ITEMS = [
  { num: "01", key: "booking", href: "/booking" },
  { num: "02", key: "bio", href: "/bio" },
  { num: "03", key: "price", href: "/price" },
  { num: "04", key: "portfolio", href: "/portfolio" },
] as const;

const BRAND = "CONDREA";

function isHomePathname(pathname: string) {
  if (pathname === "/") return true;
  return routing.locales.some((l) => pathname === `/${l}`);
}

/* ============================================================
   ГЕОМЕТРИЯ ШАВЕТТЫ — снята с фото-референса (см. предыдущий
   компонент home-experience.tsx, который этот файл заменяет).
   ============================================================ */
const EX_BLADE = { depth: 0.05, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.015, bevelSegments: 3, curveSegments: 8 };
const EX_SCALE = { depth: 0.085, bevelEnabled: true, bevelThickness: 0.055, bevelSize: 0.06, bevelSegments: 7, curveSegments: 8 };
const GAP = 0.135;
const RING_R = 0.12;

const BLADE_PTS: [number, number][] = [[0.15,0.17],[-0.13,0.17],[-0.126,-0.269],[-0.204,-1.329],[-0.33,-3.487],[-0.31,-3.569],[-0.293,-3.593],[-0.287,-3.586],[-0.248,-3.615],[-0.251,-3.629],[-0.232,-3.648],[-0.133,-3.702],[-0.038,-3.72],[0.139,-3.659],[0.198,-3.622],[0.246,-3.567],[0.301,-2.232],[0.299,-2.152],[0.28,-2.095],[0.126,-1.798],[0.076,-1.638],[0.098,-1.58],[0.157,-1.53],[0.159,-1.513],[0.164,-1.405],[0.155,-1.379],[0.17,-1.323],[0.218,-0.484],[0.191,-0.455],[0.176,-0.498],[0.166,-0.506],[0.146,-0.496],[0.148,-0.402],[0.072,-0.353],[0.014,-0.296]];
const HOOK_PTS: [number, number][] = [[0.02,-0.06],[0.16,-0.06],[0.217,0.107],[0.224,0.282],[0.236,0.308],[0.227,0.322],[0.236,0.371],[0.224,0.502],[0.235,0.544],[0.219,0.665],[0.21,0.704],[0.187,0.708],[0.175,0.78],[0.119,0.942],[0.074,0.986],[0.03,0.979],[0.011,0.939],[0.055,0.625],[0.045,0.436],[0.023,0.365],[-0.055,0.211]];
const SCALE_PTS: [number, number][] = [[-0.067,0.238],[-0.137,0.216],[-0.229,0.085],[-0.249,0.022],[-0.248,-0.021],[-0.211,-0.015],[-0.196,-0.081],[-0.206,-0.089],[-0.183,-0.165],[-0.149,-0.427],[-0.147,-0.484],[-0.179,-0.506],[-0.182,-0.533],[-0.137,-1.13],[-0.134,-1.674],[-0.173,-2.195],[-0.252,-2.682],[-0.368,-3.169],[-0.541,-3.716],[-0.541,-3.753],[-0.513,-3.799],[-0.466,-3.829],[-0.398,-3.848],[-0.231,-3.844],[-0.066,-3.815],[0.024,-3.754],[0.08,-3.671],[0.121,-3.561],[0.196,-3.207],[0.29,-2.584],[0.327,-2.141],[0.339,-1.753],[0.329,-1.295],[0.297,-0.851],[0.228,-0.352],[0.156,-0.0],[0.124,0.099],[0.086,0.166],[0.009,0.223]];
const INSERT_PTS: [number, number][] = [[-0.085,-0.55],[-0.094,-0.654],[-0.101,-0.758],[-0.109,-0.861],[-0.115,-0.965],[-0.122,-1.069],[-0.128,-1.173],[-0.135,-1.277],[-0.142,-1.38],[-0.148,-1.484],[-0.155,-1.588],[-0.161,-1.692],[-0.167,-1.796],[-0.173,-1.899],[-0.18,-2.003],[-0.186,-2.107],[-0.193,-2.211],[-0.199,-2.314],[-0.205,-2.418],[-0.212,-2.522],[-0.217,-2.626],[-0.222,-2.73],[-0.229,-2.833],[-0.235,-2.937],[-0.24,-3.041],[-0.246,-3.145],[-0.253,-3.249],[-0.259,-3.352],[-0.258,-3.456],[-0.251,-3.56],[-0.283,-3.56],[-0.29,-3.456],[-0.291,-3.352],[-0.285,-3.249],[-0.278,-3.145],[-0.272,-3.041],[-0.267,-2.937],[-0.261,-2.833],[-0.254,-2.73],[-0.249,-2.626],[-0.244,-2.522],[-0.237,-2.418],[-0.231,-2.314],[-0.225,-2.211],[-0.218,-2.107],[-0.212,-2.003],[-0.205,-1.899],[-0.199,-1.796],[-0.193,-1.692],[-0.187,-1.588],[-0.18,-1.484],[-0.174,-1.38],[-0.167,-1.277],[-0.16,-1.173],[-0.154,-1.069],[-0.147,-0.965],[-0.141,-0.861],[-0.133,-0.758],[-0.126,-0.654],[-0.117,-0.55]];

function ptsShape(pts: [number, number][]) {
  const s = new THREE.Shape();
  pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  s.autoClose = true;
  return s;
}
function makeBladeBody() {
  const g = new THREE.ExtrudeGeometry(ptsShape(BLADE_PTS), EX_BLADE);
  g.translate(0, 0, -0.025);
  return g;
}
function makeHook() {
  const g = new THREE.ExtrudeGeometry(ptsShape(HOOK_PTS), EX_BLADE);
  g.translate(0, 0, -0.024);
  return g;
}
function makeInsert() {
  const g = new THREE.ExtrudeGeometry(ptsShape(INSERT_PTS), { depth: 0.012, bevelEnabled: false });
  g.translate(0, 0, 0.03);
  return g;
}
function makeScale() {
  const g = new THREE.ExtrudeGeometry(ptsShape(SCALE_PTS), EX_SCALE);
  g.translate(0, 0, -0.0425);
  return g;
}

const STROKES = [
  { d: "M336 433 L456 807", grad: "swg1", dur: 0.44, start: 0.18 },
  { d: "M456 807 L636 491", grad: "swg2", dur: 0.41, start: 0.56 },
  { d: "M636 491 L796 806", grad: "swg3", dur: 0.4, start: 0.91 },
  { d: "M796 806 L936 433", grad: "swg4", dur: 0.45, start: 1.25 },
];

export function SiteScene() {
  const t = useTranslations("Home");
  const nav = useTranslations("Nav");

  // Решение "показывать ли героическое интро" принимается один раз,
  // синхронно, ДО первой отрисовки (useLayoutEffect) — чтобы не было
  // вспышки "сначала открытая сцена, потом вдруг заставка". Интро (заставка
  // + свайп) показывается на КАЖДОМ заходе на главную — не только на первый
  // раз — таково явное требование: сайт должен каждый раз начинаться с
  // анимации. SSR по умолчанию рендерит безопасный вариант без интро (не
  // зная pathname), useLayoutEffect синхронно поправляет его ДО отрисовки
  // кадра браузером.
  const [heroFirstVisit, setHeroFirstVisit] = useState(false);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    // Осознанное исключение из "не вызывать setState в эффекте": решение
    // зависит от window.location — источника, недоступного на сервере.
    if (isHomePathname(window.location.pathname)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHeroFirstVisit(true);
    }
    setReady(true);
  }, []);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const splashRef = useRef<HTMLDivElement>(null);
  const markMainRef = useRef<SVGSVGElement>(null);
  const markSweepRef = useRef<SVGSVGElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const heroNavRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const fallbackRef = useRef<HTMLDivElement>(null);
  const heroLinkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const heroLensRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (!ready) return;

    const canvas = canvasRef.current!;
    const splash = splashRef.current; // null, если !isHero — заставка не рендерится
    const heroNavEl = heroNavRef.current!;
    const hintEl = hintRef.current; // null, если !isHero
    const heroLinks = heroLinkRefs.current.filter((a): a is HTMLAnchorElement => !!a);
    // Линзы liquid-glass — по одному <canvas> на пункт меню, см. drawLenses()
    // в setup3D(). Индексация не важна (каждый канвас сам знает свой
    // getBoundingClientRect), поэтому просто фильтруем null'ы.
    const lensCanvases = heroLensRefs.current.filter((c): c is HTMLCanvasElement => !!c);

    let sceneReady = false;
    const isHero = heroFirstVisit;

    // ---------- заставка ----------
    function buildMark(el: SVGSVGElement | null, plain: boolean) {
      if (!el) return;
      el.innerHTML = STROKES.map((s) => {
        const v = `--d:${s.dur}s;--s:${s.start}s`;
        return plain
          ? `<path class="${styles.cut}" d="${s.d}" stroke="#fff" pathLength="1" style="${v}"/>`
          : `<path class="${styles.cut}" d="${s.d}" stroke="url(#${s.grad})" filter="url(#sShadow)" pathLength="1" style="${v}"/>
             <path class="${styles.heat}" d="${s.d}" pathLength="1" style="${v}"/>
             <path class="${styles.spark}" d="${s.d}" pathLength="1" style="${v}"/>`;
      }).join("");
    }

    function reveal() {
      canvas.classList.add(styles.glOn);
    }
    let splashDone = !isHero;
    function finishSplash() {
      splash?.classList.add(styles.splashOut);
      reveal();
      setTimeout(() => splash?.remove(), 950);
    }

    // Пока клинок закрыт и ждёт свайпа, страница не должна скроллиться —
    // иначе браузер параллельно с нашим жестом ещё и листает контент под
    // сценой, и пользователь видит двигающийся ползунок скролла посреди
    // интро. Снимается сразу как клинок раскрылся (см. ниже, p > 0.985)
    // и при любом размонтировании (уход со страницы посреди интро).
    const prevBodyOverflow = document.body.style.overflow;
    let scrollLocked = false;
    function lockScroll() {
      if (scrollLocked) return;
      scrollLocked = true;
      document.body.style.overflow = "hidden";
    }
    function unlockScroll() {
      if (!scrollLocked) return;
      scrollLocked = false;
      document.body.style.overflow = prevBodyOverflow;
    }

    let introRaf = 0;
    const skipBtn = skipRef.current;
    let skipNow = () => {};
    if (isHero) {
      lockScroll();
      buildMark(markMainRef.current, false);
      buildMark(markSweepRef.current, true);
      if (wordRef.current) {
        wordRef.current.innerHTML = [...BRAND].map((c) => `<span>${c}</span>`).join("");
      }
      const MIN_MS = 4300, MAX_MS = 7000, t0 = performance.now();
      const tick = () => {
        if (splashDone) return;
        const elapsed = performance.now() - t0;
        if ((elapsed >= MIN_MS && sceneReady) || elapsed >= MAX_MS) {
          splashDone = true;
          finishSplash();
          return;
        }
        introRaf = requestAnimationFrame(tick);
      };
      introRaf = requestAnimationFrame(tick);
      skipNow = () => {
        if (splashDone) return;
        splashDone = true;
        cancelAnimationFrame(introRaf);
        finishSplash();
      };
      skipBtn?.addEventListener("click", skipNow);
    } else {
      reveal();
    }
    const onEscape = (e: KeyboardEvent) => {
      if (isHero && e.code === "Escape" && !splashDone) skipNow();
    };
    document.addEventListener("keydown", onEscape);

    // ---------- 3D-сцена (отложена на кадр — не блокировать отрисовку заставки) ----------
    function setup3D(): (() => void) | null {
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      } catch {
        if (fallbackRef.current) fallbackRef.current.style.display = "grid";
        return null;
      }
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(DPR);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.98;
      renderer.setClearColor(0x000000, 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

      function buildStudio() {
        const env = new THREE.Scene();
        env.background = new THREE.Color(0x000000);
        const gradTex = (a: number, b: number) => {
          const c = document.createElement("canvas");
          c.width = 4;
          c.height = 256;
          const ctx = c.getContext("2d")!;
          const g = ctx.createLinearGradient(0, 0, 0, 256);
          const hex = (v: number) => "#" + [0, 0, 0].map(() => Math.round(Math.min(1, v) * 255).toString(16).padStart(2, "0")).join("");
          g.addColorStop(0, hex(a));
          g.addColorStop(1, hex(b));
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, 4, 256);
          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          return tex;
        };
        const panel = (w: number, h: number, x: number, y: number, z: number, rx: number, ry: number, power: number, fade = 0.25) => {
          const m = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ map: gradTex(1, fade), color: new THREE.Color(power, power, power), side: THREE.DoubleSide })
          );
          m.position.set(x, y, z);
          m.rotation.set(rx, ry, 0);
          env.add(m);
        };
        panel(16, 5, -4, 9, 2, Math.PI / 2, 0, 10.0, 0.22);
        panel(26, 18, 0, 0, 15, 0, 0, 1.05, 0.16);
        panel(2.6, 16, -8, 1, 3, 0, Math.PI / 2, 9.0, 0.15);
        panel(1.4, 14, 8, 0, 3, 0, -Math.PI / 2, 5.0, 0.2);
        panel(8, 8, -2, 3, -11, 0, 0, 4.0, 0.3);
        panel(12, 2, 0, -7, 3, -Math.PI / 2, 0, 1.2, 0.4);
        const pmrem = new THREE.PMREMGenerator(renderer);
        pmrem.compileEquirectangularShader();
        const rt = pmrem.fromScene(env, 0.03);
        pmrem.dispose();
        env.traverse((o) => {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat?.dispose?.();
        });
        return rt.texture;
      }
      scene.environment = buildStudio();

      const steel = new THREE.MeshPhysicalMaterial({ color: 0xeef2f6, metalness: 1, roughness: 0.115, envMapIntensity: 1.9, clearcoat: 0 });
      steel.anisotropy = 0.55;
      steel.anisotropyRotation = Math.PI / 2;
      const steelDark = new THREE.MeshPhysicalMaterial({ color: 0xbfc6cd, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
      const bladeLine = new THREE.MeshPhysicalMaterial({ color: 0x24272b, metalness: 1, roughness: 0.42, envMapIntensity: 0.8 });
      const handleMat = new THREE.MeshPhysicalMaterial({ color: 0xd81f26, metalness: 0, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.045, envMapIntensity: 1.7 });

      function makeEyelet() {
        const grp = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R * 0.74, RING_R * 0.26, 14, 30), steel);
        const hole = new THREE.Mesh(new THREE.CircleGeometry(RING_R * 0.52, 26), bladeLine);
        hole.position.z = 0.004;
        grp.add(ring, hole);
        return grp;
      }

      const razor = new THREE.Group();
      const bladeG = new THREE.Group();
      const handG = new THREE.Group();

      const bladeMesh = new THREE.Mesh(makeBladeBody(), steel);
      const hookMesh = new THREE.Mesh(makeHook(), steel);
      const insMesh = new THREE.Mesh(makeInsert(), bladeLine);
      bladeG.add(bladeMesh, hookMesh, insMesh);

      const scaleGeo = makeScale();
      const scaleA = new THREE.Mesh(scaleGeo, handleMat);
      scaleA.position.z = GAP;
      const scaleB = new THREE.Mesh(scaleGeo, handleMat);
      scaleB.position.z = -GAP;
      const eyeA = makeEyelet();
      eyeA.position.z = GAP + 0.1;
      const eyeB = makeEyelet();
      eyeB.position.z = -GAP - 0.1;
      eyeB.rotation.y = Math.PI;
      handG.add(scaleA, scaleB, eyeA, eyeB);

      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 2 * GAP + 0.24, 20), steelDark);
      pin.rotation.x = Math.PI / 2;
      razor.add(pin, bladeG, handG);
      scene.add(razor);

      const HANDLE_DEG = 32.04;
      const BLADE_IDLE = -19.01;
      const BLADE_OPEN = HANDLE_DEG - 180;
      const d2r = THREE.MathUtils.degToRad;

      handG.rotation.z = d2r(HANDLE_DEG);

      function measureHalf(lookPoint: THREE.Vector3) {
        const box = new THREE.Box3().setFromObject(razor);
        return {
          w: Math.max(box.max.x - lookPoint.x, lookPoint.x - box.min.x),
          h: Math.max(box.max.y - lookPoint.y, lookPoint.y - box.min.y),
        };
      }
      bladeG.rotation.z = d2r(BLADE_IDLE);
      razor.rotation.z = 0;
      const IDLE_HALF = measureHalf(new THREE.Vector3(0, -1.55, 0));
      bladeG.rotation.z = d2r(BLADE_OPEN);
      razor.rotation.z = d2r(-HANDLE_DEG);
      const FINAL_HALF = measureHalf(new THREE.Vector3(-0.33, 2.42, 0));

      const FRAME_MARGIN = 1.18;
      function clampFov(deg: number) {
        return Math.min(58, Math.max(18, deg));
      }
      function fitFov(distance: number, halfW: number, halfH: number, aspect: number, margin: number) {
        const h = halfH * margin, w = halfW * margin;
        const vFovForHeight = 2 * Math.atan(h / distance);
        const vFovForWidth = 2 * Math.atan(w / aspect / distance);
        return clampFov(THREE.MathUtils.radToDeg(Math.max(vFovForHeight, vFovForWidth)));
      }

      // ---------- состояние ----------
      // p: 0 (закрыта) → 1 (открыта, вертикальный финал) — только в hero;
      // на остальных страницах/визитах сцена уже открыта с самого начала.
      // Клинок больше никуда не "стыкуется" — открытая поза постоянна.
      let p = isHero ? 0 : 1, pTarget = isHero ? 0 : 1;
      let spin = 0, spinVel = 0;
      let autoSpin = 0;
      let idleT = 0;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      // Медленное постоянное вращение в пассивном состоянии — "продуктовая
      // витрина", а не статичная картинка.
      const AUTO_SPIN_SPEED = 0.055;

      const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
      const lerp = (a: number, b: number, tt: number) => a + (b - a) * tt;
      const seg = (x: number, a: number, b: number) => {
        const tt = clamp((x - a) / (b - a), 0, 1);
        return tt * tt * (3 - 2 * tt);
      };

      // ---------- жесты (только в hero, пока клинок не раскрыт до конца) ----------
      let drag = false, axis: "x" | "y" | null = null, lastX = 0, lastY = 0, startX = 0, startY = 0;
      const gesturesLive = () => isHero && pTarget < 1;
      const onPointerDown = (e: PointerEvent) => {
        if (!gesturesLive()) return;
        drag = true;
        axis = null;
        startX = lastX = e.clientX;
        startY = lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!drag) return;
        const dx = e.clientX - lastX;
        if (!axis) {
          const tx = Math.abs(e.clientX - startX), ty = Math.abs(e.clientY - startY);
          if (Math.max(tx, ty) > 7) axis = tx > ty ? "x" : "y";
        }
        if (axis === "x") spinVel += dx * 0.00042;
        // 0.0026 требовало ~385px суммарного протяга, чтобы раскрыть до
        // конца — на телефоне обычный свайп короче, и не хватало одного
        // жеста. Подняли чувствительность почти втрое: полного открытия
        // теперь хватает на один нормальный свайп.
        if (axis === "y") pTarget = clamp(pTarget + (lastY - e.clientY) * 0.007, 0, 1);
        lastX = e.clientX;
        lastY = e.clientY;
      };
      const onPointerStop = () => {
        drag = false;
        axis = null;
      };
      const onWheel = (e: WheelEvent) => {
        if (!gesturesLive()) return;
        e.preventDefault();
        pTarget = clamp(pTarget + e.deltaY * 0.0011, 0, 1);
      };
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerStop);
      canvas.addEventListener("pointercancel", onPointerStop);
      canvas.addEventListener("wheel", onWheel, { passive: false });

      // ---------- камера ----------
      const camFrom = new THREE.Vector3(0, 0.0, 10.2);
      const camTo = new THREE.Vector3(-0.33, 2.42, 1.82);
      const lookFrom = new THREE.Vector3(0, -1.55, 0);
      const lookTo = new THREE.Vector3(-0.33, 2.42, 0);
      const tmp = new THREE.Vector3();

      // ---------- чёрно-белый текст меню по фону под ним ----------
      // mix-blend-mode здесь не работает (см. комментарий в CSS-модуле про
      // position:fixed и стекинг-контексты), поэтому читаем реальный пиксель
      // сцены под каждым лейблом и переключаем цвет вручную. Читать напрямую
      // из основного канваса (gl.readPixels) нельзя — рендерер создан с
      // antialias:true, дефолтный буфer мультисемплирован, и синхронное
      // чтение из него до имплицитного резолва отдаёт нули/мусор в реальных
      // браузерах с настоящим GPU (в headless software-рендере это случайно
      // "работало", поэтому баг не был виден в тестах). Поэтому рендерим
      // сцену второй раз в отдельный НЕ мультисемплированный offscreen-таргет
      // уменьшенного размера специально для замера — дороже одного кадра, но
      // происходит лишь несколько раз в секунду, а не каждый кадр.
      const PICK_SCALE = 0.25;
      const pickTarget = new THREE.WebGLRenderTarget(1, 1);
      const pixelBuf = new Uint8Array(4);
      // Красим ПОБУКВЕННО, а не весь лейбл разом — каждая буква реагирует
      // на то, что конкретно под ней (одно слово может наполовину лежать
      // на стали, наполовину на чёрном фоне).
      const charEls = heroLinks.flatMap((a) => [
        ...Array.from(a.querySelectorAll<HTMLSpanElement>(`.${styles.numChar}`)),
        ...Array.from(a.querySelectorAll<HTMLSpanElement>(`.${styles.lblChar}`)),
      ]);
      let colorSampleAcc = 0;
      const COLOR_SAMPLE_INTERVAL = 1 / 8; // ~8 замеров в секунду

      function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        pickTarget.setSize(Math.max(1, Math.round(w * PICK_SCALE)), Math.max(1, Math.round(h * PICK_SCALE)));
      }
      window.addEventListener("resize", resize);
      resize();

      // Three.js применяет toneMapping/sRGB-гамму только к тому, что реально
      // попадает на экран (канвас); произвольный WebGLRenderTarget получает
      // "сырые" линейные значения — тот же самый видимый светлый пиксель
      // читается из pickTarget заметно темнее, чем он выглядит на экране.
      // Без этой поправки почти всё читалось бы как "тёмное".
      function linearToSrgb8(v: number) {
        const c = v / 255;
        const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
        return Math.max(0, Math.min(255, s * 255));
      }

      function sampleLabelColors() {
        renderer.setRenderTarget(pickTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);

        const pw = pickTarget.width;
        const ph = pickTarget.height;
        charEls.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return;
          // Нормированные координаты (доля ширины/высоты окна) — не зависят
          // от DPR и от того, что pickTarget меньше основного канваса.
          const nx = (r.left + r.width / 2) / window.innerWidth;
          const nyTop = (r.top + r.height / 2) / window.innerHeight;
          const cx = Math.round(nx * pw);
          const py = Math.round((1 - nyTop) * ph); // WebGL — координата Y снизу вверх
          if (cx < 0 || cx >= pw || py < 0 || py >= ph) return;
          renderer.readRenderTargetPixels(pickTarget, cx, py, 1, 1, pixelBuf);
          const lum =
            0.299 * linearToSrgb8(pixelBuf[0]) + 0.587 * linearToSrgb8(pixelBuf[1]) + 0.114 * linearToSrgb8(pixelBuf[2]);
          // Порог занижен специально: клинок затенён градиентом (у первого
          // пункта меню, ближе к кончику, сталь заметно темнее, чем ниже
          // по рукояти) — даже самая тёмная часть стали (~120 sRGB) всё
          // равно намного светлее истинно чёрного фона (~0-20), так что
          // порог 55 уверенно разделяет их с запасом на обе стороны.
          el.style.color = lum > 55 ? "#111319" : "#ffffff";
        });
      }

      // ---------- линза liquid-glass в капсулах меню ----------
      // У каждого пункта меню свой <canvas>-"глазок": несколько раз в
      // секунду забирает область РЕАЛЬНОЙ сцены прямо с основного канваса
      // (drawImage между canvas-элементами — в отличие от gl.readPixels —
      // сам делает implicit resolve мультисемплированного буфера, поэтому
      // второй offscreen-таргет тут не нужен, pickTarget используется
      // только для побуквенного цвета текста выше) и рисует её с лёгким
      // увеличением через drawImage — дешёвый трюк "линзы", без ручного
      // попиксельного сдвига.
      const lensCtxs = lensCanvases.map((c) => c.getContext("2d"));
      const LENS_ZOOM = 1.18;
      const LENS_SAMPLE_INTERVAL = 1 / 6; // ~6 обновлений в секунду
      // Искажение — только тонким кольцом у самого края капсулы (толще
      // видимой линии border, чтобы "толстое стекло" читалось), а не на
      // всю кнопку: если линза покрывает весь текст, буквы перестают
      // читаться, даже с побуквенной подгонкой чёрный/белый. Центр после
      // "выкусывания" остаётся настоящим прозрачным стеклом — там снова
      // виден неискажённый фон, как и было до линзы.
      const LENS_RING = 15; // CSS px
      // Резкая граница между кольцом-линзой и прозрачным центром была
      // заметна как жёсткий шов. blur() на самой стирающей заливке
      // (ниже) размывает именно край erasure в мягкий градиент — дешевле
      // и надёжнее, чем городить отдельную radial-gradient маску под
      // форму таблетки.
      const LENS_FEATHER = 10; // CSS px
      let lensSampleAcc = 0;
      let lensDrawnStatic = false;

      function drawLenses() {
        if (!lensCanvases.length) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        lensCanvases.forEach((lens, i) => {
          const ctx = lensCtxs[i];
          if (!ctx) return;
          const r = lens.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          // Пиксельный буфер канваса держим в реальном разрешении экрана
          // (а не в CSS-пикселях) — иначе на Retina линза мылится.
          const w = Math.max(1, Math.round(r.width * dpr));
          const h = Math.max(1, Math.round(r.height * dpr));
          if (lens.width !== w) lens.width = w;
          if (lens.height !== h) lens.height = h;
          // Область захвата — капсула, чуть уменьшенная (делим на зум),
          // так что после растяжения в drawImage она ровно заполнит канвас
          // с эффектом лёгкого увеличения.
          const cx = (r.left + r.width / 2) * dpr;
          const cy = (r.top + r.height / 2) * dpr;
          const sw = (r.width / LENS_ZOOM) * dpr;
          const sh = (r.height / LENS_ZOOM) * dpr;
          const sx = cx - sw / 2;
          const sy = cy - sh / 2;
          ctx.clearRect(0, 0, lens.width, lens.height);
          try {
            ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, lens.width, lens.height);
          } catch {
            // Капсула частично уехала за край экрана — пропускаем кадр,
            // не критично при следующем обновлении через 1/6с.
          }
          // Выкусываем центр, оставляя только кольцо у края видимым —
          // destination-out стирает уже нарисованное независимо от формы
          // капсулы (не круг, а вытянутая "таблетка"), поэтому не нужна
          // отдельная math под radial-gradient маску под её пропорции.
          const ring = LENS_RING * dpr;
          const iw = lens.width - ring * 2;
          const ih = lens.height - ring * 2;
          if (iw > 0 && ih > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "destination-out";
            ctx.filter = `blur(${LENS_FEATHER * dpr}px)`;
            ctx.beginPath();
            ctx.roundRect(ring, ring, iw, ih, Math.min(ih, iw) / 2);
            ctx.fill();
            ctx.restore();
          }
        });
      }

      let last = performance.now();
      let rafId = 0;

      function frame(now: number) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        idleT += dt;

        p += (pTarget - p) * Math.min(1, dt * 7);
        spin += spinVel;
        spinVel *= Math.pow(0.92, dt * 60);
        if (p > 0.35) spin *= Math.pow(0.965, dt * 60);
        if (!reduced) autoSpin += dt * AUTO_SPIN_SPEED;

        // как только клинок полностью раскрыт — отпускаем перехват жестов
        // с канваса и разблокируем скролл страницы (иначе он мешал бы
        // прокручивать страницу под сценой)
        if (isHero && p > 0.985 && canvas.classList.contains(styles.heroInteractive)) {
          canvas.classList.remove(styles.heroInteractive);
          unlockScroll();
        }

        const open = seg(p, 0.05, 0.55);
        const zoom = seg(p, 0.45, 1);
        const heroMenu = seg(p, 0.88, 1);

        bladeG.rotation.z = d2r(lerp(BLADE_IDLE, BLADE_OPEN, open));

        // Парение и покачивание — только пока клинок ЗАКРЫТ и ждёт жеста
        // (пассивное состояние "до сцены"); как только начал открываться,
        // оба эффекта гаснут к (1 - zoom) = 0. Медленное вращение (autoSpin)
        // — наоборот: тут не гаснет, а появляется ПОСЛЕ того, как меню
        // полностью показано (heroMenu → 1), и продолжается постоянно на
        // любой странице — клинок остаётся "живым" не только в момент
        // ожидания свайпа, но и всё время, пока служит шапкой сайта.
        const floatY = reduced ? 0 : Math.sin(idleT * 0.85) * 0.085 + Math.sin(idleT * 0.37) * 0.045;
        const tiltX = reduced ? 0 : Math.sin(idleT * 0.56) * 0.045 + Math.sin(idleT * 0.26) * 0.02;
        const driftY = reduced ? 0 : Math.sin(idleT * 0.31) * 0.1;
        const spinAmount = Math.max(1 - zoom, heroMenu);

        razor.position.y = floatY * (1 - zoom);
        razor.rotation.x = tiltX * (1 - zoom);
        razor.rotation.y = spin + autoSpin * spinAmount + driftY * (1 - zoom);

        const vertZ = lerp(0, -HANDLE_DEG, zoom);
        razor.rotation.z = d2r(vertZ);

        camera.position.lerpVectors(camFrom, camTo, zoom);
        const lookPoint = tmp.lerpVectors(lookFrom, lookTo, zoom);
        camera.lookAt(lookPoint);

        const halfW = lerp(IDLE_HALF.w, FINAL_HALF.w, zoom);
        const halfH = lerp(IDLE_HALF.h, FINAL_HALF.h, zoom);
        const dist = camera.position.distanceTo(lookPoint);
        const fov = fitFov(dist, halfW, halfH, camera.aspect, FRAME_MARGIN);
        if (Math.abs(camera.fov - fov) > 0.02) {
          camera.fov = fov;
          camera.updateProjectionMatrix();
        }

        // ---------- меню на клинке (вертикальное, постоянное) ----------
        if (heroMenu > 0) {
          bladeMesh.updateWorldMatrix(true, false);
          tmp.set(0, -2.35, 0.08).applyMatrix4(bladeMesh.matrixWorld).project(camera);
          const sx = (tmp.x * 0.5 + 0.5) * window.innerWidth;
          // 28% ширины экрана нормально смотрится на десктопе (~360px на
          // 1280px), но на телефоне (390px) даёт всего ~109px — подписи
          // ломаются на каждом слове. Снизу зажимаем разумным минимумом,
          // сверху — чтобы не расползалось на весь широкий десктоп-экран.
          const wNav = clamp(window.innerWidth * 0.42, 230, 380);
          const pad = 16;
          // Сдвиг меню левее на 30% его собственной ширины — применяем
          // ПОСЛЕ вписывания в экран, а не до: если применить до, на узких
          // экранах якорь (sx) часто настолько близко к правому краю, что
          // ограничение "не вылезай вправо" полностью съедает сдвиг влево
          // (именно так и было на мобильном — 30% считались, но тут же
          // перекрывались этим же clamp'ом). Сдвигаем уже вписанную позицию,
          // ограничивая только слева, чтобы не улететь за левый край.
          const fitted = clamp(sx - wNav * 0.42, pad, window.innerWidth - wNav - pad);
          const navLeft = Math.max(pad, fitted - wNav * 0.3);
          heroNavEl.style.left = navLeft + "px";
          heroNavEl.style.width = wNav + "px";
          heroNavEl.style.opacity = "1";
        } else {
          heroNavEl.style.opacity = "0";
        }
        heroLinks.forEach((a, i) => {
          const lt = clamp((heroMenu - i * 0.05) / (1 - i * 0.05), 0, 1);
          a.style.opacity = String(lt);
          // Как только появление закончилось — снимаем инлайновый transform
          // полностью (а не выставляем translateX(0)): иначе он на каждом
          // кадре перебивает CSS-hover капсулы (:hover задаёт translateX(4px),
          // но инлайн-стиль всегда сильнее правил из таблицы стилей).
          a.style.transform = lt > 0.999 ? "" : `translateX(${(1 - lt) * 22}px)`;
        });
        heroNavEl.style.pointerEvents = heroMenu > 0.6 ? "auto" : "none";
        if (isHero) {
          hintEl!.style.opacity = String(1 - seg(p, 0, 0.12));
        }

        renderer.render(scene, camera);

        if (heroMenu > 0) {
          colorSampleAcc += dt;
          if (colorSampleAcc >= COLOR_SAMPLE_INTERVAL) {
            colorSampleAcc = 0;
            sampleLabelColors();
          }
          // prefers-reduced-motion: сцена и так не вращается (autoSpin/
          // float гейтятся выше), поэтому линзу достаточно нарисовать один
          // раз статично — она и не должна "устаревать". Иначе — обычный
          // throttle. Page Visibility API: на скрытой вкладке вообще не
          // трогаем канвасы линз (document.hidden).
          if (!document.hidden) {
            if (reduced) {
              if (!lensDrawnStatic) {
                lensDrawnStatic = true;
                drawLenses();
              }
            } else {
              lensSampleAcc += dt;
              if (lensSampleAcc >= LENS_SAMPLE_INTERVAL) {
                lensSampleAcc = 0;
                drawLenses();
              }
            }
          }
        }

        sceneReady = true;
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);

      return () => {
        cancelAnimationFrame(rafId);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerStop);
        canvas.removeEventListener("pointercancel", onPointerStop);
        canvas.removeEventListener("wheel", onWheel);
        window.removeEventListener("resize", resize);
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh;
          mesh.geometry?.dispose?.();
          const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat?.dispose?.();
        });
        scene.environment?.dispose();
        pickTarget.dispose();
        renderer.forceContextLoss();
        renderer.dispose();
      };
    }

    let cleanup3D: (() => void) | null = null;
    const deferId = requestAnimationFrame(() => {
      cleanup3D = setup3D();
    });

    return () => {
      cancelAnimationFrame(deferId);
      cleanup3D?.();
      cancelAnimationFrame(introRaf);
      document.removeEventListener("keydown", onEscape);
      skipBtn?.removeEventListener("click", skipNow);
      unlockScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <>
      <div ref={wrapRef} className={styles.glWrap}>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs>
            <linearGradient id="swg1" gradientUnits="userSpaceOnUse" x1="336" y1="353" x2="456" y2="887">
              <stop offset="0" stopColor="#ffffff" /><stop offset=".075" stopColor="#fefefe" /><stop offset=".5" stopColor="#838383" /><stop offset=".915" stopColor="#464646" /><stop offset="1" stopColor="#3a3a3a" />
            </linearGradient>
            <linearGradient id="swg2" gradientUnits="userSpaceOnUse" x1="636" y1="411" x2="456" y2="887">
              <stop offset="0" stopColor="#f6f6f6" /><stop offset=".08" stopColor="#eeeeee" /><stop offset=".5" stopColor="#7d7d7d" /><stop offset=".92" stopColor="#454545" /><stop offset="1" stopColor="#3a3a3a" />
            </linearGradient>
            <linearGradient id="swg3" gradientUnits="userSpaceOnUse" x1="636" y1="411" x2="796" y2="886">
              <stop offset="0" stopColor="#f6f6f6" /><stop offset=".08" stopColor="#eeeeee" /><stop offset=".5" stopColor="#7f7f7f" /><stop offset=".92" stopColor="#474747" /><stop offset="1" stopColor="#3c3c3c" />
            </linearGradient>
            <linearGradient id="swg4" gradientUnits="userSpaceOnUse" x1="936" y1="353" x2="796" y2="886">
              <stop offset="0" stopColor="#ffffff" /><stop offset=".075" stopColor="#fefefe" /><stop offset=".5" stopColor="#878787" /><stop offset=".92" stopColor="#535353" /><stop offset="1" stopColor="#464646" />
            </linearGradient>
            <filter id="sShadow" filterUnits="userSpaceOnUse" x="156" y="253" width="954" height="734">
              <feDropShadow dx="0" dy="6" stdDeviation="16" floodColor="#000" floodOpacity=".55" />
            </filter>
            <filter id="sGlow" filterUnits="userSpaceOnUse" x="156" y="253" width="954" height="734">
              <feGaussianBlur stdDeviation="26" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="sSoften" filterUnits="userSpaceOnUse" x="156" y="253" width="954" height="734">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
        </svg>

        <canvas ref={canvasRef} className={`${styles.gl} ${heroFirstVisit ? styles.heroInteractive : ""}`} />
      </div>

      {heroFirstVisit && (
        <div ref={splashRef} className={styles.splash}>
          <div className={styles.grain} />
          <div className={styles.lockup}>
            <div className={styles.markwrap}>
              <svg ref={markMainRef} className={styles.mark} viewBox="196 293 874 654" role="img" aria-label="W" />
              <div className={styles.sweep}>
                <svg ref={markSweepRef} className={styles.mark} viewBox="196 293 874 654" aria-hidden="true" />
              </div>
            </div>
            <div className={styles.rule} />
            <div ref={wordRef} className={styles.word} />
            <div className={styles.sub}>{t("tagline")}</div>
          </div>
          <button ref={skipRef} className={styles.skip}>{t("skip")}</button>
        </div>
      )}

      <nav ref={heroNavRef} className={styles.heroNav}>
        {NAV_ITEMS.map((item, i) => (
          <Link key={item.href} href={item.href} ref={(el) => { heroLinkRefs.current[i] = el; }}>
            <canvas
              ref={(el) => { heroLensRefs.current[i] = el; }}
              className={styles.lens}
              aria-hidden="true"
            />
            <span className={styles.num}>
              {[...item.num].map((ch, ci) => (
                <span key={ci} className={styles.numChar}>{ch}</span>
              ))}
            </span>
            <span className={styles.lbl}>
              {[...nav(item.key)].map((ch, ci) => (
                <span key={ci} className={styles.lblChar}>{ch}</span>
              ))}
            </span>
          </Link>
        ))}
      </nav>

      {heroFirstVisit && (
        <div ref={hintRef} className={styles.hint}>
          <span className={styles.bar} />
          <span className={styles.dot} />
          <span>{t("hint")}</span>
          <span className={styles.dot} />
          <span className={`${styles.bar} ${styles.barR}`} />
        </div>
      )}

      <div ref={fallbackRef} className={styles.fallback} style={{ display: "none" }}>
        {t("fallback")}
      </div>
    </>
  );
}
