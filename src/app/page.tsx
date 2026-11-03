"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen, Target, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronRight, Calendar
} from "lucide-react"
import Link from "next/link"
import type { ReviewQueueItem, DailyPlan, WeeklyTarget, MockExam, UserSettings } from "@/lib/types"
import type { Phase } from "@/lib/types"
import {
  getPendingReviews, getDailyPlan, getCurrentWeeklyTarget,
  getTodayQuestionCount, getUserSettings, getUpcomingMockExam,
} from "@/lib/queries"
import { getPhaseName } from "@/lib/progression"
import { cn } from "@/lib/utils"

export default function HomePage() {
  const [reviews, setReviews] = useState<ReviewQueueItem[]>([])
  const [dailyPlan, setDailyPlan] = useState<DailyPlan[]>([])
  const [weeklyTarget, setWeeklyTarget] = useState<WeeklyTarget | null>(null)
  const [questionsToday, setQuestionsToday] = useState(0)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [nextMock, setNextMock] = useState<MockExam | null>(null)
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState("")
  const [todayLabel, setTodayLabel] = useState("")

  useEffect(() => {
    const now = new Date()
    const t = format(now, "yyyy-MM-dd")
    setToday(t)
    setTodayLabel(format(now, "EEEE, d 'de' MMMM", { locale: ptBR }))

    async function load() {
      try {
        const [rev, plan, wt, qt, st, nm] = await Promise.all([
          getPendingReviews(t),
          getDailyPlan(t),
          getCurrentWeeklyTarget(),
          getTodayQuestionCount(),
          getUserSettings(),
          getUpcomingMockExam(),
        ])
        setReviews(rev)
        setDailyPlan(plan)
        setWeeklyTarget(wt)
        setQuestionsToday(qt)
        setSettings(st)
        setNextMock(nm)
      } catch (e) {
        console.error("Error loading data:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [today])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-slate-400 dark:text-slate-500">Carregando...</div>
      </div>
    )
  }

  const weeklyProgress = weeklyTarget
    ? Math.round((weeklyTarget.actual_questions / Math.max(weeklyTarget.target_questions, 1)) * 100)
    : 0

  const dailyTarget = weeklyTarget
    ? Math.round(weeklyTarget.target_questions / 6)
    : 15

  const dailyProgress = Math.round((questionsToday / Math.max(dailyTarget, 1)) * 100)

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Oi, {settings?.user_name ?? "Estudante"}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 capitalize mt-0.5">{todayLabel}</p>
      </div>

      {/* Daily Progress */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 opacity-80" />
              <span className="text-sm font-medium opacity-90">Meta de hoje</span>
            </div>
            {weeklyTarget && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                {getPhaseName(weeklyTarget.phase as Phase)}
              </Badge>
            )}
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-bold">{questionsToday}</span>
            <span className="text-lg opacity-70 mb-0.5">/ {dailyTarget} questões</span>
          </div>
          <Progress value={Math.min(dailyProgress, 100)} className="h-2 bg-white/20" />
          <div className="flex justify-between mt-2 text-xs opacity-70">
            <span>{dailyProgress}% concluído</span>
            <span>Semana: {weeklyTarget?.actual_questions ?? 0}/{weeklyTarget?.target_questions ?? 0}</span>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Due */}
      {reviews.length > 0 && (
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-slate-100">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Revisar Hoje ({reviews.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {reviews.slice(0, 5).map((review) => (
              <div
                key={review.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: review.subject?.color ?? "#6366f1" }}
                  />
                  <span className="text-sm font-medium dark:text-slate-200">{review.subject?.name}</span>
                </div>
                {review.last_accuracy != null && (
                  <Badge
                    variant={review.last_accuracy >= 70 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {review.last_accuracy.toFixed(0)}%
                  </Badge>
                )}
              </div>
            ))}
            {reviews.length > 5 && (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                +{reviews.length - 5} mais
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Study Plan for Today */}
      {dailyPlan.length > 0 && (
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2 dark:text-slate-100">
              <BookOpen className="h-4 w-4 text-indigo-500" />
              Estudar Hoje
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {dailyPlan.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: plan.subject?.color ?? "#6366f1" }}
                  />
                  <div>
                    <span className="text-sm font-medium dark:text-slate-200">{plan.subject?.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
                      {plan.plan_type === "review" ? "revisão" : plan.plan_type}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{plan.question_count}q</span>
                  {plan.completed && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Simulado */}
      {nextMock && (
        <Link href="/simulados">
          <Card className="border-0 shadow-sm dark:bg-slate-900 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold dark:text-slate-100">Próximo Simulado</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(nextMock.scheduled_date), "d 'de' MMMM", { locale: ptBR })}
                      {nextMock.source && ` · ${nextMock.source}`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Quick Register CTA */}
      <Link href="/registrar" className="block">
        <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
              <TrendingUp className="h-5 w-5" />
              Registrar Estudo
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  )
}
