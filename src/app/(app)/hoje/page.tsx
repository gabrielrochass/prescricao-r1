"use client"

import { useEffect, useState } from "react"
import { format, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Check, ChevronRight, Clock, Info } from "lucide-react"
import { DonutChart } from "@/components/mr1/donut-chart"
import { AgendaBadge } from "@/components/mr1/agenda-badge"
import type { AgendaItem, AgendaType, Exam, User } from "@/lib/types"
import {
  getAgendaForDate,
  getOverdueItems,
  getTodayQuestionCount,
  completeAgendaItem,
  markOverdueItems,
} from "@/lib/db/agenda"
import { getExams } from "@/lib/db/exams"
import { getUser } from "@/lib/db/users"
import { getDailyLimit } from "@/lib/engine/load-balancer"
import { cn } from "@/lib/utils"
import Link from "next/link"

// ─── Helpers ───

function getItemDescription(item: AgendaItem): string {
  switch (item.type) {
    case "study":
      return "Aula"
    case "fixation":
      return `Fixacao, ${item.planned_questions ?? 0} questoes`
    case "review":
    case "guaranteed_review":
      return `Revisao, ${item.planned_questions ?? 0} questoes`
    case "simulado":
      return "Simulado"
    default:
      return ""
  }
}

function getItemLink(item: AgendaItem): string | null {
  if (item.type === "review" || item.type === "fixation" || item.type === "guaranteed_review") {
    return `/revisao/${item.id}`
  }
  return null
}

function isQuestionType(type: AgendaType): boolean {
  return type === "fixation" || type === "review" || type === "guaranteed_review"
}

// ─── Page ───

