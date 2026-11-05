"use client"

import { useEffect, useState, useMemo } from "react"
import {
  format,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isToday,
  getDay,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { AgendaBadge } from "@/components/mr1/agenda-badge"
import type { AgendaItem, AgendaType } from "@/lib/types"
import { getAgendaRange } from "@/lib/db/agenda"
import { cn } from "@/lib/utils"

// ─── Constants ───

const DAILY_QUESTION_LIMIT = 40

const WEEKDAY_HEADERS = ["D", "S", "T", "Q", "Q", "S", "S"]

const TYPE_LABEL: Record<AgendaType, string> = {
  study: "estudo",
  fixation: "fixação",
  review: "revisão",
  simulado: "simulado",
  guaranteed_review: "revisão",
}

const TYPE_LETTER: Record<AgendaType, string> = {
  study: "E",
  fixation: "F",
  review: "R",
  simulado: "S",
  guaranteed_review: "R",
}

// ─── Helpers ───

function getItemName(item: AgendaItem): string {
  if (item.type === "simulado") return "Simulado"
  return item.subject?.grade_lesson?.name ?? "Sem nome"
}

function getItemDescription(item: AgendaItem): string {
  switch (item.type) {
    case "study":
      return "aula"
    case "fixation":
      return `fixação ${item.planned_questions ?? 0}q`
    case "review":
    case "guaranteed_review": {
      const rn = item.review_number ? `R${item.review_number}` : "R"
      return `${rn}, ${item.planned_questions ?? 0}q`
    }
    case "simulado":
      return "simulado"
    default:
      return ""
  }
}

function getTagColor(type: AgendaType): { bg: string; text: string } {
  if (type === "study" || type === "fixation") {
    return { bg: "bg-[var(--color-mr1-orange-tag)]", text: "text-[var(--color-mr1-orange)]" }
  }
  return { bg: "bg-[var(--color-mr1-pink-tag)]", text: "text-[var(--color-mr1-pink)]" }
}

function getMiniTagLabel(item: AgendaItem): string {
  const letter = TYPE_LETTER[item.type]
  const rn = item.type === "review" && item.review_number ? item.review_number : ""
  const name = getItemName(item)
  return `${letter}${rn} ${name.substring(0, 4)}...`
}

function getBigArea(item: AgendaItem): string {
  return item.subject?.grade_lesson?.big_area ?? ""
}

function getCategory(item: AgendaItem): string {
  const c = item.subject?.grade_lesson?.category
  if (!c) return ""
  const names: Record<string, string> = {
    essential: "essencial",
    important: "importante",
    complementary: "complementar",
  }
  return names[c] ?? c
}

function getIncidence(item: AgendaItem): string {
  const i = item.subject?.incidence
  if (!i) return ""
  const names: Record<string, string> = { high: "alta", medium: "média", low: "baixa" }
  return names[i] ?? i
}

// ─── Component ───

type ViewMode = "day" | "week" | "month"

export default function CalendarioPage() {
  const [viewDate, setViewDate] = useState<Date | null>(null)
  const [items, setItems] = useState<AgendaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>("month")

  // Init date in useEffect to avoid Next.js 16 SSR issues
  useEffect(() => {
    if (!viewDate) {
      setViewDate(new Date())
    }
  }, [viewDate])

  // Fetch data when viewDate or view changes
  useEffect(() => {
    if (!viewDate) return

    async function load() {
      setLoading(true)
      try {
        const vd = viewDate!
        let rangeStart: string
        let rangeEnd: string

        if (view === "day") {
          rangeStart = format(vd, "yyyy-MM-dd")
          rangeEnd = rangeStart
        } else if (view === "week") {
          const ws = startOfWeek(vd, { weekStartsOn: 0 })
          const we = endOfWeek(vd, { weekStartsOn: 0 })
          rangeStart = format(ws, "yyyy-MM-dd")
          rangeEnd = format(we, "yyyy-MM-dd")
        } else {
          const ms = startOfMonth(vd)
          const me = endOfMonth(vd)
          rangeStart = format(ms, "yyyy-MM-dd")
          rangeEnd = format(me, "yyyy-MM-dd")
        }

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

  // Group items by date
  const itemsByDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>()
    for (const item of items) {
      const key = item.planned_date
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return map
  }, [items])

  if (!viewDate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  // ─── Navigation ───

  function navigate(dir: number) {
    if (view === "day") {
      setViewDate(dir > 0 ? addDays(viewDate!, 1) : subDays(viewDate!, 1))
    } else if (view === "week") {
      setViewDate(dir > 0 ? addWeeks(viewDate!, 1) : subWeeks(viewDate!, 1))
    } else {
      setViewDate(dir > 0 ? addMonths(viewDate!, 1) : subMonths(viewDate!, 1))
    }
  }

  function goToday() {
    setViewDate(new Date())
  }

  function getNavLabel(): string {
    const vd = viewDate!
    if (view === "day") {
      return format(vd, "EEE., dd 'De' MMM.", { locale: ptBR })
    }
    if (view === "week") {
      const ws = startOfWeek(vd, { weekStartsOn: 0 })
      const we = endOfWeek(vd, { weekStartsOn: 0 })
      return `${format(ws, "dd/MM")} A ${format(we, "dd/MM")}`
    }
    // month
    const label = format(vd, "MMMM 'De' yyyy", { locale: ptBR })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  // ─── Week View helpers ───

  function getWeekDays(): Date[] {
    const ws = startOfWeek(viewDate!, { weekStartsOn: 0 })
    const we = endOfWeek(viewDate!, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: ws, end: we })
  }

  const WEEKDAY_ABBREVS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"]

  // ─── Month View helpers ───

  function getMonthGrid(): (Date | null)[] {
    const ms = startOfMonth(viewDate!)
    const me = endOfMonth(viewDate!)
    const days = eachDayOfInterval({ start: ms, end: me })
    const startDow = getDay(ms) // 0=Sun
    const grid: (Date | null)[] = []

    // Pad start
    for (let i = 0; i < startDow; i++) grid.push(null)
    for (const d of days) grid.push(d)

    return grid
  }

  // ─── Render ───

  return (
    <div className="px-4 pt-6 pb-28 space-y-4">
      {/* Header */}
      <h1 className="font-display text-3xl italic text-[var(--color-mr1-text)]">Calendário</h1>

      {/* Segmented control */}
      <div className="flex bg-[#F1E4E9] rounded-full p-1">
        {(["day", "week", "month"] as ViewMode[]).map((v) => {
          const labels: Record<ViewMode, string> = { day: "Dia", week: "Semana", month: "Mês" }
          const active = view === v
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-full transition-colors active:opacity-80",
                active
                  ? "bg-[#C23B6C] text-white"
                  : "text-[#7C6673]"
              )}
            >
              {labels[v]}
            </button>
          )
        })}
      </div>

      {/* Navigation row */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg touch-target">
          <ChevronLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </button>
        <p className="text-sm font-semibold text-[var(--color-mr1-text)] capitalize">
          {getNavLabel()}
        </p>
        <button onClick={() => navigate(1)} className="p-2 rounded-lg touch-target">
          <ChevronRight className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </button>
      </div>

      {/* Hoje button */}
      <div className="flex justify-center">
        <button
          onClick={goToday}
          className="text-xs font-semibold text-[#C23B6C] border border-[#C23B6C] rounded-full px-4 py-1 hover:bg-[#C23B6C]/10 transition-colors"
        >
          Hoje
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
        </div>
      ) : (
        <>
          {/* ─── MONTH VIEW ─── */}
          {view === "month" && (
            <div>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAY_HEADERS.map((d, i) => (
                  <div key={i} className="text-[11px] text-[var(--color-mr1-text2)] text-center font-semibold py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-[2px]">
                {getMonthGrid().map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} className="min-h-[52px]" />

                  const dateStr = format(day, "yyyy-MM-dd")
                  const dayItems = itemsByDate.get(dateStr) ?? []
                  const today = isToday(day)
                  const totalQ = dayItems.reduce((s, it) => s + (it.planned_questions ?? 0), 0)
                  const overLimit = totalQ > DAILY_QUESTION_LIMIT

                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "min-h-[52px] rounded-lg p-[2px] flex flex-col items-center",
                        overLimit && "bg-[var(--color-mr1-butter)]"
                      )}
                    >
                      {/* Day number */}
                      <div
                        className={cn(
                          "w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold mb-[2px]",
                          today
                            ? "bg-[#C23B6C] text-white"
                            : "text-[var(--color-mr1-text)]"
                        )}
                      >
                        {day.getDate()}
                      </div>

                      {/* Mini tags */}
                      <div className="flex flex-col gap-[1px] w-full px-[1px]">
                        {dayItems.slice(0, 3).map((item) => {
                          const color = getTagColor(item.type)
                          const isDone = item.status === "done"
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "rounded-[3px] px-[3px] py-[0.5px] text-[7px] font-medium leading-tight truncate",
                                isDone
                                  ? "bg-gray-200 text-gray-400"
                                  : item.status === "planned"
                                    ? `${color.bg} ${color.text} border border-dashed border-current/30`
                                    : `${color.bg} ${color.text}`
                              )}
                            >
                              {getMiniTagLabel(item)}
                            </div>
                          )
                        })}
                        {dayItems.length > 3 && (
                          <div className="text-[7px] text-[var(--color-mr1-text2)] text-center">
                            +{dayItems.length - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-3 justify-center">
                {[
                  { letter: "E", label: "estudo", color: "bg-[var(--color-mr1-orange)]" },
                  { letter: "F", label: "fixação", color: "bg-[var(--color-mr1-orange)]" },
                  { letter: "R1", label: "revisão", color: "bg-[var(--color-mr1-pink)]" },
                  { letter: "S", label: "simulado", color: "bg-[var(--color-mr1-pink)]" },
                ].map((l) => (
                  <div key={l.letter} className="flex items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full", l.color)} />
                    <span className="text-[10px] text-[var(--color-mr1-text2)]">
                      <span className="font-semibold">{l.letter}</span> {l.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-[var(--color-mr1-text2)] text-center mt-2 leading-snug">
                Tracejado é previsto e cinza é feito. Fundo amarelo marca dia acima do limite.
              </p>
            </div>
          )}

          {/* ─── WEEK VIEW ─── */}
          {view === "week" && (
            <div className="space-y-2">
              {getWeekDays().map((day) => {
                const dateStr = format(day, "yyyy-MM-dd")
                const dayItems = itemsByDate.get(dateStr) ?? []
                const today = isToday(day)
                const totalQ = dayItems.reduce((s, it) => s + (it.planned_questions ?? 0), 0)
                const doneQ = dayItems.reduce((s, it) => s + (it.done_questions ?? 0), 0)
                const dow = getDay(day)

                return (
                  <div
                    key={dateStr}
                    className={cn(
                      "rounded-xl bg-white p-3",
                      today && "ring-2 ring-[#C23B6C]"
                    )}
                  >
                    {/* Day header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            today ? "text-[#C23B6C]" : "text-[var(--color-mr1-text)]"
                          )}
                        >
                          {WEEKDAY_ABBREVS[dow]} {day.getDate()}
                        </span>
                        {today && (
                          <span className="text-[8px] bg-[#C23B6C] text-white px-1.5 py-0.5 rounded-full font-bold uppercase">
                            Hoje
                          </span>
                        )}
                      </div>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] text-[var(--color-mr1-text2)]">
                          {dayItems.length} {dayItems.length === 1 ? "item" : "itens"}, {doneQ} de {totalQ} questões
                        </span>
                      )}
                    </div>

                    {/* Items */}
                    {dayItems.length === 0 ? (
                      <p className="text-xs text-[var(--color-mr1-text2)]">Livre</p>
                    ) : (
                      <div className="space-y-1.5">
                        {dayItems.map((item) => {
                          const isDone = item.status === "done"
                          return (
                            <div key={item.id} className="flex items-center gap-2">
                              <AgendaBadge type={item.type} reviewNumber={item.review_number} />
                              <span
                                className={cn(
                                  "text-xs truncate",
                                  isDone
                                    ? "line-through text-[var(--color-mr1-text2)]"
                                    : "text-[var(--color-mr1-text)]"
                                )}
                              >
                                {getItemName(item)}, {TYPE_LABEL[item.type]}
                                {(item.planned_questions ?? 0) > 0 ? ` ${item.planned_questions}q` : ""}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              <p className="text-[10px] text-[var(--color-mr1-text2)] text-center mt-2 leading-snug">
                Toque num estudo previsto para trocar de dia. A fixação vai junto.
              </p>
            </div>
          )}

          {/* ─── DAY VIEW ─── */}
          {view === "day" && (() => {
            const dateStr = format(viewDate!, "yyyy-MM-dd")
            const dayItems = itemsByDate.get(dateStr) ?? []
            const studyItems = dayItems.filter((i) => i.type === "study" || i.type === "fixation")
            const reviewItems = dayItems.filter(
              (i) => i.type === "review" || i.type === "guaranteed_review"
            )
            const simuladoItems = dayItems.filter((i) => i.type === "simulado")

            return (
              <div className="space-y-3">
                {/* Day summary header */}
                <div className="rounded-xl bg-[#C23B6C] text-white px-4 py-3 text-center">
                  <span className="text-sm font-semibold">
                    {dayItems.length} {dayItems.length === 1 ? "item" : "itens"} no dia
                  </span>
                </div>

                {/* Study & Fixation section */}
                {studyItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--color-mr1-text2)] tracking-wider mb-2 uppercase">
                      Estudos e Fixação
                    </p>
                    <div className="space-y-2">
                      {studyItems.map((item) => {
                        const isDone = item.status === "done"
                        const area = getBigArea(item)
                        const category = getCategory(item)
                        const incidence = getIncidence(item)
                        const meta = [area, category, incidence].filter(Boolean).join(" · ")

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "rounded-xl bg-white p-3",
                              isDone && "opacity-60"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <AgendaBadge type={item.type} reviewNumber={item.review_number} className="mt-0.5" />
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "text-sm font-semibold truncate",
                                      isDone
                                        ? "line-through text-[var(--color-mr1-text2)]"
                                        : "text-[var(--color-mr1-text)]"
                                    )}
                                  >
                                    {getItemName(item)}
                                  </p>
                                  {meta && (
                                    <p className="text-[10px] text-[var(--color-mr1-text2)] mt-0.5">
                                      {meta}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] text-[var(--color-mr1-text2)] whitespace-nowrap">
                                {getItemDescription(item)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Review section */}
                {reviewItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--color-mr1-text2)] tracking-wider mb-2 uppercase">
                      Revisões
                    </p>
                    <div className="space-y-2">
                      {reviewItems.map((item) => {
                        const isDone = item.status === "done"
                        const area = getBigArea(item)
                        const category = getCategory(item)
                        const incidence = getIncidence(item)
                        const meta = [area, category, incidence].filter(Boolean).join(" · ")

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "rounded-xl bg-white p-3",
                              isDone && "opacity-60"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <AgendaBadge type={item.type} reviewNumber={item.review_number} className="mt-0.5" />
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "text-sm font-semibold truncate",
                                      isDone
                                        ? "line-through text-[var(--color-mr1-text2)]"
                                        : "text-[var(--color-mr1-text)]"
                                    )}
                                  >
                                    {getItemName(item)}
                                  </p>
                                  {meta && (
                                    <p className="text-[10px] text-[var(--color-mr1-text2)] mt-0.5">
                                      {meta}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] text-[var(--color-mr1-text2)] whitespace-nowrap">
                                {getItemDescription(item)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Simulado section */}
                {simuladoItems.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-[var(--color-mr1-text2)] tracking-wider mb-2 uppercase">
                      Simulados
                    </p>
                    <div className="space-y-2">
                      {simuladoItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl bg-white p-3"
                        >
                          <div className="flex items-center gap-2">
                            <AgendaBadge type={item.type} />
                            <p className="text-sm font-semibold text-[var(--color-mr1-text)]">
                              Simulado
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {dayItems.length === 0 && (
                  <div className="rounded-xl bg-white p-6 text-center">
                    <p className="text-sm text-[var(--color-mr1-text2)]">Nenhum item para este dia.</p>
                  </div>
                )}

                <p className="text-[10px] text-[var(--color-mr1-text2)] text-center mt-2 leading-snug">
                  Os dados de aula vêm do cronograma cadastrado.
                </p>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
