"use client"
type Locale = "tr" | "en" | "de"

const pdfT: Record<Locale, any> = {
  tr: {
    title: "KOÇ MATRIX ULTRA — AYLIK ÖZET",
    generated: "Oluşturuldu",
    basicMetrics: "TEMEL METRİKLER",
    totalTrades: "Toplam İşlem",
    winRate: "Kazanma Oranı",
    profitFactor: "Kâr Faktörü",
    expectancy: "Beklenti",
    totalR: "Toplam R",
    totalCash: "Toplam ₺",
    riskOfRuin: "İflas Riski",
    avgWinLoss: "Ort. Kazanç / Kayıp",
    sharpeSortino: "Sharpe / Sortino",
    maxDrawdown: "Maks. Düşüş",
    streak: "Seri",
    rrDeviation: "RR Sapma",
    periodTitle: "BU AY — DÖNEMSEL ÖZET (period-summary)",
    periodTotal: "Bu Ay Toplam",
    bestSetup: "En İyi Setup",
    bestEmotion: "En İyi Duygu",
    breakdown: "DAĞILIM",
    emotionBreakdown: "DUYGU DAĞILIMI (Beklenti Matrisi)",
    setupBreakdown: "SETUP DAĞILIMI",
    indicatorBreakdown: "İNDİKATÖR DAĞILIMI",
    timeBreakdown: "ZAMAN DAĞILIMI — GÜN / SAAT (Europe/Istanbul)",
    weekdayHour: "Saatlik",
    category: "Kategori",
    count: "Adet",
    win: "Win%",
    expectancyCol: "Beklenti",
    totalRCol: "Toplam R",
    pf: "PF",
    tradesSuffix: "işlem",
    page: "Sayfa",
    footer: "Koç Matrix Ultra • Production-grade Trading Journal",
    calendarTitle: "TAKVİM HEATMAP",
    modeR: "R Modu",
    modeCash: "₺ Modu",
    monthTotal: "işlem",
  },
  en: {
    title: "KOÇ MATRIX ULTRA — MONTHLY SUMMARY",
    generated: "Generated",
    basicMetrics: "BASIC METRICS",
    totalTrades: "Total Trades",
    winRate: "Win Rate",
    profitFactor: "Profit Factor",
    expectancy: "Expectancy",
    totalR: "Total R",
    totalCash: "Total $",
    riskOfRuin: "Risk of Ruin",
    avgWinLoss: "Avg. Win / Loss",
    sharpeSortino: "Sharpe / Sortino",
    maxDrawdown: "Max Drawdown",
    streak: "Streak",
    rrDeviation: "RR Deviation",
    periodTitle: "THIS MONTH — PERIOD SUMMARY (period-summary)",
    periodTotal: "This Month Total",
    bestSetup: "Best Setup",
    bestEmotion: "Best Emotion",
    breakdown: "BREAKDOWN",
    emotionBreakdown: "EMOTION BREAKDOWN (Expectancy Matrix)",
    setupBreakdown: "SETUP BREAKDOWN",
    indicatorBreakdown: "INDICATOR BREAKDOWN",
    timeBreakdown: "TIME BREAKDOWN — DAY / HOUR (Europe/Istanbul)",
    weekdayHour: "Hourly",
    category: "Category",
    count: "Count",
    win: "Win%",
    expectancyCol: "Expectancy",
    totalRCol: "Total R",
    pf: "PF",
    tradesSuffix: "trades",
    page: "Page",
    footer: "Koç Matrix Ultra • Production-grade Trading Journal",
    calendarTitle: "CALENDAR HEATMAP",
    modeR: "R Mode",
    modeCash: "$ Mode",
    monthTotal: "trades",
  },
  de: {
    title: "KOÇ MATRIX ULTRA — MONATSÜBERSICHT",
    generated: "Erstellt",
    basicMetrics: "BASIS-METRIKEN",
    totalTrades: "Trades Gesamt",
    winRate: "Trefferquote",
    profitFactor: "Profitfaktor",
    expectancy: "Erwartungswert",
    totalR: "Gesamt R",
    totalCash: "Gesamt €",
    riskOfRuin: "Ruin-Risiko",
    avgWinLoss: "Ø Gewinn / Verlust",
    sharpeSortino: "Sharpe / Sortino",
    maxDrawdown: "Max. Drawdown",
    streak: "Serie",
    rrDeviation: "RR Abweichung",
    periodTitle: "DIESER MONAT — PERIODENÜBERSICHT (period-summary)",
    periodTotal: "Diesen Monat Gesamt",
    bestSetup: "Bestes Setup",
    bestEmotion: "Beste Emotion",
    breakdown: "AUFSCHLÜSSELUNG",
    emotionBreakdown: "EMOTION-AUFSCHLÜSSELUNG (Erwartungswert-Matrix)",
    setupBreakdown: "SETUP-AUFSCHLÜSSELUNG",
    indicatorBreakdown: "INDIKATOR-AUFSCHLÜSSELUNG",
    timeBreakdown: "ZEIT-AUFSCHLÜSSELUNG — TAG / STUNDE (Europe/Istanbul)",
    weekdayHour: "Stündlich",
    category: "Kategorie",
    count: "Anzahl",
    win: "Win%",
    expectancyCol: "Erwartungswert",
    totalRCol: "Gesamt R",
    pf: "PF",
    tradesSuffix: "Trades",
    page: "Seite",
    footer: "Koç Matrix Ultra • Production-grade Trading Journal",
    calendarTitle: "KALENDER-HEATMAP",
    modeR: "R-Modus",
    modeCash: "€-Modus",
    monthTotal: "Trades",
  },
}

