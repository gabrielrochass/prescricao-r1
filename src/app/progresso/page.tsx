"use client"

import { useEffect, useState } from "react"
import { format, subDays, startOfWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp, TrendingDown, Minus, Target, Flame } from "lucide-react"
import type { SubjectMastery, WeeklyTarget, ProgressionConfig, StudyEntry, Phase } from "@/lib/types"
import {
  getSubjectMasteries, getWeeklyTargets, getProgressionConfig,
  getStudyEntries, getTargetExams,
} from "@/lib/queries"
import { getPhaseName } from "@/lib/progression"
import { cn } from "@/lib/utils"
import type { TargetExam } from "@/lib/types"
import { differenceInDays } from "date-fns"

const trendIcons = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
}

const trendColors = {
  improving: "text-emerald-500",
  stable: "text-slate-400",
  declining: "text-red-500",
}

export default function ProgressoPage() {
  const [masteries, setMasteries] = useState<SubjectMastery[]>([])
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>([])
  const [config, setConfig] = useState<ProgressionConfig | null>(null)
  const [exams, setExams] = useState<TargetExam[]>([])
  const [recentEntries, setRecentEntries] = useState<StudyEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [m, wt, c, ex, entries] = await Promise.all([
          getSubjectMasteries(),
          getWeeklyTargets(),
          getProgressionConfig(),
          getTargetExams(),
          getStudyEntries(),
        ])
        setMasteries(m)
        setWeeklyTargets(wt)
        setConfig(c)
        setExams(ex)
        setRecentEntries(entries.slice(0, 30))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    )
  }

  // Overall stats
  const totalQuestions = masteries.reduce((s, m) => s + m.total_questions, 0)
  const totalCorrect = masteries.reduce((s, m) => s + m.total_correct, 0)
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  // Streak (consecutive days with entries)
  let streak = 0
  const [today] = useState(() => new Date())
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(today, i), "yyyy-MM-dd")
    if (recentEntries.some(e => e.date === d)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  // Days until exams
  const upcomingExams = exams
    .filter(e => e.status !== "done")
    .map(e => ({ ...e, daysUntil: differenceInDays(new Date(e.exam_date), today) }))
    .filter(e => e.daysUntil > 0)

  // Weak subjects (accuracy < 65%)
  const weakSubjects = masteries
    .filter(m => m.total_questions >= 5 && m.current_accuracy < 65)
    .sort((a, b) => a.current_accuracy - b.current_accuracy)

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Progresso</h1>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{overallAccuracy}%</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Accuracy geral</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalQuestions}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Questões total</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-500 flex items-center justify-center gap-1">
              <Flame className="h-5 w-5" /> {streak}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Dias seguidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Exam Countdown */}
      {upcomingExams.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{exam.name}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(exam.exam_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {exam.daysUntil} dias
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="subjects">
        <TabsList className="w-full">
          <TabsTrigger value="subjects" className="flex-1 text-xs">Por Tema</TabsTrigger>
          <TabsTrigger value="weekly" className="flex-1 text-xs">Semanal</TabsTrigger>
          <TabsTrigger value="progression" className="flex-1 text-xs">Progressão</TabsTrigger>
        </TabsList>

        {/* Per Subject */}
        <TabsContent value="subjects" className="space-y-2 mt-3">
          {masteries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Registre estudos para ver seu progresso por tema
            </p>
          ) : (
            masteries
              .filter(m => m.total_questions > 0)
              .sort((a, b) => b.total_questions - a.total_questions)
              .map((m) => {
                const TrendIcon = trendIcons[m.trend]
                return (
                  <Card key={m.id} className="border-0 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: m.subject?.color ?? "#6366f1" }}
                          />
                          <span className="text-sm font-medium">{m.subject?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendIcon className={cn("h-3.5 w-3.5", trendColors[m.trend])} />
                          <span className={cn(
                            "text-sm font-bold",
                            m.current_accuracy >= 70 ? "text-emerald-600" :
                            m.current_accuracy >= 50 ? "text-amber-600" : "text-red-600"
                          )}>
                            {m.current_accuracy.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <Progress
                        value={m.current_accuracy}
                        className="h-1.5"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        {m.total_correct}/{m.total_questions} questões · Revisão: {
                          m.next_review_date
                            ? format(new Date(m.next_review_date), "dd/MM")
                            : "—"
                        }
                      </p>
                    </CardContent>
                  </Card>
                )
              })
          )}
        </TabsContent>

        {/* Weekly */}
        <TabsContent value="weekly" className="space-y-2 mt-3">
          {weeklyTargets.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Metas semanais aparecerão conforme você progredir
            </p>
          ) : (
            weeklyTargets
              .slice(-8)
              .reverse()
              .map((wt) => {
                const pct = Math.round((wt.actual_questions / Math.max(wt.target_questions, 1)) * 100)
                return (
                  <Card key={wt.id} className="border-0 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-sm font-medium">Semana {wt.week_number}</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {getPhaseName(wt.phase as Phase)}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-500">
                          {wt.actual_questions}/{wt.target_questions}q
                        </span>
                      </div>
                      <Progress value={Math.min(pct, 100)} className="h-1.5" />
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-slate-400">{pct}% concluído</span>
                        {wt.actual_accuracy != null && (
                          <span className="text-[10px] text-slate-400">
                            Acc: {wt.actual_accuracy.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      {wt.adjusted && wt.adjustment_reason && (
                        <p className="text-[10px] text-amber-600 mt-1">⚠️ {wt.adjustment_reason}</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })
          )}
        </TabsContent>

        {/* Progression Plan */}
        <TabsContent value="progression" className="space-y-3 mt-3">
          {config ? (
            <>
              <Card className="border-0 shadow-sm bg-indigo-50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Início</p>
                      <p className="text-sm font-bold">{config.initial_daily_questions}q/dia</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Meta final</p>
                      <p className="text-sm font-bold">{config.target_daily_questions}q/dia</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Incremento/sem</p>
                      <p className="text-sm font-bold">{config.weekly_increment_pct}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Accuracy mín</p>
                      <p className="text-sm font-bold">{config.min_accuracy_to_progress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {weakSubjects.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-sm font-semibold text-red-600 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Temas Críticos (accuracy &lt;65%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {weakSubjects.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50">
                        <span className="text-sm">{m.subject?.name}</span>
                        <span className="text-sm font-bold text-red-600">
                          {m.current_accuracy.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">
              Configure a progressão em Config
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
