// Тонкие line-иконки для 4 пунктов меню в свёрнутом (доковом) виде —
// stroke="currentColor", так что цвет управляется снаружи через CSS
// color, без отдельной палитры на каждую иконку. Нарисованы вручную
// (не иконочный набор) — сознательно минималистичные, под тот же язык,
// что и остальной сайт (тонкие линии, никаких заливок).
import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function BookingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v3.4M16 3v3.4" />
      <path d="M8 13.2l1.6 1.6L12.8 12" />
    </svg>
  );
}

export function BioIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 12.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2Z" />
      <path d="M5 19.5c1.1-3.4 3.9-5.2 7-5.2s5.9 1.8 7 5.2" />
    </svg>
  );
}

export function PriceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12.6 3.5h5.9a1 1 0 0 1 1 1v5.9a1 1 0 0 1-.3.7l-9 9a1 1 0 0 1-1.4 0l-6.2-6.2a1 1 0 0 1 0-1.4l9-9a1 1 0 0 1 .7-.3Z" />
      <circle cx="16.3" cy="7.7" r="1.15" />
    </svg>
  );
}

export function PortfolioIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M3.5 15.5l4.6-4.6a1.4 1.4 0 0 1 2 0l3.2 3.2" />
      <path d="M13 13l1.7-1.7a1.4 1.4 0 0 1 2 0l3.8 3.8" />
      <circle cx="8.3" cy="8.3" r="1.4" />
    </svg>
  );
}
