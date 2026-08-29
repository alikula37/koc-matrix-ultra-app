import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

function deepMergeFallback(primary: any, fallback: any): any {
  if (primary == null) return fallback;
  if (typeof primary !== "object" || typeof fallback !== "object") return primary ?? fallback;
  const out: any = Array.isArray(primary) ? [...primary] : { ...fallback, ...primary };
  for (const k of Object.keys(fallback)) {
    if (primary[k] == null) out[k] = fallback[k];
    else if (typeof primary[k] === "object" && typeof fallback[k] === "object") out[k] = deepMergeFallback(primary[k], fallback[k]);
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
  const messages = (await import(`../messages/${locale}.json`)).default;
  // EN fallback per-key (kullanıcı isteği: çevirisi yoksa EN göster)
  if (locale !== "en") {
    const enMessages = (await import(`../messages/en.json`)).default;
    return { locale, messages: deepMergeFallback(messages, enMessages) };
  }
  return { locale, messages };
});
