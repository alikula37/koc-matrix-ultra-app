"use client"
import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation"
import { useTransition } from "react"

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const [isPending, startTransition] = useTransition()

  function onSelect(nextLocale: string) {
    startTransition(() => {
      // @ts-expect-error — params may contain locale, next-intl handles it
      router.replace({ pathname, params }, { locale: nextLocale })
    })
  }

  const locales: Array<{ code: string; label: string }> = [
    { code: "tr", label: "TR" },
    { code: "en", label: "EN" },
    { code: "de", label: "DE" },
  ]

  return (
    <div className="inline-flex items-center rounded-full bg-[#1e293b] border border-[#334155] p-0.5 gap-0.5">
      {locales.map((l) => (
        <button
          key={l.code}
          onClick={() => onSelect(l.code)}
          disabled={isPending}
          aria-current={locale === l.code ? "true" : undefined}
          className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-widest transition ${
            locale === l.code ? "bg-[#00ff88] text-black shadow-[0_0_8px_rgba(0,255,136,.3)]" : "text-[#94a3b8] hover:text-white hover:bg-[#334155]"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
