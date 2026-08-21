"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import * as THREE from "three";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useLocaleSwitch } from "@/components/locale-client-provider";
import { routing } from "@/i18n/routing";
import { BookingFlow } from "@/components/booking-flow";
import { BioFlow } from "@/components/bio-flow";
import { PriceFlow } from "@/components/price-flow";
import { PortfolioFlow } from "@/components/portfolio-flow";
import { BookingIcon, BioIcon, PriceIcon, PortfolioIcon } from "@/components/nav-icons";
import styles from "./site-scene.module.css";

const NAV_ITEMS = [
  { num: "01", key: "booking", href: "/booking", Icon: BookingIcon, dockOrder: 3 },
  { num: "02", key: "bio", href: "/bio", Icon: BioIcon, dockOrder: 1 },
  { num: "03", key: "price", href: "/price", Icon: PriceIcon, dockOrder: 2 },
  { num: "04", key: "portfolio", href: "/portfolio", Icon: PortfolioIcon, dockOrder: 4 },
] as const;

type Rect = { left: number; top: number; width: number; height: number };

function rectOf(el: HTMLElement | null): Rect | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  const tBooking = useTranslations("Booking");
  const tBio = useTranslations("Bio");
  const tPrice = useTranslations("Price");
  const tPortfolio = useTranslations("Portfolio");

  // Переключатель языка (RU/RO) — отдельный элемент рядом с вертикальным
  // меню (не 5-й navItem внутри самого меню — то жёстко завязано на
  // multi-element FLIP ровно под 4 пункта, см. комментарии у navWrapRefs
  // ниже; переключатель к тому же не открывает попап, а меняет язык,
  // логика принципиально другая). currentLocale читает ВНУТРЕННИЙ
  // NextIntlClientProvider (см. LocaleClientProvider) — то, что реально
  // отображается прямо сейчас. switchLocale меняет его БЕЗ навигации —
  // ни next-intl useRouter().replace() (клиентский SPA-переход), ни
  // window.location (полная перезагрузка) больше не используются: оба
  // способа заставляли App Router перестраивать [locale]-маршрут, а
  // SiteScene — насквозь императивный компонент (Three.js-рендерер,
  // ручные DOM-манипуляции вроде `splash?.remove()`, таймеры) — не
  // переживает unmount/remount при таком перестроении (проверено вживую:
  // реальный краш `NotFoundError: Failed to execute 'removeChild' on
  // 'Node'` при попытке через router.replace()). LocaleClientProvider
  // держит два вложенных NextIntlClientProvider именно для того, чтобы
  // смена языка была чистым React state update — без единого re-mount
  // этого компонента, подробности см. в самом провайдере.
  const currentLocale = useLocale();
  const switchLocale = useLocaleSwitch();

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

  /* ============================================================
     ПОПАП МЕНЮ (общий для всех 4 пунктов) + СВОРАЧИВАНИЕ МЕНЮ В ДОК.

     Два независимых, но синхронизированных механизма:

     1) Popup FLIP — тот же приём, что раньше был только у "Записи":
        панель (popupPanelRef) держит постоянный CSS-transition на
        left/top/width/height/border-radius; первый рендер после клика
        выставляет инлайн-стилями точную геометрию капсулы-источника
        (popupPhase="opening"), следующим кадром (useEffect+rAF, после
        покраски) инлайн снимается (popupPhase="open") — финальные
        значения приходят из CSS-класса, и ИМЕННО смена значений
        подхватывается transition'ом. Закрытие — то же в обратную
        сторону (popupPhase="closing" сразу выставляет геометрию
        источника заново).

     2) Nav FLIP — сворачивание вертикального меню на клинке в
        горизонтальный док внизу экрана (и обратно). Отдельный DOM-элемент
        на каждый пункт (.navItemWrap, см. JSX) + "спина" меню (теперь
        настоящий div, не ::before — чтобы её можно было измерить и
        анимировать так же). Классический multi-element FLIP: ПЕРЕД
        переключением CSS-класса (dockMode) синхронно в обработчике клика
        снимаем getBoundingClientRect() каждого элемента ("before"),
        useLayoutEffect ниже (после того как класс уже применился и
        браузер пересчитал layout, но ДО покраски) меряет "after",
        выставляет компенsирующий transform (center-to-center offset) с
        transition:none, форсит reflow и на следующем кадре снимает и
        transform, и override transition — CSS-класс сам доигрывает
        переход. Работает в обе стороны (в док и обратно) одним и тем же
        кодом, т.к. просто использует текущее (any) состояние как "before".

        dockMode — отдельный useState (НЕ производное от activeIndex),
        выставляется явно в тех же местах, где меняется activeIndex:
        true — на первом клике (кто угодно из 4), false — сразу в
        closePopup(), СИНХРОННО с началом popupPhase="closing", а не
        когда попап реально доедет до конца. Раньше dockMode был derived
        (`activeIndex !== null`) и становился false только в
        finalizeClose() — т.е. ПОСЛЕ transitionend попапа (~500мс), из-за
        чего реверс-FLIP дока стартовал с заметной паузой после того, как
        попап уже схлопнулся, вместо того чтобы лететь одновременно.
        Переключение между двумя открытыми попапами (closing одного ->
        opening другого) dockMode вообще не трогает — он остаётся true
        весь цикл.
     ============================================================ */
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [popupPhase, setPopupPhase] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const [popupContentIn, setPopupContentIn] = useState(false);
  // Геометрия источника (капсулы/доковой иконки) в момент клика — нужна
  // прямо в рендере (инлайн-стиль первого кадра панели), поэтому state,
  // а не ref: правило react-hooks/refs не даёт читать ref.current во
  // время рендера, да и по сути значение влияет на то, что рисуется.
  const [popupOrigin, setPopupOrigin] = useState<Rect | null>(null);
  const [dockMode, setDockMode] = useState(false);

  const popupPanelRef = useRef<HTMLDivElement>(null);
  // Только для кроссфейда контента при переключении между двумя уже
  // открытыми попапами (см. switchPopup/pendingSwitchIndexRef ниже) —
  // геометрия панели (popupPanelRef) при этом не трогается вообще.
  const popupContentRef = useRef<HTMLDivElement>(null);
  const popupCloseBtnRef = useRef<HTMLButtonElement>(null);
  const prevOverflowRef = useRef("");
  // Пункт, на который переключаемся кроссфейдом контента, пока текущий
  // попап уже открыт (см. switchPopup): fade out текущего содержимого ->
  // по transitionend меняем activeIndex -> fade in нового. Геометрия
  // панели при этом не анимируется — все 4 попапа открываются в одну и ту
  // же рамку (.bookingPanel), сжимать её в док и растить обратно незачем.
  // null, пока переключение не идёт.
  const pendingSwitchIndexRef = useRef<number | null>(null);
  const navWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spineRef = useRef<HTMLDivElement>(null);
  const flipBeforeRef = useRef<{ items: (Rect | null)[]; links: (Rect | null)[]; spine: Rect | null } | null>(null);
  // WebGL-цикл (setup3D/frame ниже) должен перестать сам позиционировать
  // .heroNav, пока меню свёрнуто в док — читает этот ref каждый кадр
  // (не state — незачем перерендеривать React-дерево ради значения,
  // нужного только внутри imperative-цикла).
  const navCollapsedRef = useRef(false);
  useEffect(() => {
    navCollapsedRef.current = dockMode;
  }, [dockMode]);
  // Клинок продолжает медленно авто-вращаться, пока меню в доке (это его
  // штатное поведение, см. autoSpin) — а значит, спроецированная на экран
  // точка, к которой "приварено" вертикальное меню, за это время реально
  // уезжает. WebGL-цикл ниже перестаёт ПРИМЕНЯТЬ left/width к .heroNav,
  // пока навигация свёрнута (см. navCollapsedRef), но продолжает их
  // СЧИТАТЬ каждый кадр и класть сюда — иначе в момент разворота обратно
  // мы бы применили давно устаревшее значение (или "auto") и тут же поверх
  // него — свежее посчитанное, что и давало видимый прыжок ("меню
  // появляется не там, где должно, и потом резко едет на своё место").
  const navPosRef = useRef({ left: 0, width: 0 });

  function captureFlipBefore() {
    flipBeforeRef.current = {
      items: navWrapRefs.current.map((el) => rectOf(el)),
      // Геометрия самой капсулы (<a>) — отдельно от .navItemWrap. Нужна,
      // чтобы на время FLIP-компенсации заморозить её width/height на
      // "before"-значении (см. useLayoutEffect ниже) — иначе .navItemWrap
      // меряется УЖЕ с целевой (финальной) шириной капсулы, хотя её
      // собственный CSS-переход круг<->пилюля физически ещё не начался.
      links: heroLinkRefs.current.map((el) => rectOf(el)),
      spine: rectOf(spineRef.current),
    };
  }

  // multi-element FLIP: компенсирующий transform на каждый элемент, чья
  // ВИДИМАЯ позиция должна остаться прежней на первом кадре после смены
  // layout-режима, с последующим плавным переходом к новому месту.
  //
  // Установка компенсации и её снятие — НАРОЧНО в разных хуках (как и у
  // popupPhase "opening"->"open" выше). Если сделать оба шага синхронно в
  // одном useLayoutEffect (как было раньше — баг: "полоска и кнопки просто
  // появляются, без анимации"), браузер ни разу не красит скомпенсированный
  // кадр: useLayoutEffect выполняется целиком ДО первой отрисовки, и
  // requestAnimationFrame, запланированный изнутри него, срабатывает в
  // ТОМ ЖЕ грядущем кадре, что и сама покраска — снятие transform
  // происходит раньше, чем браузер вообще успевает что-то нарисовать.
  // useLayoutEffect здесь оставлен только для СИНХРОННОГО измерения "after"
  // и установки компенсации ДО покраски; снятие — в обычном useEffect
  // ниже, который by design запускается ПОСЛЕ покраски.
  useLayoutEffect(() => {
    const before = flipBeforeRef.current;
    flipBeforeRef.current = null;
    if (!before || prefersReducedMotion()) return;
    if (!dockMode && heroNavRef.current) {
      // Разворот обратно в вертикальное меню: WebGL-цикл сам не трогает
      // heroNavEl, пока navCollapsedRef ещё не успел синхронизироваться
      // (см. useEffect выше) — без этой явной установки .navItemWrap
      // измерялся бы относительно "auto"-позиции nav (левый край, 0),
      // а не относительно её РЕАЛЬНОЙ, актуальной (клинок продолжал
      // авто-вращаться, пока меню было в доке) точки — именно из-за этого
      // расхождения капсулы резко "телепортировались" в момент, когда
      // WebGL-цикл на следующем кадре наконец применял свежее значение
      // поверх уже неверно посчитанной анимации. navPosRef всегда свежий
      // (считается каждый кадр независимо от дока, см. frame() ниже).
      heroNavRef.current.style.left = `${navPosRef.current.left}px`;
      heroNavRef.current.style.width = `${navPosRef.current.width}px`;
      heroNavRef.current.style.opacity = "1";
    }
    // Точное зеркало в обе стороны: сворачивание (vertical -> док) и
    // разворачивание обратно (док -> vertical, после закрытия попапа) —
    // одна и та же FLIP-компенсация, просто "before"/"after" меняются
    // местами сами собой (each капсула летит именно в свою вертикальную
    // точку, а не все скопом в одну сторону). Спина — не в списке ниже:
    // её left/top/width/height уже сами по себе transitionable CSS-
    // свойства (см. .spine) и не нуждаются в компенсации, что дублировало
    // бы движение вторым слоем поверх её же CSS-перехода.
    //
    // В ДОК (dockMode -> true): замораживаем width/height самой капсулы
    // (<a>) на "before"-значении ДО измерения .navItemWrap — иначе
    // getBoundingClientRect уже отдаёт ЦЕЛЕВУЮ (финальную) ширину капсулы
    // (пилюля ~194px -> круг 52px), хотя её собственный CSS-переход
    // физически ещё не стартовал. Из-за этого расхождения компенсация
    // считалась бы по неверной точке. Отпускаем вместе с transform на
    // следующем кадре — переход по ширине/высоте после этого доигрывает
    // сам, тем же transition на .heroNav a (см. useEffect ниже). Целевой
    // размер здесь — explicit px (.heroNavDock a {width:52/64px}), не
    // ключевое слово, так что transition к нему честно анимируется.
    //
    // ОБРАТНО В ВЕРТИКАЛЬ (dockMode -> false): size/форму капсулы И
    // линзу вообще НЕ анимируем — оставляем только полёт (transform на
    // .navItemWrap ниже). Причина не про желание "попроще": честная
    // анимация width/height сюда технически ненадёжна — `.heroNav a`
    // использует `width: fit-content`, а он зависит от padding, который
    // САМ одновременно анимируется своим transition'ом; синхронно
    // замерить корректный target в принципе нельзя (проверено и живым
    // кодом, и изолированным HTML-тестом вне React — см. память
    // проекта), из-за чего то щёлкало мгновенно, то давало случайные
    // промежуточные числа, то в Safari капсула на кадр оставалась
    // совсем пустой. По прямой просьбе: капсула должна появляться СРАЗУ
    // в финальном виде, без паузы — тут просто НЕ трогаем width/height
    // вообще (остаются "" — растут по fit-content мгновенно), сужаем
    // transition капсулы до свойств, которым анимация ещё нужна (hover/
    // focus), исключая width/height/padding/border-radius, и ТАК ЖЕ
    // мгновенно (transition:none) ставим линзе финальную opacity:1 —
    // без этого она сама доигрывала бы свои 0.3s fade-in уже ПОСЛЕ того,
    // как форма/текст готовы, и капсула всё равно казалась бы "серой"
    // ещё какое-то время.
    heroLinkRefs.current.forEach((a, i) => {
      if (!a) return;
      const lens = heroLensRefs.current[i];
      if (dockMode) {
        const r = before.links[i];
        if (!r) return;
        a.style.transition = "none";
        a.style.width = `${r.width}px`;
        a.style.height = `${r.height}px`;
      } else {
        a.style.transition = "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease";
        if (lens) {
          lens.style.transition = "none";
          lens.style.opacity = "1";
        }
      }
    });
    void document.body.offsetHeight;

    const apply = (el: HTMLElement | null, beforeRect: Rect | null) => {
      if (!el || !beforeRect) return;
      const after = el.getBoundingClientRect();
      const dx = beforeRect.left + beforeRect.width / 2 - (after.left + after.width / 2);
      const dy = beforeRect.top + beforeRect.height / 2 - (after.top + after.height / 2);
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    navWrapRefs.current.forEach((el, i) => apply(el, before.items[i]));
    // Один общий forced reflow на все элементы разом — фиксирует
    // "before"-кадр (transition:none применился) до того, как что-либо
    // ещё успеет его снять.
    void document.body.offsetHeight;
  }, [dockMode]);

  useEffect(() => {
    const clear = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.transition = "";
      el.style.transform = "";
    };
    const raf = requestAnimationFrame(() => {
      navWrapRefs.current.forEach(clear);
      heroLinkRefs.current.forEach((a, i) => {
        if (!a) return;
        // Возвращаем полный transition-список из CSS-класса в обоих
        // случаях (нужен дальше для hover/focus в любом состоянии).
        a.style.transition = "";
        if (dockMode) {
          // В доке: отпускаем ширину/высоту в "" — откат на
          // .heroNavDock a {width:52/64px} (обычная длина, не ключевое
          // слово), CSS-transition к ней уже честно анимирует.
          a.style.width = "";
          a.style.height = "";
        }
        // В вертикали (!dockMode) width/height не трогаем вообще — они
        // не замораживались (см. useLayoutEffect выше, ветка else), уже
        // "" и уже на финальном fit-content значении с первого кадра.
        const lens = heroLensRefs.current[i];
        if (lens) lens.style.transition = "";
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [dockMode]);

  function finalizeClose(closedIndex: number | null) {
    // captureFlipBefore()/setDockMode(false) здесь больше НЕ вызываются —
    // реверс-FLIP дока запущен раньше, синхронно с началом закрытия попапа
    // (см. closePopup()), чтобы обе анимации шли одновременно, без паузы.
    // Этот вызов — только финальная уборка ПОСЛЕ того, как попап реально
    // доехал (transitionend) или (reduced-motion) сразу.
    setActiveIndex(null);
    setPopupPhase("closed");
    // Осознанное исключение: возврат скролла страницы — сайд-эффект внешней
    // системы (DOM), не рендер, и вызывается только из обработчиков клика/
    // клавиатуры/transitionend, никогда во время рендера.
    // eslint-disable-next-line react-hooks/immutability
    document.body.style.overflow = prevOverflowRef.current;
    if (closedIndex !== null) heroLinkRefs.current[closedIndex]?.focus();
  }

  function handleNavClick(e: ReactMouseEvent<HTMLAnchorElement>, index: number) {
    // Не мешаем открыть в новой вкладке / скачать ссылку обычным способом —
    // перехватываем только чистый левый клик без модификаторов.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (activeIndex === index) return; // уже открыт этот же пункт

    const rect = rectOf(heroLinkRefs.current[index]);
    if (!rect) return;
    const reduced = prefersReducedMotion();

    if (activeIndex === null) {
      // Первое открытие — синхронно коллапс меню в док + попап.
      captureFlipBefore();
      // WebGL-цикл (frame()) больше не будет трогать эти инлайн-стили,
      // пока меню в доке (navCollapsedRef) — снимаем их явно, иначе
      // последнее выставленное JS-значение (left/width/opacity капсулы,
      // opacity/transform каждой ссылки) перебивало бы новый CSS-класс
      // .heroNavDock своим приоритетом инлайн-стиля.
      heroNavRef.current?.removeAttribute("style");
      heroLinkRefs.current.forEach((a) => a?.removeAttribute("style"));
      // Линзе тоже: на закрытии (closePopup) ей ставится инлайн
      // opacity:"1" в обход её собственного transition (см. useLayoutEffect
      // ниже) — если не снять, он навсегда перебьёт `.heroNavDock .lens
      // {opacity:0}` (инлайн всегда сильнее класса), и доковые круглые
      // иконки начали бы просвечивать линзой вместо чистого SVG-значка.
      heroLensRefs.current.forEach((lens) => lens?.removeAttribute("style"));
      prevOverflowRef.current = document.body.style.overflow;
      // См. пояснение в finalizeClose — тот же осознанный случай, только
      // в обратную сторону (лочим скролл при открытии).
      // eslint-disable-next-line react-hooks/immutability
      document.body.style.overflow = "hidden";
      setPopupOrigin(rect);
      setActiveIndex(index);
      setDockMode(true);
      setPopupPhase(reduced ? "open" : "opening");
      setPopupContentIn(reduced);
    } else if (reduced) {
      // Меню уже в доке, но без анимаций — переключаемся мгновенно.
      setActiveIndex(index);
      setPopupContentIn(true);
    } else {
      // Меню уже в доке — переключение между двумя УЖЕ открытыми
      // попапами. Геометрия .bookingPanel одинакова для всех 4 пунктов —
      // сжимать панель в док и растить её обратно незачем, это и давало
      // заметное "сначала закрылся, потом открылся". Вместо этого панель
      // остаётся на месте (popupPhase так и остаётся "open"), меняется
      // кроссфейдом только содержимое: fade out -> смена activeIndex ->
      // fade in (см. эффект на popupContentRef ниже).
      pendingSwitchIndexRef.current = index;
      setPopupContentIn(false);
    }
  }

  function closePopup() {
    setPopupContentIn(false);
    // Если в момент закрытия шло кроссфейд-переключение на другой попап
    // (см. switchPopup-ветку в handleNavClick) — отменяем его: иначе уже
    // запущенный fade-out контента доиграет своим transitionend и эффект
    // ниже откроет pending-пункт вместо настоящего закрытия.
    pendingSwitchIndexRef.current = null;
    // Базовый .heroNav a стартует с opacity:0 (см. комментарий у
    // .heroNavDock a в CSS) — единственное, что держит капсулы видимыми
    // В ВЕРТИКАЛИ, это `a.style.opacity`, который каждый кадр выставляет
    // WebGL-цикл, НО ТОЛЬКО пока !navCollapsedRef.current. При входе в
    // док инлайн-стили явно снимаются (handleNavClick) — дальше
    // видимость держит CSS-правило `.heroNavDock a {opacity:1}`,
    // применяется СИНХРОННО со сменой класса, без зазора. А вот при
    // ВЫХОДЕ из дока (сюда) такого CSS-правила нет — .heroNav a
    // (базовый) снова opacity:0, а инлайн-override так и не был
    // восстановлен с момента открытия. Пока navCollapsedRef не
    // синхронизируется (это обычный useEffect, после покраски) и
    // WebGL-цикл не выставит a.style.opacity сам, есть реальный кадр
    // (иногда больше одного), где все 4 капсулы визуально гаснут в 0 —
    // мелькание на уже знакомых элементах. Ставим opacity явно здесь же,
    // синхронно, до всякой покраски — зазора не остаётся.
    heroLinkRefs.current.forEach((a) => { if (a) a.style.opacity = "1"; });
    if (prefersReducedMotion()) {
      finalizeClose(activeIndex);
      setDockMode(false);
    } else {
      // Реверс-FLIP дока запускаем СРАЗУ, не дожидаясь transitionend
      // попапа (см. finalizeClose) — обе анимации (схлопывание попапа и
      // разлёт 3 капсул в вертикальное меню) должны идти параллельно.
      // activeIndex пока не трогаем: попап остаётся в DOM и доигрывает
      // свою собственную closing-анимацию к popupOrigin.
      captureFlipBefore();
      setDockMode(false);
      setPopupPhase("closing");
    }
  }

  // opening -> open ПОСЛЕ покраски (useEffect, не useLayoutEffect) — иначе
  // React рискует схлопнуть оба обновления состояния в один коммит, и
  // браузер ни разу не отрisует промежуточный кадр "панель размером с
  // источником" — переход пропадёт (см. подробный разбор в истории проекта).
  useEffect(() => {
    if (popupPhase !== "opening") return;
    const raf = requestAnimationFrame(() => setPopupPhase("open"));
    return () => cancelAnimationFrame(raf);
  }, [popupPhase]);

  // transitionend по 'width' — надёжный сигнал "геометрия доехала": вперёд
  // — показать контент попапа; назад — попап реально закрылся, развернуть
  // меню обратно в вертикальное. Переключение между двумя уже открытыми
  // попапами сюда больше не попадает — оно не трогает geometрию/popupPhase
  // вообще (см. switchPopup-эффект ниже), так что "closing" здесь всегда
  // означает настоящее закрытие.
  useEffect(() => {
    if (popupPhase === "closed") return;
    const panel = popupPanelRef.current;
    if (!panel) return;
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "width") return;
      if (popupPhase === "open") {
        setPopupContentIn(true);
        return;
      }
      if (popupPhase !== "closing") return;
      finalizeClose(activeIndex);
    };
    panel.addEventListener("transitionend", onEnd);
    return () => panel.removeEventListener("transitionend", onEnd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupPhase]);

  // Кроссфейд-переключение между двумя уже открытыми попапами (см.
  // switchPopup-ветку в handleNavClick): transitionend по 'opacity' на
  // содержимом — надёжный сигнал "fade out доехал". Если в этот момент
  // есть отложенный pendingSwitchIndexRef — меняем activeIndex и
  // следующим кадром запускаем fade in. rAF (не синхронно) — та же причина,
  // что и у opening -> open выше: React рискует схлопнуть смену activeIndex
  // и popupContentIn(true) в один коммит, и браузер ни разу не отрисует
  // промежуточный "контент погас" кадр — переход пропадёт.
  useEffect(() => {
    const content = popupContentRef.current;
    if (!content) return;
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "opacity") return;
      if (popupContentIn) return; // это конец fade-in, не fade-out — не наш случай
      const pending = pendingSwitchIndexRef.current;
      if (pending === null) return;
      pendingSwitchIndexRef.current = null;
      setActiveIndex(pending);
      requestAnimationFrame(() => setPopupContentIn(true));
    };
    content.addEventListener("transitionend", onEnd);
    return () => content.removeEventListener("transitionend", onEnd);
  }, [popupContentIn]);

  useEffect(() => {
    if (popupContentIn) popupCloseBtnRef.current?.focus();
  }, [popupContentIn]);

  useEffect(() => {
    if (popupPhase === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopup();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupPhase]);

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
      // "coarse" pointer — реальный признак тачскрина (не UA-нюхание),
      // тот же приём, что и у prefersReducedMotion() выше (matchMedia).
      // Мобильные GPU заметно слабее десктопных для ИМЕННО этой сцены
      // (PBR-материалы: clearcoat/anisotropy/env-отражения + ACES tone
      // mapping + MSAA) — жалоба на лаги на Samsung Galaxy S23. CPU тут
      // не бутылочное горлышко (проверено: 60fps держится даже под 6x
      // CPU-throttling в DevTools, замер headless-Chromium с реальным
      // GPU через ANGLE/Metal) — узкое место именно в GPU/fill-rate.
      // MSAA (antialias) — одна из самых дорогих вещей для мобильного
      // GPU при таком количестве треугольников/материалов, отключаем на
      // тачскринах; DPR тоже снижаем (2 → 1.5) — меньше пикселей на
      // кадр, на маленьком экране разница в резкости почти не читается.
      const isTouch = matchMedia("(pointer: coarse)").matches;
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !isTouch, alpha: true, powerPreference: "high-performance" });
      } catch {
        if (fallbackRef.current) fallbackRef.current.style.display = "grid";
        return null;
      }
      const DPR = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
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
      //
      // charLensEls — свой .lens-канвас КАЖДОЙ буквы (для чтения через
      // canvasLensPixel ниже, см. комментарий в sampleLabelColors про
      // рассинхрон с линзой). Параллельный charEls массив, а не
      // Map/индекс по heroLinks — сам .lens лежит ВНУТРИ той же <a>, что
      // и буква, querySelector надёжнее любого предположения о порядке
      // heroLinkRefs/heroLensRefs.
      const charEls: HTMLSpanElement[] = [];
      const charLensEls: (HTMLCanvasElement | null)[] = [];
      heroLinks.forEach((a) => {
        const lens = a.querySelector<HTMLCanvasElement>(`.${styles.lens}`);
        [
          ...Array.from(a.querySelectorAll<HTMLSpanElement>(`.${styles.numChar}`)),
          ...Array.from(a.querySelectorAll<HTMLSpanElement>(`.${styles.lblChar}`)),
        ].forEach((el) => {
          charEls.push(el);
          charLensEls.push(lens);
        });
      });
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

      // Кэш 2D-контекста каждого .lens-канваса — не вызывать getContext()
      // заново на каждую букву/кадр (см. использование в sampleLabelColors).
      const lensCtxCache = new Map<HTMLCanvasElement, CanvasRenderingContext2D | null>();
      function getLensCtx(lens: HTMLCanvasElement): CanvasRenderingContext2D | null {
        let ctx = lensCtxCache.get(lens);
        if (ctx === undefined) {
          ctx = lens.getContext("2d");
          lensCtxCache.set(lens, ctx);
        }
        return ctx;
      }

      function sampleLabelColors() {
        renderer.setRenderTarget(pickTarget);
        renderer.render(scene, camera);
        renderer.setRenderTarget(null);

        const pw = pickTarget.width;
        const ph = pickTarget.height;
        charEls.forEach((el, i) => {
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
          const rawLum =
            0.299 * linearToSrgb8(pixelBuf[0]) + 0.587 * linearToSrgb8(pixelBuf[1]) + 0.114 * linearToSrgb8(pixelBuf[2]);

          // Буквы у скруглённых краёв длинных капсул (напр. "prețuri" в
          // "Listă de prețuri") физически лежат внутри КОЛЬЦА линзы
          // (drawLenses — LENS_RING/LENS_RIM_BAND у самого края капсулы) —
          // человек там видит УВЕЛИЧЕННУЮ (zoom 1.22-2.6×) картинку линзы
          // поверх исходной сцены, не сырой кадр. rawLum выше игнорирует
          // это — сэмплит "как было бы без линзы", отсюда рассинхрон:
          // алгоритм решал "светло → тёмный текст" по сырому пикселю,
          // хотя реально под буквой было наложение блёклого серого кольца
          // на чёрный фон, заметно темнее — тёмный текст на нём терялся
          // (жалоба пользователя, 2026-08-21, капсула "Listă de prețuri").
          //
          // Фикс: читаем реальный пиксель ИЗ .lens-канваса (2D, уже
          // содержит финальный, отображаемый кадр — линеаризация не
          // нужна, в отличие от pickTarget выше) в ТОЙ ЖЕ точке и
          // смешиваем с rawLum по alpha кольца — ровно то же alpha-
          // компоузитинг, что браузер сам делает при отрисовке (кольцо
          // рисуется НАД сценой, .heroNav a без backdrop-filter — то, что
          // не закрыто кольцом, ВИДНО как есть, см. комментарий в
          // site-scene.module.css у .heroNav). При alpha=0 (истинный
          // прозрачный центр капсулы, вне кольца) blendedLum === rawLum.
          let lum = rawLum;
          const lens = charLensEls[i];
          const lensCtx = lens && getLensCtx(lens);
          if (lens && lensCtx && lens.width > 0 && lens.height > 0) {
            const lr = lens.getBoundingClientRect();
            if (lr.width > 0 && lr.height > 0) {
              const lx = Math.round(((r.left + r.width / 2 - lr.left) / lr.width) * lens.width);
              const ly = Math.round(((r.top + r.height / 2 - lr.top) / lr.height) * lens.height);
              if (lx >= 0 && lx < lens.width && ly >= 0 && ly < lens.height) {
                try {
                  const px = lensCtx.getImageData(lx, ly, 1, 1).data;
                  const alpha = px[3] / 255;
                  if (alpha > 0) {
                    const lensLum = 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2];
                    lum = alpha * lensLum + (1 - alpha) * rawLum;
                  }
                } catch {
                  // Канвас линзы временно нечитаем (0×0 в момент ресайза
                  // и т.п.) — используем rawLum, не критично, следующий
                  // замер через 1/8с всё поправит.
                }
              }
            }
          }
          // Порог 55 (было раньше) выбирал тёмный текст СИЛЬНО раньше, чем
          // тот реально становится контрастнее белого — из-за этого на
          // среднё-тёмных тонах стали (~60-110 sRGB, самая частая зона:
          // клинок затенён градиентом, замерено пиксель-сканом вдоль
          // капсул меню) текст читался хуже, чем если бы остался белым
          // ("теряется" — жалоба пользователя, 2026-08-21).
          //
          // Порог посчитан из реального WCAG-контраста (не на глаз):
          // относительная линейная яркость текста #111319 ≈ 0.0066,
          // контраст тёмного текста на фоне Lbg = (Lbg+0.05)/0.0566,
          // контраст белого = 1.05/(Lbg+0.05) — точка их равенства (после
          // обратной линеаризации в sRGB 0-255, ту же шкалу считает и
          // lum ниже) ≈ 122. Ниже нее у белого текста контраст выше,
          // выше — у тёмного. 120 — округление этой точки, не подгонка.
          //
          // Проверено пиксель-сканом (много оборотов клинка через
          // синтетический свайп, ~2000 замеров под буквами): фон под
          // текстом на стали реально лежит в 0 (чёрный) и 100-180
          // (сталь), с плотным кластером как раз в 110-120 — по новому
          // порогу это остаётся белым (было бы тёмным при 55), а
          // отчётливые блики (150+) по-прежнему уходят в тёмный.
          el.style.color = lum > 120 ? "#111319" : "#ffffff";
        });
      }

      // ---------- линза liquid-glass в капсулах меню ----------
      // У каждого пункта меню свой <canvas>-"глазок": каждый кадр (тот же
      // rAF-такт, что и вращение клинка — см. вызов drawLenses() ниже,
      // без троттлинга) забирает область РЕАЛЬНОЙ сцены прямо с основного
      // канваса (drawImage между canvas-элементами — в отличие от
      // gl.readPixels — сам делает implicit resolve мультисемплированного
      // буфера, поэтому второй offscreen-таргет тут не нужен, pickTarget
      // используется только для побуквенного цвета текста выше и остаётся
      // на своём отдельном троттле — тому достаточно ~8 замеров/сек).
      //
      // Ориентир — референс с настоящей рефракцией (Apple Liquid Glass):
      // край выпуклого стекла заметно "тянет" картинку сильнее, чем
      // середина, плюс тонкая радужная/хроматическая обводка по кромке.
      // Честная рефракция — это фрагментный шейдер (per-pixel displacement),
      // тут вместо этого дешёвое приближение из двух слоёв drawImage разного
      // зума (общий по всему кольцу + более сильный узкий слой у самого
      // края — "bulge") плюс декоративный градиентный блик-обводка поверх.
      const lensCtxs = lensCanvases.map((c) => c.getContext("2d"));
      // rimPath/strokeGrad ниже зависят ТОЛЬКО от текущего размера канваса
      // линзы (lens.width/height) — тот меняется лишь при ресайзе/реф-
      // лоу капсулы, не каждый кадр. Раньше оба пересобирались заново на
      // каждый вызов drawLenses() (до 60 раз/сек × до 4 линз) — чистый
      // лишний CPU без единого визуального отличия, кэшируем по паре
      // (width, height) и пересобираем только когда она реально меняется.
      const lensPathCache: ({ w: number; h: number; rimPath: Path2D; strokeGrad: CanvasGradient } | null)[] =
        lensCanvases.map(() => null);
      const LENS_ZOOM = 1.22; // общее увеличение по всему кольцу
      const LENS_RIM_ZOOM = 2.6; // усиленное увеличение в узкой полосе у самого края — "bulge"
      // Искажение — только кольцом у самого края капсулы (толще видимой
      // линии border, чтобы "толстое стекло" читалось), а не на всю кнопку:
      // если линза покрывает весь текст, буквы перестают читаться, даже с
      // побуквенной подгонкой чёрный/белый. Центр после "выкусывания"
      // остаётся настоящим прозрачным стеклом — там снова виден
      // неискажённый фон, как и было до линзы.
      const LENS_RING = 15; // CSS px — общая видимая ширина кольца
      const LENS_RIM_BAND = 9; // CSS px — под-полоса у самого края с LENS_RIM_ZOOM (< LENS_RING)
      // Резкая граница между кольцом-линзой и прозрачным центром была
      // заметна как жёсткий шов. blur() на самой стирающей заливке
      // (ниже) размывает именно край erasure в мягкий градиент — дешевле
      // и надёжнее, чем городить отдельную radial-gradient маску под
      // форму таблетки.
      const LENS_FEATHER = 10; // CSS px
      let lensDrawnStatic = false;

      function drawLenses() {
        if (!lensCanvases.length) return;
        // Тот же isTouch, что и у главного рендерера выше — до 4 таких
        // канвасов перерисовываются (drawImage + маска стирания + blur)
        // КАЖДЫЙ кадр, тот же fill-rate-бюджет мобильного GPU, что и у
        // самой сцены.
        const dpr = Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2);
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
          const cx = (r.left + r.width / 2) * dpr;
          const cy = (r.top + r.height / 2) * dpr;
          const pillR = Math.min(lens.width, lens.height) / 2;
          ctx.clearRect(0, 0, lens.width, lens.height);

          // Слой 1 — общий зум по всей капсуле (то же, что было раньше).
          const sw = (r.width / LENS_ZOOM) * dpr;
          const sh = (r.height / LENS_ZOOM) * dpr;
          try {
            ctx.drawImage(canvas, cx - sw / 2, cy - sh / 2, sw, sh, 0, 0, lens.width, lens.height);
          } catch {
            // Капсула частично уехала за край экрана — пропускаем кадр,
            // не критично при следующем обновлении через 1/6с.
          }

          // Слой 2 — "bulge": в узкой полосе у самого края рисуем ту же
          // область с более сильным зумом поверх слоя 1. Клип строим одним
          // Path2D из внешнего контура капсулы и внутреннего (уже с отступом
          // LENS_RIM_BAND) через fillRule "evenodd" — так получаем кольцевую
          // область без ручной геометрии дуг под форму "таблетки".
          const rim = LENS_RIM_BAND * dpr;
          const rw = lens.width - rim * 2;
          const rh = lens.height - rim * 2;
          // rimPath и strokeGrad (ниже) зависят только от lens.width/height,
          // который стабилен между кадрами (меняется лишь при ресайзе) —
          // пересобираем их не на каждый вызов, а только когда размер
          // реально поменялся, и переиспользуем кадр за кадром.
          let cached = lensPathCache[i];
          if (rw > 0 && rh > 0 && (!cached || cached.w !== lens.width || cached.h !== lens.height)) {
            const rimPath = new Path2D();
            rimPath.roundRect(0, 0, lens.width, lens.height, pillR);
            rimPath.roundRect(rim, rim, rw, rh, Math.min(rw, rh) / 2);
            const strokeGrad = ctx.createLinearGradient(0, 0, lens.width, lens.height);
            strokeGrad.addColorStop(0, "rgba(200,236,255,0.85)");
            strokeGrad.addColorStop(0.5, "rgba(255,255,255,0)");
            strokeGrad.addColorStop(1, "rgba(255,196,150,0.6)");
            cached = { w: lens.width, h: lens.height, rimPath, strokeGrad };
            lensPathCache[i] = cached;
          }
          if (rw > 0 && rh > 0 && cached) {
            const rsw = (r.width / LENS_RIM_ZOOM) * dpr;
            const rsh = (r.height / LENS_RIM_ZOOM) * dpr;
            ctx.save();
            ctx.clip(cached.rimPath, "evenodd");
            try {
              ctx.drawImage(canvas, cx - rsw / 2, cy - rsh / 2, rsw, rsh, 0, 0, lens.width, lens.height);
            } catch {
              /* см. катч выше */
            }
            ctx.restore();
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

          // Декоративная обводка-блик поверх кольца: диагональный градиент
          // (холодный голубоватый блик сверху-слева → тёплый снизу-справа)
          // — дешёвая имитация хроматической аберрации/переливов по кромке
          // настоящего стекла, без честного разложения по RGB-каналам.
          // Тот же градиент, что и в кэше выше (rw/rh>0 в любой реальной
          // капсуле, так что cached.strokeGrad почти всегда уже есть; на
          // случай вырожденного размера — фолбэк собирает разовый градиент
          // на месте, ничего не теряя визуально).
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = 0.5;
          if (!cached) {
            const oneOff = ctx.createLinearGradient(0, 0, lens.width, lens.height);
            oneOff.addColorStop(0, "rgba(200,236,255,0.85)");
            oneOff.addColorStop(0.5, "rgba(255,255,255,0)");
            oneOff.addColorStop(1, "rgba(255,196,150,0.6)");
            ctx.strokeStyle = oneOff;
          } else {
            ctx.strokeStyle = cached.strokeGrad;
          }
          ctx.lineWidth = Math.max(1, ring * 0.3);
          ctx.filter = `blur(${LENS_FEATHER * 0.5 * dpr}px)`;
          const inset = ring * 0.55;
          ctx.beginPath();
          ctx.roundRect(inset, inset, lens.width - inset * 2, lens.height - inset * 2, pillR - inset);
          ctx.stroke();
          ctx.restore();
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
        // Позицию (navLeft/wNav) считаем КАЖДЫЙ кадр независимо от того,
        // свёрнуто ли меню в док — клинок продолжает медленно авто-
        // вращаться всё это время (autoSpin), и спроецированная точка
        // "приварки" меню реально уезжает. Если не считать её всё это
        // время, в момент разворота обратно применилось бы давно
        // устаревшее (или вовсе не выставленное, "auto") значение, и
        // менюR резко прыгало бы на актуальное — именно так выглядел баг
        // "капсулы появляются не там и потом резко едут на своё место".
        // Кладём результат в navPosRef (используется в реверс-FLIP,
        // см. useLayoutEffect выше в компоненте), а вот ПРИМЕНЯЕМ к
        // heroNavEl/капсулам — только когда меню НЕ в доке; пока
        // свёрнуто, этим занимаются CSS-класс .heroNavDock + сам FLIP.
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
          navPosRef.current.left = navLeft;
          navPosRef.current.width = wNav;
          if (!navCollapsedRef.current) {
            heroNavEl.style.left = navLeft + "px";
            heroNavEl.style.width = wNav + "px";
            heroNavEl.style.opacity = "1";
          }
        } else if (!navCollapsedRef.current) {
          heroNavEl.style.opacity = "0";
        }
        if (!navCollapsedRef.current) {
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
        }
        if (isHero) {
          hintEl!.style.opacity = String(1 - seg(p, 0, 0.12));
        }

        // На скрытой вкладке (свернули/переключились) рисовать в WebGL
        // некому — rAF в фоне и так триммируется браузером до ~1 кадра/с,
        // но на тех редких кадрах, что всё же проходят, сам render() —
        // самая дорогая операция во всём цикле. Пропускаем её впустую:
        // ничего не видно, разницы нет, зато не жжём GPU/батарею в фоне.
        // Состояние (p/spin/camera и т.д.) продолжает считаться выше как
        // обычно — так что при возврате на вкладку сцена не "застыла" и
        // не дёрнется, просто продолжит оттуда, где реально остановилась.
        if (!document.hidden) {
          renderer.render(scene, camera);
        }

        // Линза (drawLenses) — раньше гейтилась ТЕМ ЖЕ условием, что и
        // sampleLabelColors() ниже (!navCollapsedRef.current, т.е. только
        // вертикаль) — по прямой просьбе пользователя ("настоящее
        // интерактивное стекло, реагирующее на задний фон") включаем её и
        // в доке. sampleLabelColors() остаётся вертикаль-only осознанно —
        // считает цвет ПОБУКВЕННО для num/lbl текста, которого в доке нет
        // (там просто белая SVG-иконка, .navIcon {color:#fff} фиксирован).
        // getBoundingClientRect() внутри drawLenses() каждый раз меряет
        // АКТУАЛЬНОЕ положение канваса линзы — не зависит от того, докнуто
        // меню или нет, работает одинаково в обоих раскладках без доп.
        // веток.
        //
        // ВАЖЕН ПОРЯДОК: drawLenses() должна отработать ДО
        // sampleLabelColors() в этом же кадре — sampleLabelColors читает
        // пиксели ИЗ .lens-канвасов (см. её комментарий про кольцо линзы),
        // и если бы порядок был обратный, читался бы кадр линзы,
        // отставший на один тик (не критично при 8 замерах/сек, но незачем
        // вносить лишний источник рассинхрона).
        if ((heroMenu > 0 || navCollapsedRef.current) && !document.hidden) {
          // prefers-reduced-motion: сцена и так не вращается (autoSpin/
          // float гейтятся выше), поэтому линзу достаточно нарисовать один
          // раз статично — она и не должна "устаревать". Иначе — каждый
          // кадр, тем же rAF-тактом, что и вращение клинка (без троттлинга:
          // при заметном bulge даже 1/6с давал видимый "рывок" по сравнению
          // с плавным вращением рядом). Page Visibility API: на скрытой
          // вкладке вообще не трогаем канвасы линз (document.hidden).
          if (reduced) {
            if (!lensDrawnStatic) {
              lensDrawnStatic = true;
              drawLenses();
            }
          } else {
            drawLenses();
          }
        }

        if (heroMenu > 0 && !navCollapsedRef.current) {
          colorSampleAcc += dt;
          if (colorSampleAcc >= COLOR_SAMPLE_INTERVAL) {
            colorSampleAcc = 0;
            sampleLabelColors();
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

      <nav ref={heroNavRef} className={`${styles.heroNav} ${dockMode ? styles.heroNavDock : ""}`}>
        {/* Раньше — ::before на .heroNav. Теперь настоящий элемент: чтобы
            её можно было измерить (getBoundingClientRect) и провести через
            тот же multi-element FLIP, что и капсулы — иначе поворот
            "вертикальная -> горизонтальная" нечем было бы анимировать. */}
        <div ref={spineRef} className={styles.spine} />
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.Icon;
          return (
            <div
              key={item.href}
              ref={(el) => { navWrapRefs.current[i] = el; }}
              className={`${styles.navItemWrap} ${item.key === "booking" ? styles.navItemFeatured : ""}`}
              style={{ order: item.dockOrder }}
            >
              <Link
                href={item.href}
                ref={(el) => { heroLinkRefs.current[i] = el; }}
                onClick={(e) => handleNavClick(e, i)}
                // Раньше активная капсула пряталась (navItemHidden) на всё
                // время, пока её попап открыт — задумывалось для старого
                // дизайна, где капсула буквально морфировала в попап на
                // том же месте. В доке капсула и попап физически не
                // пересекаются (капсула — маленький кружок внизу, попап —
                // во весь экран, см. .heroNavDock z-index:70 выше
                // .bookingOverlay), поэтому прятать незачем — капсула летит
                // в док через тот же FLIP, что и остальные 3, и остаётся на
                // виду всё время, пока её попап открыт (см. память проекта:
                // раньше это читалось как "кнопка пропала из дока").
              >
                <canvas
                  ref={(el) => { heroLensRefs.current[i] = el; }}
                  className={styles.lens}
                  aria-hidden="true"
                />
                {/* Зерно поверх стекла — в вертикали ложится НАД .lens (canvas
                    с живой сценой, z-index:-1), в доке НАД плоским tint'ом
                    капсулы — единый слой для обоих состояний, а не два
                    разных механизма (в доке зерно раньше сидело прямо в
                    background капсулы фоновым слоем — это ломало вертикаль,
                    т.к. .lens рисуется ПОВЕРХ background и просто перекрывал
                    его). См. .grainOverlay в CSS. */}
                <span className={styles.grainOverlay} aria-hidden="true" />
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
                <span className={styles.navIcon}>
                  <Icon width={22} height={22} />
                </span>
              </Link>
              <span className={styles.navCaption}>{nav(item.key)}</span>
            </div>
          );
        })}
      </nav>

      {/* Во время интро-заставки скрыт САМ СОБОЙ: .splash — непрозрачный
          fullscreen (z-index:40) поверх .langSwitch (z-index:8), а
          heroFirstVisit НЕ годится как флаг "заставка ещё идёт" — он
          остаётся true всю жизнь компонента на главной (означает "это
          домашний путь", не "интро сейчас видимо"); сама заставка
          удаляется из DOM императивно (`splash?.remove()`), без React-
          состояния. Единственное, что гасим явно — попап (панель может
          перекрывать этот угол на узких экранах, см. .bookingPanel в
          CSS, центрированная, до ~90vw на мобильном). */}
      {!(activeIndex !== null && popupPhase !== "closed") && (
        <div className={styles.langSwitch} role="group" aria-label={nav("language")}>
          {routing.locales.map((l) => (
            <button
              key={l}
              type="button"
              className={`${styles.langSwitchBtn} ${l === currentLocale ? styles.langSwitchBtnActive : ""}`}
              aria-pressed={l === currentLocale}
              onClick={() => switchLocale(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {activeIndex !== null && popupPhase !== "closed" && (() => {
        const item = NAV_ITEMS[activeIndex];
        const titles = { booking: tBooking("title"), bio: tBio("title"), price: tPrice("title"), portfolio: tPortfolio("title") } as const;
        const PopupBody = { booking: BookingFlow, bio: BioFlow, price: PriceFlow, portfolio: PortfolioFlow }[item.key];
        return (
          <div
            className={`${styles.bookingOverlay} ${popupPhase === "open" ? styles.bookingOverlayIn : ""}`}
            onClick={closePopup}
          >
            <div
              ref={popupPanelRef}
              className={`${styles.bookingPanel} ${popupPhase === "closing" ? styles.bookingPanelClosing : ""}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="site-popup-title"
              onClick={(e) => e.stopPropagation()}
              style={
                (popupPhase === "opening" || popupPhase === "closing") && popupOrigin
                  ? {
                      left: popupOrigin.left,
                      top: popupOrigin.top,
                      width: popupOrigin.width,
                      height: popupOrigin.height,
                      borderRadius: "999px",
                    }
                  : undefined
              }
            >
              {/* Раньше здесь было "эхо" кнопки (число+подпись) — заглушка
                  на время роста панели, пока реальная капсула была скрыта
                  (navItemHidden). Капсула больше не прячется (см. JSX
                  меню выше) и сама летит через FLIP в свою доковую точку —
                  эхо-заглушка больше не нужна, капсула несёт эту роль сама. */}
              <div
                ref={popupContentRef}
                className={`${styles.bookingContent} ${popupContentIn ? styles.bookingContentIn : ""}`}
              >
                <button
                  ref={popupCloseBtnRef}
                  type="button"
                  className={styles.bookingClose}
                  onClick={closePopup}
                  aria-label={tBooking("close")}
                >
                  ×
                </button>
                <h2 id="site-popup-title" className={styles.bookingTitle}>
                  {titles[item.key]}
                </h2>
                {popupContentIn && <PopupBody />}
              </div>
            </div>
          </div>
        );
      })()}

      {heroFirstVisit && (
        <div ref={hintRef} className={styles.hint}>
          <div className={styles.upWave} aria-hidden="true">
            {/* Верхний шеврон загорается последним (delay 0.32s), нижний —
                первым (0s): порядок в разметке сверху вниз = порядок на
                экране, волна читается как бегущая вверх подсветка. */}
            <svg className={styles.chevron} viewBox="0 0 48 28" style={{ animationDelay: "0.32s" }}>
              <path d="M4 24 L24 4 L44 24" />
            </svg>
            <svg className={styles.chevron} viewBox="0 0 48 28" style={{ animationDelay: "0.16s" }}>
              <path d="M4 24 L24 4 L44 24" />
            </svg>
            <svg className={styles.chevron} viewBox="0 0 48 28" style={{ animationDelay: "0s" }}>
              <path d="M4 24 L24 4 L44 24" />
            </svg>
          </div>
          <div className={styles.hintRow}>
            <span className={styles.bar} />
            <span className={styles.dot} />
            <span>{t("hint")}</span>
            <span className={styles.dot} />
            <span className={`${styles.bar} ${styles.barR}`} />
          </div>
        </div>
      )}

      <div ref={fallbackRef} className={styles.fallback} style={{ display: "none" }}>
        {t("fallback")}
      </div>
    </>
  );
}
