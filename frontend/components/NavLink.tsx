"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  // dashboard exact + "/" alias
  const isActive =
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href)) || (href === "/dashboard" && pathname === "/")
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`nav-item px-3.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/60 focus-visible:ring-offset-0 focus-visible:ring-offset-[#0f172a] ${isActive ? "nav-item-active" : "text-[#94a3b8]"}`}
    >
      {isActive && <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_6px_#00ff88] animate-pulse shrink-0" />}
      {children}
    </Link>
  )
}
