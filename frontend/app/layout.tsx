import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Koç Matrix Ultra — Trading Journal",
  description: "Production-grade Trading Journal & Execution Analytics Engine",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Koç Matrix" },
}

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#020617] antialiased">{children}</body>
    </html>
  )
}
