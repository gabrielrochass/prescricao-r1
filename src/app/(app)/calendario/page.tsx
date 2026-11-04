"use client"

import { useEffect, useState } from "react"
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AgendaBadge } from "@/components/mr1/agenda-badge"
import type { AgendaItem } from "@/lib/types"
import { getAgendaRange } from "@/lib/db/agenda"
import { cn } from "@/lib/utils"

export default function CalendarioPage() {
  const [viewDate, setViewDate] = useState<Date | null>(null)
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"week" | "month">("week")

  useEffect(() => {
    if (!viewDate) {
      setViewDate(new Date())
      return
    }

    async function load() {
      try {
        const vd = viewDate!
        const weekStart = startOfWeek(vd, { weekStartsOn: 1 })
        const rangeStart = format(view === "week" ? weekStart : new Date(vd.getFullYear(), vd.getMonth(), 1), "yyyy-MM-dd")
        const rangeEnd = format(view === "week" ? endOfWeek(vd, { weekStartsOn: 1 }) : new Date(vd.getFullYear(), vd.getMonth() + 1, 0), "yyyy-MM-dd")
        const data = await getAgendaRange(rangeStart, rangeEnd)
        setItems(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [viewDate, view])

  if (!viewDate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  const vd = viewDate!
  const weekStart = startOfWeek(vd, { weekStartsOn: 1 })
  const days = view === "week"
    ? eachDayOfInterval({ start: weekStart, end: endOfWeek(vd, { weekStartsOn: 1 }) })
    : eachDayOfInterval({ start: new Date(vd.getFullYear(), vd.getMonth(), 1), end: new Date(vd.getFullYear(), vd.getMonth() + 1, 0) })

  function navigate(dir: number) {
    if (view === "week") {
      setViewDate(dir > 0 ? addWeeks(vd, 1) : subWeeks(vd, 1))
    } else {
      setViewDate(new Date(vd.getFullYear(), vd.getMonth() + dir, 1))
    }
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header + view toggle */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Calendário</h1>
        <div className="flex gap-1 bg-[var(--color-mr1-lines)] rounded-lg p-0.5">
          <button
            onClick={() => setView("week")}
            className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
              view === "week" ? "bg-white text-[var(--color-mr1-text)]" : "text-[var(--color-mr1-text2)]"
            )}
          >Semana</button>
          <button
            onClick={() => setView("month")}
            className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
              view === "month" ? "bg-white text-[var(--color-mr1-text)]" : "text-[var(--color-mr1-text2)]"
            )}
          >Mês</button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-[var(--color-mr1-lines)] rounded-lg touch-target">
          <ChevronLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </button>
        <p className="text-sm font-semibold text-[var(--color-mr1-text)] capitalize">
          {view === "week"
            ? `${format(weekStart, "d MMM", { locale: ptBR })} — ${format(endOfWeek(viewDate, { weekStartsOn: 1 }), "d MMM", { locale: ptBR })}`
            : format(viewDate, "MMMM yyyy", { locale: ptBR })
          }
        </p>
        <button onClick={() => navigate(1)} className="p-2 hover:bg-[var(--color-mr1-lines)] rounded-lg touch-target">
          <ChevronRight className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </button>
      </div>

      {/* Calendar grid */}
      {view === "week" ? (
        <div className="space-y-2">
          {days.map(day => {
            const dateStr = format(day, "yyyy-MM-dd")
            const dayItems = items.filter(i => i.planned_date === dateStr)
            const totalQ = dayItems.reduce((s, i) => s + (i.planned_questions ?? 0), 0)
            const today = isToday(day)

            return (
              <Card key={dateStr} className={cn("border-0 shadow-sm", today && "ring-2 ring-[var(--color-mr1-action)]")}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-semibold capitalize",
                        today ? "text-[var(--color-mr1-action)]" : "text-[var(--color-mr1-text)]"
                      )}>
                        {format(day, "EEE d", { locale: ptBR })}
                      </span>
                      {today && (
                        <span className="text-[9px] bg-[var(--color-mr1-action)] text-white px-1.5 py-0.5 rounded-full font-semibold">
                          HOJE
                        </span>
                      )}
                    </div>
                    {totalQ > 0 && (
                      <span className="text-[10px] text-[var(--color-mr1-text2)]">{totalQ}q</span>
                    )}
                  </div>
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-[var(--color-mr1-text2)]">Livre</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {dayItems.map(item => (
                        <div key={item.id} className="flex items-center gap-1.5 bg-[var(--color-mr1-bg)] rounded-lg px-2 py-1">
                          <AgendaBadge type={item.type} reviewNumber={item.review_number} />
                          <span className={cn(
                            "text-xs truncate max-w-[120px]",
                            item.status === "done" ? "line-through text-[var(--color-mr1-text2)]" : "text-[var(--color-mr1-text)]"
                          )}>
                            {item.subject?.grade_lesson?.name ?? "Simulado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Month view — compact grid */
        <div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(d => (
              <div key={d} className="text-[9px] text-[var(--color-mr1-text2)] text-center font-medium">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* Pad start */}
            {Array.from({ length: (days[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {days.map(day => {
              const dateStr = format(day, "yyyy-MM-dd")
              const dayItems = items.filter(i => i.planned_date === dateStr)
              const today = isToday(day)
              const hasStudy = dayItems.some(i => i.type === "study" || i.type === "fixation")
              const hasReview = dayItems.some(i => i.type === "review" || i.type === "guaranteed_review")
              const hasSimulado = dayItems.some(i => i.type === "simulado")

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs",
                    today ? "bg-[var(--color-mr1-action)] text-white" : "bg-white"
                  )}
                >
                  <span className={cn("font-medium", !today && "text-[var(--color-mr1-text)]")}>
                    {day.getDate()}
                  </span>
                  <div className="flex gap-0.5">
                    {hasStudy && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-mr1-orange)]" />}
                    {hasReview && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-mr1-pink)]" />}
                    {hasSimulado && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-mr1-action)]" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
