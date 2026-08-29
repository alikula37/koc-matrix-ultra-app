"use client"
export async function exportAnalyticsPdf(data: any, period: any) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })
  // Header
  doc.setFillColor(2, 6, 23)
  doc.rect(0, 0, 210, 18, "F")
  doc.setTextColor(0, 255, 136)
  doc.setFontSize(13)
  doc.setFont("helvetica", "bold")
  doc.text("KOÇ MATRIX ULTRA — AYLIK ÖZET", 10, 11)
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(7)
  doc.setFont("helvetica", "normal")
  doc.text(`Oluşturuldu: ${now} Europe/Istanbul • R & ₺ Paralel`, 10, 15)

  let y = 24
  const line = (t: string, v: string, opts?: { bold?: boolean, color?: [number,number,number] }) => {
    doc.setFontSize(9)
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal")
    doc.setTextColor(15, 23, 42)
    doc.text(t, 10, y)
    if (opts?.color) doc.setTextColor(opts.color[0], opts.color[1], opts.color[2])
    else doc.setTextColor(15, 23, 42)
    doc.text(v, 70, y)
    y += 6
  }

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  doc.text("TEMEL METRİKLER", 10, y); y += 7
  line("Toplam İşlem:", `${data.basic.total_trades}  (${data.basic.win_count}W / ${data.basic.loss_count}L  •  Win Rate ${data.basic.win_rate}%)`)
  line("Toplam R:", `${data.basic.total_r}R`, { bold: true, color: data.basic.total_r >=0 ? [0,128,0] : [204,0,51] })
  line("Toplam ₺:", `${Number(data.basic.total_cash).toLocaleString("tr-TR")} ₺`, { color: data.basic.total_cash >=0 ? [0,128,0] : [204,0,51] })
  line("Expectancy:", `${data.basic.expectancy}R`)
  line("Profit Factor:", `${data.basic.profit_factor}`)
  line("Ort. Kazanç / Kayıp:", `${data.basic.avg_win_r}R / ${data.basic.avg_loss_r}R`)
  line("Sharpe / Sortino:", `${data.basic.sharpe} / ${data.basic.sortino}`)
  line("Max Drawdown:", `${data.basic.max_drawdown_r}R / ${Number(data.basic.max_drawdown_cash).toLocaleString("tr-TR")} ₺`)
  line("Streak:", `${data.basic.consecutive_wins}W / ${data.basic.consecutive_losses}L`)
  line("Risk of Ruin:", `${(data.risk_of_ruin*100).toFixed(2)}%`)
  line("RR Sapma:", `${data.basic.rr_deviation}`)
  y += 3
  doc.setDrawColor(203, 213, 225)
  doc.line(10, y, 200, y); y += 6

  // Period summary if available
  if (period?.basic) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("BU AY — DÖNEMSEL ÖZET (period-summary)", 10, y); y += 7
    line("Bu Ay Toplam:", `${period.basic.total_r}R / ${Number(period.basic.total_cash).toLocaleString("tr-TR")} ₺`, { bold: true })
    line("Win Rate:", `${period.basic.win_rate}%`)
    if (period.best_setup) line("En İyi Setup:", `${period.best_setup}`)
    if (period.best_emotion) line("En İyi Duygu:", `${period.best_emotion}`)
    y += 2
    doc.line(10, y, 200, y); y += 6
  }

  // Breakdown by emotion/setup
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
    doc.text("Kategori", 12, y)
    doc.text("Adet", 70, y)
    doc.text("Win%", 90, y)
    doc.text("Expectancy", 115, y)
    doc.text("Toplam R", 150, y)
    doc.text("PF", 175, y)
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

  section("DUYGU KIRILIMI (Expectancy Matrisi)", data.breakdown.by_emotion)
  section("SETUP KIRILIMI", data.breakdown.by_setup)
  section("İNDİKATÖR KIRILIMI", data.breakdown.by_indicator)

  // Weekday / hour
  if (data.breakdown.by_weekday) {
    if (y > 250) { doc.addPage(); y = 15 }
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("ZAMAN KIRILIMI — GÜN / SAAT (Europe/Istanbul)", 10, y); y += 7
    Object.entries(data.breakdown.by_weekday).forEach(([k,v]: any)=>{
      if (y > 280) { doc.addPage(); y = 15 }
      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.text(`${k}: ${v.win_rate}% • ${v.expectancy}R • ${v.count} işlem`, 12, y)
      y += 4
    })
    y += 2
    if (data.breakdown.by_hour) {
      doc.setFontSize(7)
      doc.setFont("helvetica", "bold")
      doc.text("Saatlik:", 12, y); y += 4
      doc.setFont("helvetica", "normal")
      Object.entries(data.breakdown.by_hour).slice(0, 12).forEach(([k,v]: any)=>{
        if (y > 280) { doc.addPage(); y = 15 }
        doc.text(`${k}: ${v.win_rate}% • ${v.expectancy}R`, 12, y)
        y += 4
      })
    }
  }

  // Footer
  const pages = doc.getNumberOfPages()
  for (let i=1;i<=pages;i++) {
    doc.setPage(i)
    doc.setFontSize(6)
    doc.setTextColor(100,116,139)
    doc.text(`Koç Matrix Ultra • Production-grade Trading Journal • Sayfa ${i}/${pages} • koc-matrix.local`, 10, 290)
  }

  const fname = `koc-matrix-aylik-ozet-${new Date().toISOString().slice(0,10)}.pdf`
  doc.save(fname)
}

export async function exportCalendarPdf(year: number, mode: "R"|"cash", data: any[]) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })
  doc.setFillColor(2, 6, 23)
  doc.rect(0, 0, 297, 14, "F")
  doc.setTextColor(0, 255, 136)
  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text(`KOÇ MATRIX ULTRA — TAKVIM HEATMAP ${year} — ${mode === "R" ? "R Modu" : "₺ Modu"}`, 10, 9)
  doc.setTextColor(148,163,184)
  doc.setFontSize(6)
  doc.text(`Oluşturuldu: ${now} Europe/Istanbul`, 230, 9)
  const byDate: Record<string, any> = Object.fromEntries(data.map(d=>[d.date,d]))
  const monthNames = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"]
  let y = 18
  doc.setFontSize(7)
  doc.setTextColor(15,23,42)
  doc.setFont("helvetica", "normal")
  // Simple monthly totals table
  monthNames.forEach((name, mi)=>{
    // collect month totals
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
    doc.text(`${count} işlem`, 50, y)
    doc.text(`${totalR.toFixed(2)}R`, 80, y)
    doc.text(`${Number(totalCash).toLocaleString("tr-TR")} ₺`, 115, y)
    // mini heatmap dots for days
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
  doc.text(`Koç Matrix Ultra • Takvim Heatmap • Sayfa 1/1`, 10, 200)
  doc.save(`koc-matrix-takvim-${year}-${mode}.pdf`)
}
