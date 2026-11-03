"use client"

import { useEffect, useState, useMemo } from "react"
import { format, subDays, eachDayOfInterval } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Minus, Target, Flame, AlertTriangle } from "lucide-react"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts"
import type { SubjectMastery, WeeklyTarget, ProgressionConfig, StudyEntry, Phase } from "@/lib/types"
import type { TargetExam } from "@/lib/types"
import {
  getSubjectMasteries, getWeeklyTargets, getProgressionConfig,
  getStudyEntries, getTargetExams,
} from "@/lib/queries"
import { getPhaseName } from "@/lib/progression"
import { cn } from "@/lib/utils"
import { differenceInDays } from "date-fns"

const trendIcons = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
}

const trendColors = {
  improving: "text-emerald-500 dark:text-emerald-400",
  stable: "text-slate-400 dark:text-slate-500",
  declining: "text-red-500 dark:text-red-400",
}

export default function ProgressoPage() {
  const [masteries, setMasteries] = useState<SubjectMastery[]>([])
  const [weeklyTargets, setWeeklyTargets] = useState<WeeklyTarget[]>([])
  const [config, setConfig] = useState<ProgressionConfig | null>(null)
  const [exams, setExams] = useState<TargetExam[]>([])
  const [recentEntries, setRecentEntries] = useState<StudyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState<Date | null>(null)

  useEffect(() => {
    setToday(new Date())
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
        setRecentEntries(entries)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Computed data for charts
  const chartData = useMemo(() => {
    if (!today) return { dailyQuestions: [], accuracyTrend: [], heatmap: [], subjectBars: [] }

    // Last 14 days — questions per day
    const last14 = eachDayOfInterval({ start: subDays(today, 13), end: today })
    const dailyQuestions = last14.map(d => {
      const dateStr = format(d, "yyyy-MM-dd")
      const dayEntries = recentEntries.filter(e => e.date === dateStr && e.study_type === "questions")
      const total = dayEntries.reduce((s, e) => s + (e.total_questions ?? 0), 0)
      const correct = dayEntries.reduce((s, e) => s + (e.correct_questions ?? 0), 0)
      return {
        date: format(d, "dd/MM"),
        questoes: total,
        acertos: correct,
      }
    })

    // Accuracy trend — last 14 days with data
    const accuracyTrend = last14
      .map(d => {
        const dateStr = format(d, "yyyy-MM-dd")
        const dayEntries = recentEntries.filter(e => e.date === dateStr && e.study_type === "questions")
        const total = dayEntries.reduce((s, e) => s + (e.total_questions ?? 0), 0)
        const correct = dayEntries.reduce((s, e) => s + (e.correct_questions ?? 0), 0)
        if (total === 0) return null
        return {
          date: format(d, "dd/MM"),
          accuracy: Math.round((correct / total) * 100),
        }
      })
      .filter(Boolean)

    // Heatmap — last 30 days
    const last30 = eachDayOfInterval({ start: subDays(today, 29), end: today })
    const heatmap = last30.map(d => {
      const dateStr = format(d, "yyyy-MM-dd")
      const hasEntry = recentEntries.some(e => e.date === dateStr)
      const total = recentEntries
        .filter(e => e.date === dateStr && e.study_type === "questions")
        .reduce((s, e) => s + (e.total_questions ?? 0), 0)
      return { date: d, dateStr, studied: hasEntry, questions: total }
    })

    // Subject accuracy bars
    const subjectBars = masteries
      .filter(m => m.total_questions > 0)
      .sort((a, b) => b.current_accuracy - a.current_accuracy)
      .slice(0, 8)
      .map(m => ({
        name: m.subject?.name?.slice(0, 12) ?? "?",
        accuracy: Math.round(m.current_accuracy),
        color: m.subject?.color ?? "#6366f1",
      }))

    return { dailyQuestions, accuracyTrend, heatmap, subjectBars }
  }, [today, recentEntries, masteries])

  if (loading || !today) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-slate-400 dark:text-slate-500">Carregando...</div>
      </div>
    )
  }

  const totalQuestions = masteries.reduce((s, m) => s + m.total_questions, 0)
  const totalCorrect = masteries.reduce((s, m) => s + m.total_correct, 0)
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0

  let streak = 0
  for (let i = 0; i < 365; i++) {
    const d = format(subDays(today, i), "yyyy-MM-dd")
    if (recentEntries.some(e => e.date === d)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  const upcomingExams = exams
    .filter(e => e.status !== "done")
    .map(e => ({ ...e, daysUntil: differenceInDays(new Date(e.exam_date), today) }))
    .filter(e => e.daysUntil > 0)

  const weakSubjects = masteries
    .filter(m => m.total_questions >= 5 && m.current_accuracy < 65)
    .sort((a, b) => a.current_accuracy - b.current_accuracy)

  return (
    <div className="px-4 pt-6 space-y-4 pb-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Progresso</h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{overallAccuracy}%</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Accuracy</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalQuestions}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Questões</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 flex items-center justify-center gap-1">
              <Flame className="h-5 w-5" /> {streak}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Exam Countdown */}
      {upcomingExams.length > 0 && (
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardContent className="p-4 space-y-3">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{exam.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
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

      {/* Activity Heatmap — last 30 days */}
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">Atividade (30 dias)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-10 gap-1">
            {chartData.heatmap.map((day) => (
              <div
                key={day.dateStr}
                title={`${format(day.date, "dd/MM")} — ${day.questions}q`}
                className={cn(
                  "aspect-square rounded-sm transition-colors",
                  !day.studied && "bg-slate-100 dark:bg-slate-800",
                  day.studied && day.questions === 0 && "bg-indigo-200 dark:bg-indigo-900",
                  day.questions > 0 && day.questions < 20 && "bg-indigo-300 dark:bg-indigo-700",
                  day.questions >= 20 && day.questions < 50 && "bg-indigo-400 dark:bg-indigo-600",
                  day.questions >= 50 && "bg-indigo-600 dark:bg-indigo-400",
                )}
              />
            ))}
          </div>
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-[9px] text-slate-400 dark:text-slate-500">Menos</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800" />
            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200 dark:bg-indigo-900" />
            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400 dark:bg-indigo-600" />
            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-600 dark:bg-indigo-400" />
            <span className="text-[9px] text-slate-400 dark:text-slate-500">Mais</span>
          </div>
        </CardContent>
      </Card>

      {/* Questions per day — bar chart */}
      <Card className="border-0 shadow-sm dark:bg-slate-900">
        <CardHeader className="pb-1 px-4 pt-4">
          <CardTitle className="text-sm font-semibold">Questões / dia (14d)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData.dailyQuestions} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
              <YAxis tick={{ fontSize: 9 }} width={28} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
                formatter={(value, name) => [String(value), name === "questoes" ? "Feitas" : "Acertos"]}
              />
              <Bar dataKey="questoes" fill="#6366f1" radius={[3, 3, 0, 0]} name="questoes" />
              <Bar dataKey="acertos" fill="#10b981" radius={[3, 3, 0, 0]} name="acertos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Accuracy trend — line chart */}
      {chartData.accuracyTrend.length > 1 && (
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader className="pb-1 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Accuracy ao longo do tempo</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData.accuracyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-700" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={28} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} formatter={(v) => [`${v}%`, "Accuracy"]} />
                <Line type="monotone" dataKey="accuracy" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
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
          {/* Subject accuracy chart */}
          {chartData.subjectBars.length > 0 && (
            <Card className="border-0 shadow-sm dark:bg-slate-900 mb-3">
              <CardContent className="px-2 py-3">
                <ResponsiveContainer width="100%" height={chartData.subjectBars.length * 32 + 16}>
                  <BarChart data={chartData.subjectBars} layout="vertical" barSize={16}>
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }} formatter={(v) => [`${v}%`, "Accuracy"]} />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {masteries.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
              Registre estudos para ver seu progresso por tema
            </p>
          ) : (
            masteries
              .filter(m => m.total_questions > 0)
              .sort((a, b) => b.total_questions - a.total_questions)
              .map((m) => {
                const TrendIcon = trendIcons[m.trend]
                return (
                  <Card key={m.id} className="border-0 shadow-sm dark:bg-slate-900">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.subject?.color ?? "#6366f1" }} />
                          <span className="text-sm font-medium">{m.subject?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendIcon className={cn("h-3.5 w-3.5", trendColors[m.trend])} />
                          <span className={cn(
                            "text-sm font-bold",
                            m.current_accuracy >= 70 ? "text-emerald-600 dark:text-emerald-400" :
                            m.current_accuracy >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {m.current_accuracy.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <Progress value={m.current_accuracy} className="h-1.5" />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {m.total_correct}/{m.total_questions} questões · Revisão: {
                          m.next_review_date ? format(new Date(m.next_review_date), "dd/MM") : "—"
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
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
              Metas semanais aparecerão conforme você progredir
            </p>
          ) : (
            weeklyTargets.slice(-8).reverse().map((wt) => {
              const pct = Math.round((wt.actual_questions / Math.max(wt.target_questions, 1)) * 100)
              return (
                <Card key={wt.id} className="border-0 shadow-sm dark:bg-slate-900">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="text-sm font-medium">Semana {wt.week_number}</span>
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {getPhaseName(wt.phase as Phase)}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {wt.actual_questions}/{wt.target_questions}q
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} className="h-1.5" />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{pct}%</span>
                      {wt.actual_accuracy != null && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Acc: {wt.actual_accuracy.toFixed(0)}%
                        </span>
                      )}
                    </div>
                    {wt.adjusted && wt.adjustment_reason && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <p className="text-[10px] text-amber-600 dark:text-amber-400">{wt.adjustment_reason}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Progression */}
        <TabsContent value="progression" className="space-y-3 mt-3">
          {config ? (
            <>
              <Card className="border-0 shadow-sm bg-indigo-50 dark:bg-indigo-950">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Início</p>
                      <p className="text-sm font-bold">{config.initial_daily_questions}q/dia</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Meta final</p>
                      <p className="text-sm font-bold">{config.target_daily_questions}q/dia</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Incremento/sem</p>
                      <p className="text-sm font-bold">{config.weekly_increment_pct}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Accuracy min</p>
                      <p className="text-sm font-bold">{config.min_accuracy_to_progress}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {weakSubjects.length > 0 && (
                <Card className="border-0 shadow-sm dark:bg-slate-900">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <CardTitle className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Temas Criticos (&lt;65%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {weakSubjects.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950">
                        <span className="text-sm">{m.subject?.name}</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">
                          {m.current_accuracy.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
              Configure progressão em Config
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