function intlLocale(locale: Locale) {
  if (locale === "tr") return "tr-TR"
  if (locale === "de") return "de-DE"
  return "en-US"
}

function curFor(locale: Locale) {
  if (locale === "tr") return "₺"
  if (locale === "de") return "€"
  return "$"
}

export async function exportAnalyticsPdf(data: any, period: any, locale: Locale = "tr") {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const t = pdfT[locale]
  const now = new Date().toLocaleString(intlLocale(locale), { timeZone: "Europe/Istanbul" })
  // Header
  doc.setFillColor(2, 6, 23)
  doc.rect(0, 0, 210, 18, "F")
  doc.setTextColor(0, 255, 136)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text(t.title, 10, 11)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text(`${t.generated}: ${now} Europe/Istanbul • R & ${curFor(locale)} Parallel`, 10, 15)

  let y = 24
  const line = (label: string, v: string, opts?: { bold?: boolean, color?: [number,number,number] }) => {
    doc.setFontSize(9)
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal")
    doc.setTextColor(15, 23, 42)
    doc.text(label, 10, y)
    if (opts?.color) doc.setTextColor(opts.color[0], opts.color[1], opts.color[2])
    else doc.setTextColor(15, 23, 42)
    doc.text(v, 70, y)
    y += 6
  }

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text(t.basicMetrics, 10, y); y += 7
  line(`${t.totalTrades}:`, `${data.basic.total_trades}  (${data.basic.win_count}W / ${data.basic.loss_count}L  •  ${t.winRate} ${data.basic.win_rate}%)`)
  line(`${t.totalR}:`, `${data.basic.total_r}R`, { bold: true, color: data.basic.total_r >=0 ? [0,128,0] : [204,0,51] })
  line(`${t.totalCash}:`, `${Number(data.basic.total_cash).toLocaleString(intlLocale(locale))} ${curFor(locale)}`, { color: data.basic.total_cash >=0 ? [0,128,0] : [204,0,51] })
  line(`${t.expectancy}:`, `${data.basic.expectancy}R`)
  line(`${t.profitFactor}:`, `${data.basic.profit_factor}`)
  line(`${t.avgWinLoss}:`, `${data.basic.avg_win_r}R / ${data.basic.avg_loss_r}R`)
  line(`${t.sharpeSortino}:`, `${data.basic.sharpe} / ${data.basic.sortino}`)
  line(`${t.maxDrawdown}:`, `${data.basic.max_drawdown_r}R / ${Number(data.basic.max_drawdown_cash).toLocaleString(intlLocale(locale))} ${curFor(locale)}`)
  line(`${t.streak}:`, `${data.basic.consecutive_wins}W / ${data.basic.consecutive_losses}L`)
  line(`${t.riskOfRuin}:`, `${(data.risk_of_ruin*100).toFixed(2)}%`)
  line(`${t.rrDeviation}:`, `${data.basic.rr_deviation}`)
  y += 3
  doc.setDrawColor(203, 213, 225)
  doc.line(10, y, 200, y); y += 6

  if (period?.basic) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(t.periodTitle, 10, y); y += 7
    line(`${t.periodTotal}:`, `${period.basic.total_r}R / ${Number(period.basic.total_cash).toLocaleString(intlLocale(locale))} ${curFor(locale)}`, { bold: true })
    line(`${t.winRate}:`, `${period.basic.win_rate}%`)
    if (period.best_setup) line(`${t.bestSetup}:`, `${period.best_setup}`)
    if (period.best_emotion) line(`${t.bestEmotion}:`, `${period.best_emotion}`)
    y += 2
    doc.line(10, y, 200, y); y += 6
  }

  const section = (title: string, obj: Record<string, any>) => {
    if (!obj || Object.keys(obj).length===0) return
    if (y > 250) { doc.addPage(); y = 15 }
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(title, 10, y); y += 7
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    doc.setFillColor(15, 23, 42)
    doc.setTextColor(255,255,255)
    doc.rect(10, y-4, 190, 7, "F")
    doc.text(t.category, 12, y)
    doc.text(t.count, 70, y)
    doc.text(t.win, 90, y)
    doc.text(t.expectancyCol, 115, y)
    doc.text(t.totalRCol, 150, y)
    doc.text(t.pf, 175, y)
    y += 4
    doc.setFont("helvetica", "normal")
    doc.setTextColor(15,23,42)
    Object.entries(obj).slice(0, 12).forEach(([k,v]: any)=>{
      if (y > 280) { doc.addPage(); y = 15 }
      doc.setFontSize(7)
      doc.text(k.slice(0, 22), 12, y)
      doc.text(String(v.count), 70, y)
      doc.text(`${v.win_rate}%`, 90, y)
      doc.text(`${v.expectancy}R`, 115, y)
      doc.text(`${v.total_r}R`, 150, y)
      doc.text(String(v.profit_factor), 175, y)
      y += 5
    })
    y += 4
  }

  section(t.emotionBreakdown, data.breakdown.by_emotion)
  section(t.setupBreakdown, data.breakdown.by_setup)
  section(t.indicatorBreakdown, data.breakdown.by_indicator)

  if (data.breakdown.by_weekday) {
    if (y > 250) { doc.addPage(); y = 15 }
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text(t.timeBreakdown, 10, y); y += 7
    Object.entries(data.breakdown.by_weekday).forEach(([k,v]: any)=>{
      if (y > 280) { doc.addPage(); y = 15 }
      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.text(`${k}: ${v.win_rate}% • ${v.expectancy}R • ${v.count} ${t.tradesSuffix}`, 12, y)
      y += 4
    })
    y += 2
    if (data.breakdown.by_hour) {
      doc.setFontSize(7)
      doc.setFont("helvetica", "bold")
      doc.text(`${t.weekdayHour}:`, 12, y); y += 4
      doc.setFont("helvetica", "normal")
      Object.entries(data.breakdown.by_hour).slice(0, 12).forEach(([k,v]: any)=>{
        if (y > 280) { doc.addPage(); y = 15 }
        doc.text(`${k}: ${v.win_rate}% • ${v.expectancy}R`, 12, y)
        y += 4
      })
    }
  }

  const pages = doc.getNumberOfPages()
  for (let i=1;i<=pages;i++) {
    doc.setPage(i)
    doc.setFontSize(6)
    doc.setTextColor(100,116,139)
    doc.text(`${t.footer} • ${t.page} ${i}/${pages} • koc-matrix.local`, 10, 290)
  }

  const fname = `koc-matrix-aylik-ozet-${new Date().toISOString().slice(0,10)}-${locale}.pdf`
  doc.save(fname)
}

