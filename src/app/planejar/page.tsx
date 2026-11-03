"use client"

import { useEffect, useState, useCallback } from "react"
import { format, startOfWeek, addWeeks, isSameWeek } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  CalendarDays, Plus, Trash2, ChevronLeft, ChevronRight,
  CheckCircle2, Circle, Clock, Target, BookOpen
} from "lucide-react"
import type { Subject, WeeklyPlan, WeeklyPlanTopic } from "@/lib/types"
import {
  getSubjectsTree, getWeeklyPlans, createWeeklyPlan,
  addWeeklyPlanTopic, updateWeeklyPlanTopic, deleteWeeklyPlanTopic,
} from "@/lib/queries"
import { cn } from "@/lib/utils"

const statusConfig = {
  pending: { label: "Pendente", icon: Circle, color: "text-slate-400" },
  in_progress: { label: "Em andamento", icon: Clock, color: "text-amber-500" },
  done: { label: "Concluído", icon: CheckCircle2, color: "text-emerald-500" },
}

export default function PlanejarPage() {
  const [plans, setPlans] = useState<WeeklyPlan[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  // Current viewed week
  const [viewDate, setViewDate] = useState<Date | null>(null)

  useEffect(() => {
    if (!viewDate) setViewDate(new Date())
  }, [viewDate])

  // Add topic form
  const [showAddTopic, setShowAddTopic] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState("")
  const [expandedParent, setExpandedParent] = useState("")
  const [topicGoal, setTopicGoal] = useState("")
  const [topicQuestions, setTopicQuestions] = useState("")

  // New week label
  const [weekLabel, setWeekLabel] = useState("")
  const [weekNotes, setWeekNotes] = useState("")

  if (!viewDate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    )
  }

  const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 })
  const weekLabel_ = `${format(weekStart, "d 'de' MMM", { locale: ptBR })} — ${format(addWeeks(weekStart, 1), "d 'de' MMM", { locale: ptBR })}`

  const currentPlan = plans.find(p =>
    isSameWeek(new Date(p.week_start_date), weekStart, { weekStartsOn: 1 })
  )

  const isCurrentWeek = isSameWeek(new Date(), weekStart, { weekStartsOn: 1 })
  const isFutureWeek = weekStart > new Date()

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getWeeklyPlans(), getSubjectsTree()])
      setPlans(p)
      setSubjects(s)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreatePlan() {
    try {
      const plan = await createWeeklyPlan({
        week_start_date: format(weekStart, "yyyy-MM-dd"),
        week_label: weekLabel || undefined,
        notes: weekNotes || undefined,
      })
      setPlans(prev => [{ ...plan, topics: [] }, ...prev])
      setWeekLabel("")
      setWeekNotes("")
    } catch (e) {
      console.error(e)
    }
  }

  async function handleAddTopic() {
    if (!currentPlan || !selectedSubject) return
    try {
      const topic = await addWeeklyPlanTopic({
        weekly_plan_id: currentPlan.id,
        subject_id: selectedSubject,
        goal: topicGoal || undefined,
        question_target: topicQuestions ? parseInt(topicQuestions) : undefined,
        order_index: (currentPlan.topics?.length ?? 0),
      })

      setPlans(prev => prev.map(p =>
        p.id === currentPlan.id
          ? { ...p, topics: [...(p.topics ?? []), topic] }
          : p
      ))

      setSelectedSubject("")
      setTopicGoal("")
      setTopicQuestions("")
      setShowAddTopic(false)
    } catch (e) {
      console.error(e)
    }
  }

  async function handleToggleStatus(topic: WeeklyPlanTopic) {
    const next = topic.status === "pending" ? "in_progress"
      : topic.status === "in_progress" ? "done" : "pending"

    try {
      await updateWeeklyPlanTopic(topic.id, { status: next })
      setPlans(prev => prev.map(p => ({
        ...p,
        topics: p.topics?.map(t =>
          t.id === topic.id ? { ...t, status: next } : t
        ),
      })))
    } catch (e) {
      console.error(e)
    }
  }

  async function handleDeleteTopic(topicId: string) {
    try {
      await deleteWeeklyPlanTopic(topicId)
      setPlans(prev => prev.map(p => ({
        ...p,
        topics: p.topics?.filter(t => t.id !== topicId),
      })))
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    )
  }

  const topicsCount = currentPlan?.topics?.length ?? 0
  const topicsDone = currentPlan?.topics?.filter(t => t.status === "done").length ?? 0

  return (
    <div className="px-4 pt-6 space-y-4">
      {/* Header with week nav */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Planejar Semana</h1>
        <div className="flex items-center justify-between mt-2">
          <button onClick={() => setViewDate(addWeeks(viewDate, -1))} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">{weekLabel_}</p>
            {isCurrentWeek && <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-0">Semana atual</Badge>}
            {isFutureWeek && <Badge variant="outline" className="text-[10px]">Próxima</Badge>}
          </div>
          <button onClick={() => setViewDate(addWeeks(viewDate, 1))} className="p-2 hover:bg-slate-100 rounded-lg">
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* No plan yet — create one */}
      {!currentPlan && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-slate-500 text-center">
              Nenhum plano pra essa semana ainda
            </p>
            <div className="space-y-2">
              <Input
                placeholder="Título da semana (opcional)"
                value={weekLabel}
                onChange={e => setWeekLabel(e.target.value)}
                className="border-slate-200 text-sm"
              />
              <Textarea
                placeholder="Notas ou objetivos gerais (opcional)"
                value={weekNotes}
                onChange={e => setWeekNotes(e.target.value)}
                className="border-slate-200 text-sm resize-none"
                rows={2}
              />
            </div>
            <Button onClick={handleCreatePlan} className="w-full bg-indigo-600 hover:bg-indigo-700">
              <CalendarDays className="h-4 w-4 mr-2" />
              Criar Plano da Semana
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan exists */}
      {currentPlan && (
        <>
          {/* Week summary */}
          <Card className="border-0 shadow-sm bg-indigo-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  {currentPlan.week_label && (
                    <p className="text-sm font-semibold text-indigo-900">{currentPlan.week_label}</p>
                  )}
                  <p className="text-xs text-indigo-600">
                    {topicsDone}/{topicsCount} temas concluídos
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-bold text-indigo-700">
                    {topicsCount}/3
                  </span>
                </div>
              </div>
              {currentPlan.notes && (
                <p className="text-xs text-indigo-600/70 mt-2">{currentPlan.notes}</p>
              )}
            </CardContent>
          </Card>

          {/* Topics list */}
          <div className="space-y-2">
            {currentPlan.topics?.map((topic) => {
              const config = statusConfig[topic.status]
              const StatusIcon = config.icon

              return (
                <Card key={topic.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleStatus(topic)}
                        className="mt-0.5 shrink-0"
                      >
                        <StatusIcon className={cn("h-5 w-5", config.color)} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: topic.subject?.color ?? "#6366f1" }}
                          />
                          <p className={cn(
                            "text-sm font-semibold truncate",
                            topic.status === "done" && "line-through text-slate-400"
                          )}>
                            {topic.subject?.name}
                          </p>
                        </div>
                        {topic.goal && (
                          <p className="text-xs text-slate-500 mt-1">{topic.goal}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {config.label}
                          </Badge>
                          {topic.question_target && (
                            <span className="text-[10px] text-slate-400">
                              Meta: {topic.question_target}q
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTopic(topic.id)}
                        className="shrink-0 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4 text-slate-300 hover:text-red-500" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Add topic */}
          {topicsCount < 3 && !showAddTopic && (
            <Button
              variant="outline"
              onClick={() => setShowAddTopic(true)}
              className="w-full border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Tema ({topicsCount}/3)
            </Button>
          )}

          {topicsCount >= 3 && (
            <p className="text-xs text-slate-400 text-center">
              Máximo de 3 temas por semana atingido
            </p>
          )}

          {/* Add topic form */}
          {showAddTopic && (
            <Card className="border-0 shadow-sm border-l-4 border-l-indigo-500">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Novo tema da semana</p>

                {/* Subject picker */}
                <div className="max-h-48 overflow-y-auto space-y-0.5 bg-slate-50 rounded-lg p-2">
                  {subjects.map((parent) => (
                    <div key={parent.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (parent.children?.length) {
                            setExpandedParent(expandedParent === parent.id ? "" : parent.id)
                          } else {
                            setSelectedSubject(parent.id)
                          }
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
                          selectedSubject === parent.id
                            ? "bg-indigo-100 text-indigo-700 font-medium"
                            : "hover:bg-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: parent.color }} />
                          {parent.name}
                          {parent.children?.length ? (
                            <span className="text-[10px] text-slate-400 ml-auto">
                              {expandedParent === parent.id ? "▼" : "▶"}
                            </span>
                          ) : null}
                        </div>
                      </button>

                      {expandedParent === parent.id && parent.children?.map(child => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setSelectedSubject(child.id)}
                          className={cn(
                            "w-full text-left px-2 py-1.5 ml-4 rounded text-xs transition-colors",
                            selectedSubject === child.id
                              ? "bg-indigo-100 text-indigo-700 font-medium"
                              : "text-slate-600 hover:bg-white"
                          )}
                        >
                          {child.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <Input
                  placeholder="Objetivo (ex: Revisar questões DPOC, resolver 30q)"
                  value={topicGoal}
                  onChange={e => setTopicGoal(e.target.value)}
                  className="border-slate-200 text-sm"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="Meta de questões (opcional)"
                  value={topicQuestions}
                  onChange={e => setTopicQuestions(e.target.value)}
                  className="border-slate-200 text-sm"
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setShowAddTopic(false); setSelectedSubject("") }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddTopic}
                    disabled={!selectedSubject}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    Adicionar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Previous weeks */}
      {plans.filter(p => !isSameWeek(new Date(p.week_start_date), weekStart, { weekStartsOn: 1 })).length > 0 && (
        <>
          <Separator />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Semanas anteriores</p>
          {plans
            .filter(p => !isSameWeek(new Date(p.week_start_date), weekStart, { weekStartsOn: 1 }))
            .slice(0, 4)
            .map(plan => {
              const done = plan.topics?.filter(t => t.status === "done").length ?? 0
              const total = plan.topics?.length ?? 0
              return (
                <button
                  key={plan.id}
                  onClick={() => setViewDate(new Date(plan.week_start_date))}
                  className="w-full text-left"
                >
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {plan.week_label ?? format(new Date(plan.week_start_date), "d 'de' MMM", { locale: ptBR })}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {plan.topics?.map(t => t.subject?.name).join(", ")}
                          </p>
                        </div>
                        <Badge variant={done === total ? "default" : "outline"} className="text-[10px]">
                          {done}/{total}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              )
            })}
        </>
      )}
    </div>
  )
}
