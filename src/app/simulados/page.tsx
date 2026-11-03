"use client"

import { useEffect, useState } from "react"
import { format, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CheckCircle2, Clock, Target, TrendingUp } from "lucide-react"
import type { MockExam, TargetExam } from "@/lib/types"
import { getMockExams, getTargetExams } from "@/lib/queries"
import { analyzeSimuladoTrend, getSimuladoFrequency } from "@/lib/simulados"
import { cn } from "@/lib/utils"
import { differenceInMonths } from "date-fns"

export default function SimuladosPage() {
  const [mocks, setMocks] = useState<MockExam[]>([])
  const [exams, setExams] = useState<TargetExam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [m, e] = await Promise.all([getMockExams(), getTargetExams()])
        setMocks(m)
        setExams(e)
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

  const [today] = useState(() => new Date())
  const upcoming = mocks.filter(m => m.status === "scheduled" && new Date(m.scheduled_date) >= today)
  const completed = mocks.filter(m => m.status === "done")
  const trend = analyzeSimuladoTrend(completed)

  const primaryExam = exams.find(e => e.priority === "primary")
  const monthsUntilExam = primaryExam
    ? differenceInMonths(new Date(primaryExam.exam_date), today)
    : 0

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Simulados</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">{completed.length}</p>
            <p className="text-[10px] text-slate-500">Realizados</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{trend.averageAccuracy}%</p>
            <p className="text-[10px] text-slate-500">Média</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className={cn(
              "text-2xl font-bold",
              trend.trend === "improving" ? "text-emerald-600" :
              trend.trend === "declining" ? "text-red-600" : "text-slate-400"
            )}>
              {trend.trend === "improving" ? "↑" : trend.trend === "declining" ? "↓" : "—"}
            </p>
            <p className="text-[10px] text-slate-500">Tendência</p>
          </CardContent>
        </Card>
      </div>

      {/* Frequency recommendation */}
      {primaryExam && (
        <Card className="border-0 shadow-sm bg-violet-50">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-violet-600 font-medium">
              Frequência recomendada: {getSimuladoFrequency(monthsUntilExam)}
            </p>
            <p className="text-[10px] text-violet-400 mt-0.5">
              {differenceInDays(new Date(primaryExam.exam_date), today)} dias até {primaryExam.name}
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList className="w-full">
          <TabsTrigger value="upcoming" className="flex-1 text-xs">Próximos</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 text-xs">Realizados</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-2 mt-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Nenhum simulado agendado
            </p>
          ) : (
            upcoming.map((mock) => (
              <Card key={mock.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {format(new Date(mock.scheduled_date), "d 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-xs text-slate-500">
                          {mock.source ?? mock.exam_type}
                          {mock.total_questions && ` · ${mock.total_questions}q`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {mock.exam_type === "past_exam" ? "Prova anterior" :
                       mock.exam_type === "thematic" ? "Temático" : "Geral"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-2 mt-3">
          {completed.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              Nenhum simulado realizado ainda
            </p>
          ) : (
            completed
              .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
              .map((mock) => {
                const acc = mock.total_questions && mock.correct_questions
                  ? Math.round((mock.correct_questions / mock.total_questions) * 100)
                  : null
                return (
                  <Card key={mock.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">
                            {format(new Date(mock.scheduled_date), "d 'de' MMMM", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {mock.source ?? mock.exam_type}
                            {mock.total_questions && ` · ${mock.correct_questions}/${mock.total_questions}`}
                            {mock.duration_minutes && ` · ${mock.duration_minutes}min`}
                          </p>
                        </div>
                        {acc !== null && (
                          <span className={cn(
                            "text-lg font-bold",
                            acc >= 70 ? "text-emerald-600" :
                            acc >= 50 ? "text-amber-600" : "text-red-600"
                          )}>
                            {acc}%
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