export default function HojePage() {
  const [todayItems, setTodayItems] = useState<AgendaItem[]>([])
  const [overdueItems, setOverdueItems] = useState<AgendaItem[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [questionsToday, setQuestionsToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState<Date | null>(null)

  useEffect(() => {
    const now = new Date()
    setToday(now)
    const dateStr = format(now, "yyyy-MM-dd")

    async function load() {
      try {
        await markOverdueItems()
        const [items, overdue, ex, u, qc] = await Promise.all([
          getAgendaForDate(dateStr),
          getOverdueItems(),
          getExams(),
          getUser(),
          getTodayQuestionCount(),
        ])
        setTodayItems(items)
        setOverdueItems(overdue)
        setExams(ex)
        setUser(u)
        setQuestionsToday(qc)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || !today) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-mr1-bg)]">
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  // ─── Derived data ───

  const dailyLimit = getDailyLimit(
    user?.created_at ?? format(today, "yyyy-MM-dd"),
    user?.daily_limit_initial ?? 30,
  )

  // Question progress: count only question-based items (fixation + review)
  const questionItems = todayItems.filter((i) => isQuestionType(i.type))
  const totalQuestions = questionItems.reduce((s, i) => s + (i.planned_questions ?? 0), 0)
  const doneQuestions = questionItems
    .filter((i) => i.status === "done")
    .reduce((s, i) => s + (i.done_questions ?? i.planned_questions ?? 0), 0)
  const remainingQuestions = totalQuestions - doneQuestions
  const progressPct = totalQuestions > 0 ? Math.round((doneQuestions / totalQuestions) * 100) : 0

  // Breakdown by type
  const fixationItems = todayItems.filter((i) => i.type === "fixation")
  const fixationTotal = fixationItems.reduce((s, i) => s + (i.planned_questions ?? 0), 0)
  const fixationDone = fixationItems
    .filter((i) => i.status === "done")
    .reduce((s, i) => s + (i.done_questions ?? i.planned_questions ?? 0), 0)

  const reviewItems = todayItems.filter(
    (i) => i.type === "review" || i.type === "guaranteed_review",
  )
  const reviewTotal = reviewItems.reduce((s, i) => s + (i.planned_questions ?? 0), 0)
  const reviewDone = reviewItems
    .filter((i) => i.status === "done")
    .reduce((s, i) => s + (i.done_questions ?? i.planned_questions ?? 0), 0)

  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR })

  // Exam countdowns
  const sesExam = exams.find((e) => e.name.toLowerCase().includes("ses"))
  const enamedExam = exams.find((e) => e.name.toLowerCase().includes("enamed"))

  function examCountdown(exam: Exam | undefined): string {
    if (!exam) return "sem data"
    if (exam.estimated && !exam.exam_date) return "sem data"
    const days = differenceInDays(new Date(exam.exam_date), today!)
    if (days <= 0) return "hoje"
    return `${days} dias`
  }

  return (
    <div className="min-h-screen bg-[var(--color-mr1-bg)] px-4 pt-6 pb-8 space-y-6">
      {/* ─── 1. Date + Title ─── */}
      <div>
        <p className="text-sm text-[var(--color-mr1-text2)] capitalize">{todayLabel}</p>
        <h1 className="font-display text-4xl text-[var(--color-mr1-text)] mt-1">Hoje</h1>
      </div>

      {/* ─── 2. Donut progress card ─── */}
      <Card className="border-0 shadow-sm bg-white rounded-2xl">
        <CardContent className="p-5">
          {/* Top row: donut + stats */}
          <div className="flex items-center gap-5">
            <DonutChart
              value={progressPct}
              size={96}
              strokeWidth={8}
              color="var(--color-mr1-orange)"
              bgColor="var(--color-mr1-lines)"
              label={`${doneQuestions}`}
              sublabel={`de ${totalQuestions}`}
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--color-mr1-text2)]">
                  Progresso do dia
                </span>
                <Info className="h-3.5 w-3.5 text-[var(--color-mr1-text2)] opacity-60" />
              </div>
              <p className="text-sm font-semibold text-[var(--color-mr1-text)]">
                {doneQuestions} de {totalQuestions} questoes
              </p>
              {remainingQuestions > 0 && (
                <p className="text-sm font-medium text-[var(--color-mr1-action)]">
                  Faltam {remainingQuestions}
                </p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--color-mr1-lines)] mt-4 pt-4 space-y-2.5">
            {/* Fixation line */}
            <div className="flex items-center gap-2.5">
              <AgendaBadge type="fixation" className="text-[10px] px-1 py-0 min-w-[20px]" />
              <span className="text-sm text-[var(--color-mr1-text)]">
                {fixationDone} de {fixationTotal} em fixacao
              </span>
            </div>
            {/* Review line */}
            <div className="flex items-center gap-2.5">
              <AgendaBadge type="review" className="text-[10px] px-1 py-0 min-w-[20px]" />
              <span className="text-sm text-[var(--color-mr1-text)]">
                {reviewDone} de {reviewTotal} em revisao
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── 3. "Para hoje" section ─── */}
      <h2 className="text-sm font-semibold text-[var(--color-mr1-text)] tracking-wide uppercase">
        Para hoje
      </h2>

      {/* ─── 4. Item list ─── */}
      <div className="space-y-2">
        {todayItems.length === 0 ? (
          <p className="text-sm text-[var(--color-mr1-text2)] text-center py-6">
            Nenhum item para hoje
          </p>
        ) : (
          todayItems.map((item) => {
            const isDone = item.status === "done"
            const link = getItemLink(item)
            const description = getItemDescription(item)

            const row = (
              <div
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-2xl bg-white transition-colors",
                  isDone && "opacity-60",
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={
                    isDone
                      ? undefined
                      : async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          await completeAgendaItem(
                            item.id,
                            item.planned_questions ?? 0,
                            item.planned_questions ?? 0,
                          )
                          setTodayItems((prev) =>
                            prev.map((i) =>
                              i.id === item.id
                                ? {
                                    ...i,
                                    status: "done" as const,
                                    done_date: format(today, "yyyy-MM-dd"),
                                    done_questions: item.planned_questions ?? 0,
                                  }
                                : i,
                            ),
                          )
                          setQuestionsToday((prev) => prev + (item.planned_questions ?? 0))
                        }
                  }
                  disabled={isDone}
                  className="flex-shrink-0 touch-target flex items-center justify-center cursor-pointer active:bg-[#F1E4E9] rounded-full"
                >
                  {isDone ? (
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--color-mr1-action)] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[var(--color-mr1-action)]" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-[var(--color-mr1-lines)]" />
                  )}
                </button>

                {/* Badge */}
                <AgendaBadge type={item.type} reviewNumber={item.review_number} />

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-semibold truncate",
                      isDone
                        ? "line-through text-[var(--color-mr1-text2)]"
                        : "text-[var(--color-mr1-text)]",
                    )}
                  >
                    {item.subject?.grade_lesson?.name ?? "Simulado"}
                  </p>
                  {description && (
                    <p className="text-xs text-[var(--color-mr1-text2)] mt-0.5">{description}</p>
                  )}
                </div>

                {/* Chevron */}
                <ChevronRight className="w-4 h-4 text-[var(--color-mr1-text2)] flex-shrink-0" />
              </div>
            )

            if (link) {
              return (
                <Link key={item.id} href={link} className="block list-row-interactive rounded-2xl">
                  {row}
                </Link>
              )
            }

            return <div key={item.id}>{row}</div>
          })
        )}
      </div>

      {/* ─── 5. Recuperacao card ─── */}
      {overdueItems.length > 0 && (
        <Link href="/recuperacao" className="block list-row-interactive rounded-2xl">
          <Card className="border-0 shadow-sm bg-[#FFF6D6] rounded-2xl">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFE9A0] flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-[#B8860B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-mr1-text)]">Recuperacao</p>
                <p className="text-xs text-[var(--color-mr1-text2)]">
                  {overdueItems.length} {overdueItems.length === 1 ? "item atrasado" : "itens atrasados"}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--color-mr1-text2)] flex-shrink-0" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* ─── 6. Exam countdown ─── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-xs font-medium text-[var(--color-mr1-text2)] uppercase tracking-wider">
            SES-PE
          </p>
          <p className="font-display text-2xl text-[var(--color-mr1-text)] mt-1">
            {examCountdown(sesExam)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-[var(--color-mr1-text2)] uppercase tracking-wider">
            ENAMED
          </p>
          <p className="font-display text-2xl text-[var(--color-mr1-text)] mt-1">
            {examCountdown(enamedExam)}
          </p>
        </div>
      </div>
    </div>
  )
}
