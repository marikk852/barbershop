import type { CSSProperties } from "react";
import { WKONDRYA as L } from "@/components/wkondrya-logo";
import styles from "./splash-logo.module.css";

// Логотип W.KONDRYA BARBER в заставке — белый, «вырисовывается» пером.
// Порядок (по просьбе владельца): сначала пишется монограмма WK, затем
// круг, который её обхватывает, затем всё остальное — вертикальная черта,
// W.KONDRYA и BARBER.
//
// Как устроено: контуры частей логотипа (заливка) взяты из исходника
// векторизацией (scripts/brand/build-wkondrya.py -> wkondrya-logo.ts) и
// показываются через <mask>. В маске — толстые белые штрихи по ОСЕВЫМ
// линиям букв (тот же скрипт, по скелету изображения), они «дорисовываются»
// анимацией stroke-dashoffset и открывают контур ровно там, где прошло
// перо. По тем же осевым бежит светящийся кончик пера (.nib).

type Stroke = { d: string; start: number; dur: number; width: number };

const PEN: Stroke[] = [
  { d: L.pen.w, start: 0.25, dur: 1.05, width: 30 }, // W с петлёй-росчерком
  { d: L.pen.kStem, start: 1.36, dur: 0.38, width: 30 }, // стойка K
  { d: L.pen.kArm, start: 1.8, dur: 0.9, width: 30 }, // ветки K и хвост
];
const CIRCLE: Stroke[] = [
  { d: L.circlePen.top, start: 2.72, dur: 0.55, width: 20 }, // справа — через верх — налево
  { d: L.circlePen.bottom, start: 3.22, dur: 0.55, width: 20 }, // слева — через низ — направо
];
const DIVIDER: Stroke = { d: L.dividerLine, start: 3.62, dur: 0.36, width: 14 };
const TITLE_START = 3.82;
const SUBTITLE_START = 4.36;

const v = (s: Stroke) => ({ "--s": `${s.start}s`, "--d": `${s.dur}s` }) as CSSProperties;

function MaskStrokes({ strokes }: { strokes: Stroke[] }) {
  return (
    <>
      {strokes.map((s, i) => (
        <path
          key={i}
          className={styles.pen}
          d={s.d}
          pathLength={1}
          stroke="#fff"
          strokeWidth={s.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={v(s)}
        />
      ))}
    </>
  );
}

export function SplashLogo() {
  const box = { x: 80, y: 140, width: 1620, height: 560 };
  return (
    <svg className={styles.logo} viewBox="80 140 1620 560" role="img" aria-label="W.Kondrya Barber">
      <defs>
        <mask id="wkPenMask" maskUnits="userSpaceOnUse" {...box}>
          <MaskStrokes strokes={PEN} />
        </mask>
        <mask id="wkCircleMask" maskUnits="userSpaceOnUse" {...box}>
          <MaskStrokes strokes={CIRCLE} />
        </mask>
        <mask id="wkDividerMask" maskUnits="userSpaceOnUse" {...box}>
          <MaskStrokes strokes={[DIVIDER]} />
        </mask>
        <filter id="wkNibGlow" filterUnits="userSpaceOnUse" {...box}>
          <feGaussianBlur stdDeviation="7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g fill="#fff">
        <path d={L.wk} mask="url(#wkPenMask)" />
        <path d={L.circle} mask="url(#wkCircleMask)" />
        <path d={L.divider} mask="url(#wkDividerMask)" />
        {L.title.map((d, i) => (
          <path key={`t${i}`} className={styles.letter} d={d} style={{ "--s": `${TITLE_START + i * 0.07}s` } as CSSProperties} />
        ))}
        {L.subtitle.map((d, i) => (
          <path
            key={`s${i}`}
            className={styles.letter}
            d={d}
            style={{ "--s": `${SUBTITLE_START + i * 0.06}s` } as CSSProperties}
          />
        ))}
      </g>

      {/* Светящийся кончик пера — только у монограммы и круга. */}
      <g filter="url(#wkNibGlow)" aria-hidden="true">
        {[...PEN, ...CIRCLE].map((s, i) => (
          <path key={i} className={styles.nib} d={s.d} pathLength={1} style={v(s)} />
        ))}
      </g>
    </svg>
  );
}
