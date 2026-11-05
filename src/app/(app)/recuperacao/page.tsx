"use client"

import { useEffect, useState, useMemo } from "react"
import { format, differenceInDays, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { AlertTriangle, CalendarDays, CheckSquare, Square, ArrowLeft, CheckCircle2 } from "lucide-react"
import { AgendaBadge } from "@/components/mr1/agenda-badge"
import type { AgendaItem, AgendaType } from "@/lib/types"
import { getOverdueItems, getAgendaRange, rescheduleItem, markOverdueItems } from "@/lib/db/agenda"
import { cn } from "@/lib/utils"
import Link from "next/link"

const TYPE_ORDER: AgendaType[] = ["study", "fixation", "review", "simulado", "guaranteed_review"]
const TYPE_LABELS: Record<AgendaType, string> = {
  study: "Estudo",
  fixation: "Fixacao",
  review: "Revisao",
  simulado: "Simulado",
  guaranteed_review: "Revisao Garantida",
}

export default function RecuperacaoPage() {
  const [overdueItems, setOverdueItems] = useState<AgendaItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState<Date | null>(null)
  const [step, setStep] = useState<"select" | "date">("select")
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined)
  const [dateLoads, setDateLoads] = useState<Record<string, number>>({})
  const [rescheduling, setRescheduling] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const now = new Date()
    setToday(now)

    async function load() {
      try {
        await markOverdueItems()
        const items = await getOverdueItems()
        setOverdueItems(items)

        // Load question counts for next 30 days
        const start = format(now, "yyyy-MM-dd")
        const end = format(addDays(now, 30), "yyyy-MM-dd")
        const rangeItems = await getAgendaRange(start, end)

        const loads: Record<string, number> = {}
        for (const item of rangeItems) {
          const d = item.planned_date
          loads[d] = (loads[d] ?? 0) + (item.planned_questions ?? 0)
        }
        setDateLoads(loads)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const grouped = useMemo(() => {
    const groups: Partial<Record<AgendaType, AgendaItem[]>> = {}
    for (const item of overdueItems) {
      const key = item.type
      if (!groups[key]) groups[key] = []
      groups[key]!.push(item)
    }
    return groups
  }, [overdueItems])

  function toggleItem(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selectedIds.size === overdueItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(overdueItems.map(i => i.id)))
    }
  }

  const selectedCount = selectedIds.size
  const selectedQuestions = overdueItems
    .filter(i => selectedIds.has(i.id))
    .reduce((s, i) => s + (i.planned_questions ?? 0), 0)

  async function handleReschedule() {
    if (!targetDate || selectedIds.size === 0) return
    setRescheduling(true)

    try {
      const dateStr = format(targetDate, "yyyy-MM-dd")
      const promises = Array.from(selectedIds).map(id => rescheduleItem(id, dateStr))
      await Promise.all(promises)

      setOverdueItems(prev => prev.filter(i => !selectedIds.has(i.id)))
      setSelectedIds(new Set())
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setStep("select")
        setTargetDate(undefined)
      }, 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setRescheduling(false)
    }
  }

  if (loading || !today) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-4">
        <div className="h-20 w-20 rounded-full bg-[var(--color-mr1-orange-bg)] flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-[var(--color-mr1-orange)]" />
        </div>
        <h2 className="font-display text-2xl text-[var(--color-mr1-text)]">Itens reagendados</h2>
        <p className="text-sm text-[var(--color-mr1-text2)]">
          Itens movidos com sucesso
        </p>
      </div>
    )
  }

  if (overdueItems.length === 0) {
    return (
      <div className="px-4 pt-6 space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/hoje" className="touch-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
          </Link>
          <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Recuperacao</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-full bg-[var(--color-mr1-orange-bg)] flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-mr1-orange)]" />
          </div>
          <p className="text-sm text-[var(--color-mr1-text2)]">Nenhum item atrasado</p>
        </div>
      </div>
    )
  }

  // Step: pick date
  if (step === "date") {
    const targetDateStr = targetDate ? format(targetDate, "yyyy-MM-dd") : null
    const currentLoad = targetDateStr ? (dateLoads[targetDateStr] ?? 0) : 0
    const newLoad = currentLoad + selectedQuestions

    return (
      <div className="px-4 pt-6 space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep("select")} className="touch-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
          </button>
          <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Escolher data</h1>
        </div>

        <p className="text-sm text-[var(--color-mr1-text2)]">
          {selectedCount} {selectedCount === 1 ? "item selecionado" : "itens selecionados"} ({selectedQuestions} questoes)
        </p>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-2 flex justify-center">
            <Calendar
              mode="single"
              selected={targetDate}
              onSelect={setTargetDate}
              disabled={{ before: addDays(today, 1) }}
              locale={ptBR}
            />
          </CardContent>
        </Card>

        {/* Load preview */}
        {targetDate && (
          <Card className={cn(
            "border-0 shadow-sm",
            newLoad > 40 ? "bg-[var(--color-mr1-butter)]" : "bg-white"
          )}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-mr1-text2)]">Carga atual no dia</span>
                <span className="text-sm font-semibold text-[var(--color-mr1-text)]">{currentLoad}q</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-mr1-text2)]">Itens reagendados</span>
                <span className="text-sm font-semibold text-[var(--color-mr1-action)]">+{selectedQuestions}q</span>
              </div>
              <div className="border-t border-[var(--color-mr1-lines)] pt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-mr1-text)]">Total</span>
                <span className={cn(
                  "text-sm font-bold",
                  newLoad > 40 ? "text-red-600" : "text-[var(--color-mr1-text)]"
                )}>
                  {newLoad}q
                </span>
              </div>
              {newLoad > 40 && (
                <p className="text-[10px] text-[var(--color-mr1-text2)] flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-[var(--color-mr1-orange)]" />
                  Dia com carga alta. Considere dividir em mais dias.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleReschedule}
          disabled={!targetDate || rescheduling}
          className="w-full h-12 text-base font-semibold bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white"
        >
          {rescheduling ? <><span className="mr1-spinner" /> Reagendando...</> : "Reagendar"}
        </Button>
      </div>
    )
  }

  // Step: select items
  return (
    <div className="px-4 pt-6 space-y-4 pb-28">
      <div className="flex items-center gap-3">
        <Link href="/hoje" className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </Link>
        <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Recuperacao</h1>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-mr1-text2)]">
          {overdueItems.length} {overdueItems.length === 1 ? "item atrasado" : "itens atrasados"}
        </p>
        <button
          onClick={toggleAll}
          className="text-xs font-medium text-[var(--color-mr1-action)] touch-target"
        >
          {selectedIds.size === overdueItems.length ? "Desmarcar tudo" : "Selecionar tudo"}
        </button>
      </div>

      {/* Grouped overdue items */}
      {TYPE_ORDER.map(type => {
        const items = grouped[type]
        if (!items || items.length === 0) return null

        return (
          <Card key={type} className="border-0 shadow-sm bg-[var(--color-mr1-butter)]">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)] flex items-center gap-2">
                <AgendaBadge type={type} />
                {TYPE_LABELS[type]} ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-1.5">
              {items.map(item => {
                const daysLate = differenceInDays(today, new Date(item.planned_date))
                const isSelected = selectedIds.has(item.id)

                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-colors touch-target text-left active:bg-[#F1E4E9]",
                      isSelected ? "bg-[var(--color-mr1-action)]/10" : "bg-white"
                    )}
                  >
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-[var(--color-mr1-action)] shrink-0" />
                    ) : (
                      <Square className="h-5 w-5 text-[var(--color-mr1-text2)] shrink-0" />
                    )}
                    <AgendaBadge type={item.type} reviewNumber={item.review_number} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-[var(--color-mr1-text)] truncate block">
                        {item.subject?.grade_lesson?.name ?? "Simulado"}
                      </span>
                      <p className="text-[10px] text-[var(--color-mr1-text2)]">
                        atrasado ha {daysLate} {daysLate === 1 ? "dia" : "dias"}
                      </p>
                    </div>
                    {item.planned_questions && (
                      <span className="text-[10px] text-[var(--color-mr1-text2)] shrink-0">
                        {item.planned_questions}q
                      </span>
                    )}
                  </button>
                )
              })}
            </CardContent>
          </Card>
        )
      })}

      {/* Float action bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-40">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={() => setStep("date")}
              className="w-full h-12 text-base font-semibold bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white shadow-lg"
            >
              <CalendarDays className="h-5 w-5 mr-2" />
              Reagendar {selectedCount} {selectedCount === 1 ? "item" : "itens"} ({selectedQuestions}q)
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
