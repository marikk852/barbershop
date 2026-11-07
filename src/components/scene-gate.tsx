"use client";

import { usePathname } from "@/i18n/navigation";
import { SiteScene } from "@/components/site-scene";

// Страницы, на которых 3D-сцена и меню НЕ монтируются: SiteScene закреплена
// поверх экрана (position:fixed) и для длинного текста (политика
// конфиденциальности, на неё ведёт ссылка из формы записи) перекрывала бы
// его — читать было бы невозможно. Тексту сцена не нужна, страница без
// WebGL ещё и грузится быстрее.
const NO_SCENE_PATHS = new Set(["/privacy"]);

export function SceneGate() {
  // usePathname из next-intl — путь БЕЗ префикса локали ("/privacy" и для
  // "/ro/privacy").
  const pathname = usePathname();
  if (NO_SCENE_PATHS.has(pathname)) return null;
  return <SiteScene />;
}
