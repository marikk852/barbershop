import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// В Next.js 16 файл middleware.ts переименован в proxy.ts (конвенция,
// не поведение) — next-intl всё так же возвращает обычный обработчик запроса.
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
