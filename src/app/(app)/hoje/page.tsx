"use client"

import { useEffect, useState } from "react"
import { format, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, Clock, AlertTriangle, BookOpen } from "lucide-react"
import { DonutChart } from "@/components/mr1/donut-chart"
import { AgendaBadge, AgendaTypeName } from "@/components/mr1/agenda-badge"
import type { AgendaItem, Exam, User } from "@/lib/types"
import { getAgendaForDate, getOverdueItems, getTodayQuestionCount, completeAgendaItem, markOverdueItems } from "@/lib/db/agenda"
import { getExams } from "@/lib/db/exams"
import { getUser } from "@/lib/db/users"
import { getDailyLimit } from "@/lib/engine/load-balancer"
import { cn } from "@/lib/utils"
import Link from "next/link"

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
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  const dailyLimit = getDailyLimit(user?.created_at ?? format(today, "yyyy-MM-dd"), user?.daily_limit_initial ?? 30)
  const progressPct = dailyLimit > 0 ? Math.min(100, Math.round((questionsToday / dailyLimit) * 100)) : 0
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR })

  const doneCount = todayItems.filter(i => i.status === "done").length
  const totalCount = todayItems.length

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">
            Oi, {user?.display_name ?? "Estudante"}
          </h1>
          <p className="text-sm text-[var(--color-mr1-text2)] capitalize mt-0.5">{todayLabel}</p>
        </div>
      </div>

      {/* Donut + daily progress */}
      <div className="flex items-center gap-5">
        <DonutChart
          value={progressPct}
          size={100}
          strokeWidth={8}
          color="var(--color-mr1-orange)"
          label={`${questionsToday}`}
          sublabel={`de ${dailyLimit}`}
        />
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-[var(--color-mr1-text)]">
            {doneCount} de {totalCount} itens feitos
          </p>
          {exams.map(exam => {
            const days = differenceInDays(new Date(exam.exam_date), today)
            if (days <= 0) return null
            return (
              <div key={exam.id} className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-mr1-text2)]">{exam.name}</span>
                <Badge variant="outline" className="text-xs font-semibold border-[var(--color-mr1-lines)]">
                  {days} dias
                </Badge>
              </div>
            )
          })}
        </div>
      </div>

      {/* Today's items */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)] flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--color-mr1-action)]" />
            Para hoje
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {todayItems.length === 0 ? (
            <p className="text-sm text-[var(--color-mr1-text2)] text-center py-4">
              Nenhum item para hoje
            </p>
          ) : (
            todayItems.map(item => (
              <AgendaItemRow key={item.id} item={item} onComplete={async () => {
                // Simple mark as done with planned questions
                await completeAgendaItem(item.id, item.planned_questions ?? 0, item.planned_questions ?? 0)
                setTodayItems(prev => prev.map(i =>
                  i.id === item.id ? { ...i, status: 'done' as const, done_date: format(today, 'yyyy-MM-dd') } : i
                ))
                setQuestionsToday(prev => prev + (item.planned_questions ?? 0))
              }} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Overdue / Recovery */}
      {overdueItems.length > 0 && (
        <Card className="border-0 shadow-sm bg-[var(--color-mr1-butter)]">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)] flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--color-mr1-orange)]" />
              Recuperação ({overdueItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {overdueItems.slice(0, 5).map(item => {
              const daysLate = differenceInDays(today, new Date(item.planned_date))
              return (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white">
                  <div className="flex items-center gap-3">
                    <AgendaBadge type={item.type} reviewNumber={item.review_number} />
                    <div>
                      <span className="text-sm font-medium text-[var(--color-mr1-text)]">
                        {item.subject?.grade_lesson?.name ?? "Simulado"}
                      </span>
                      <p className="text-[10px] text-[var(--color-mr1-text2)]">
                        atrasado há {daysLate} {daysLate === 1 ? "dia" : "dias"}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            {overdueItems.length > 5 && (
              <p className="text-xs text-[var(--color-mr1-text2)] text-center">
                +{overdueItems.length - 5} itens
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick add CTA */}
      <Link href="/adicionar" className="block">
        <Card className="border-0 shadow-sm bg-[var(--color-mr1-orange-bg)] hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 text-[var(--color-mr1-orange)] font-semibold text-sm">
              <BookOpen className="h-5 w-5" />
              Registrar estudo
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}

function AgendaItemRow({ item, onComplete }: { item: AgendaItem; onComplete: () => void }) {
  const isDone = item.status === "done"
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-xl transition-colors",
      isDone ? "bg-[var(--color-mr1-lines)]/50" : "bg-[var(--color-mr1-bg)]"
    )}>
      <div className="flex items-center gap-3">
        <button onClick={onComplete} disabled={isDone} className="touch-target flex items-center justify-center">
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-[var(--color-mr1-action)]" />
          ) : (
            <Circle className="h-5 w-5 text-[var(--color-mr1-text2)]" />
          )}
        </button>
        <AgendaBadge type={item.type} reviewNumber={item.review_number} />
        <div>
          <span className={cn(
            "text-sm font-medium",
            isDone ? "line-through text-[var(--color-mr1-text2)]" : "text-[var(--color-mr1-text)]"
          )}>
            {item.subject?.grade_lesson?.name ?? "Simulado"}
          </span>
          {item.planned_questions && (
            <p className="text-[10px] text-[var(--color-mr1-text2)]">{item.planned_questions} questões</p>
          )}
        </div>
      </div>
    </div>
  )
}