export async function exportCalendarPdf(year: number, mode: "R"|"cash", data: any[], locale: Locale = "tr") {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const t = pdfT[locale]
  const now = new Date().toLocaleString(intlLocale(locale), { timeZone: "Europe/Istanbul" })
  doc.setFillColor(2, 6, 23)
  doc.rect(0, 0, 297, 14, "F")
  doc.setTextColor(0, 255, 136)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(`${t.calendarTitle} ${year} — ${mode === "R" ? t.modeR : t.modeCash}`, 10, 9)
  doc.setTextColor(148,163,184)
  doc.setFontSize(6)
  doc.text(`${t.generated}: ${now} Europe/Istanbul`, 230, 9)
  const byDate: Record<string, any> = Object.fromEntries(data.map(d=>[d.date,d]))
  const monthNames = locale === "tr" ? ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"] : locale === "de" ? ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"] : ["January","February","March","April","May","June","July","August","September","October","November","December"]
  let y = 18
  doc.setFontSize(7)
  doc.setTextColor(15,23,42)
  doc.setFont("helvetica", "normal")
  monthNames.forEach((name, mi)=>{
    const monthDays = new Date(year, mi+1, 0).getDate()
    let totalR = 0, totalCash = 0, count = 0
    for(let d=1; d<=monthDays; d++){
      const date = `${year}-${String(mi+1).padStart(2,"0")}-${String(d+1).padStart(2,"0")}`
      const cell = byDate[date]
      if(cell){ totalR += cell.total_r; totalCash += cell.total_cash; count += cell.count }
    }
    if (y > 190) { doc.addPage(); y = 15 }
    const val = mode==="R" ? totalR : totalCash
    const bg: [number,number,number] = count===0 ? [248,250,252] : val>0 ? [220,252,231] : val<0 ? [255,228,230] : [248,250,252]
    doc.setFillColor(bg[0], bg[1], bg[2])
    doc.rect(10, y-4, 277, 6, "F")
    doc.setDrawColor(203,213,225)
    doc.rect(10, y-4, 277, 6, "S")
    doc.setTextColor(15,23,42)
    doc.setFont("helvetica", "bold")
    doc.text(name, 12, y)
    doc.setFont("helvetica", "normal")
    doc.text(`${count} ${t.monthTotal}`, 50, y)
    doc.text(`${totalR.toFixed(2)}R`, 80, y)
    doc.text(`${Number(totalCash).toLocaleString(intlLocale(locale))} ${curFor(locale)}`, 115, y)
    let x = 160
    for(let d=1; d<=monthDays; d++){
      const date = `${year}-${String(mi+1).padStart(2,"0")}-${String(d+1).padStart(2,"0")}`
      const cell = byDate[date]
      if(cell){
        const v = mode==="R" ? cell.total_r : cell.total_cash
        const col: [number,number,number] = v>0 ? [0,200,100] : v<0 ? [220,50,80] : [180,180,180]
        doc.setFillColor(col[0], col[1], col[2])
        doc.circle(x, y-1.5, 1.2, "F")
      } else {
        doc.setFillColor(230,230,230)
        doc.circle(x, y-1.5, 0.7, "F")
      }
      x += 3.5
      if(x > 285) break
    }
    y += 7
  })
  doc.setFontSize(6)
  doc.setTextColor(100,116,139)
  doc.text(`${t.footer} • ${t.calendarTitle} • ${t.page} 1/1`, 10, 200)
  doc.save(`koc-matrix-takvim-${year}-${mode}-${locale}.pdf`)
}
