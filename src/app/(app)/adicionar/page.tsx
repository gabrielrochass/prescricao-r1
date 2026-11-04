"use client"

import { useEffect, useState } from "react"
import { format, addDays } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, BookOpen, Search } from "lucide-react"
import type { GradeLesson, Effort, Incidence } from "@/lib/types"
import { getGradeLessons } from "@/lib/db/grade-lessons"
import { getStudiedLessonIds, createSubject } from "@/lib/db/subjects"
import { createAgendaItem } from "@/lib/db/agenda"
import { DEFAULT_USER_ID } from "@/lib/supabase"
import { calculateFixation, categoryToIncidence } from "@/lib/engine/review-engine"
import { cn } from "@/lib/utils"

const EFFORT_LABELS: Record<Effort, string> = {
  1: "Muito fácil",
  2: "Fácil",
  3: "Médio",
  4: "Difícil",
  5: "Muito difícil",
}

const CATEGORY_LABEL: Record<string, string> = {
  essential: "Essencial",
  important: "Importante",
  complementary: "Complementar",
}

const CATEGORY_COLOR: Record<string, string> = {
  essential: "bg-red-100 text-red-700",
  important: "bg-amber-100 text-amber-700",
  complementary: "bg-blue-100 text-blue-700",
}

export default function AdicionarPage() {
  const [lessons, setLessons] = useState<GradeLesson[]>([])
  const [studiedIds, setStudiedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Form state
  const [selectedLesson, setSelectedLesson] = useState<GradeLesson | null>(null)
  const [effort, setEffort] = useState<Effort>(3)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [l, ids] = await Promise.all([getGradeLessons(), getStudiedLessonIds()])
        setLessons(l)
        setStudiedIds(ids)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filteredLessons = lessons.filter(l => {
    if (search) return l.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const incidence = selectedLesson ? categoryToIncidence(selectedLesson.category) : 'medium'
  const fixation = effort ? calculateFixation(effort, incidence as Incidence) : null

  async function handleSubmit() {
    if (!selectedLesson) return
    setSaving(true)

    try {
      const today = format(new Date(), "yyyy-MM-dd")
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd")

      // Create subject
      const subject = await createSubject({
        grade_lesson_id: selectedLesson.id,
        incidence: incidence as Incidence,
        effort,
      })

      // Create study agenda item (done)
      await createAgendaItem({
        type: 'study',
        review_number: null,
        planned_date: today,
        done_date: today,
        status: 'done',
        planned_questions: null,
        done_questions: null,
        correct_questions: null,
        interval_used: null,
        subject_id: subject.id,
        simulado_id: null,
        user_id: DEFAULT_USER_ID,
      })

      // Create fixation for tomorrow
      if (fixation) {
        await createAgendaItem({
          type: 'fixation',
          review_number: null,
          planned_date: tomorrow,
          done_date: null,
          status: 'planned',
          planned_questions: fixation.questions,
          done_questions: null,
          correct_questions: null,
          interval_used: 1,
          subject_id: subject.id,
          simulado_id: null,
          user_id: DEFAULT_USER_ID,
        })
      }

      setStudiedIds(prev => [...prev, selectedLesson.id])
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setSelectedLesson(null)
        setEffort(3)
      }, 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
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
        <h2 className="font-display text-2xl text-[var(--color-mr1-text)]">Estudo registrado</h2>
        {fixation && (
          <p className="text-sm text-[var(--color-mr1-text2)]">
            Fixação agendada para amanhã: {fixation.questions} questões
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Adicionar estudo</h1>

      {/* Step 1: Choose lesson */}
      {!selectedLesson ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-mr1-text2)]" />
            <Input
              placeholder="Buscar aula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 border-[var(--color-mr1-lines)] bg-white"
            />
          </div>

          {/* Stats */}
          <p className="text-xs text-[var(--color-mr1-text2)]">
            {studiedIds.length} de 112 aulas estudadas
          </p>

          {/* Lesson list */}
          <div className="space-y-1 max-h-[60vh] overflow-y-auto">
            {filteredLessons.map(lesson => {
              const isStudied = studiedIds.includes(lesson.id)
              return (
                <button
                  key={lesson.id}
                  onClick={() => !isStudied && setSelectedLesson(lesson)}
                  disabled={isStudied}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-colors touch-target",
                    isStudied
                      ? "bg-[var(--color-mr1-lines)]/50 opacity-60"
                      : "bg-white hover:bg-[var(--color-mr1-orange-bg)]/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-[var(--color-mr1-text2)] w-6 text-right">
                      {lesson.sort_order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium truncate",
                        isStudied ? "line-through text-[var(--color-mr1-text2)]" : "text-[var(--color-mr1-text)]"
                      )}>
                        {lesson.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-[var(--color-mr1-text2)]">{lesson.big_area}</span>
                        <Badge className={cn("text-[9px] px-1 py-0", CATEGORY_COLOR[lesson.category])}>
                          {CATEGORY_LABEL[lesson.category]}
                        </Badge>
                      </div>
                    </div>
                    {isStudied && <CheckCircle2 className="h-4 w-4 text-[var(--color-mr1-action)] shrink-0" />}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {/* Step 2: Effort + Incidence */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-[var(--color-mr1-text)]">{selectedLesson.name}</p>
                  <p className="text-xs text-[var(--color-mr1-text2)]">
                    {selectedLesson.big_area} · {Math.round(selectedLesson.mandatory_duration_min / 60 * 10) / 10}h de vídeo
                  </p>
                </div>
                <Badge className={cn("text-xs", CATEGORY_COLOR[selectedLesson.category])}>
                  {CATEGORY_LABEL[selectedLesson.category]}
                </Badge>
              </div>

              {/* Incidence */}
              <div>
                <Label className="text-xs text-[var(--color-mr1-text2)]">Incidência</Label>
                <p className="text-sm font-medium text-[var(--color-mr1-text)] capitalize">{incidence}</p>
                <p className="text-[10px] text-[var(--color-mr1-text2)]">Definida pela categoria</p>
              </div>

              {/* Effort slider */}
              <div className="space-y-2">
                <Label className="text-xs text-[var(--color-mr1-text2)]">Esforço percebido</Label>
                <div className="flex gap-2">
                  {([1, 2, 3, 4, 5] as Effort[]).map(e => (
                    <button
                      key={e}
                      onClick={() => setEffort(e)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all touch-target",
                        effort === e
                          ? "bg-[var(--color-mr1-action)] text-white"
                          : "bg-[var(--color-mr1-lines)] text-[var(--color-mr1-text2)]"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-mr1-text2)] text-center">{EFFORT_LABELS[effort]}</p>
              </div>

              {/* Preview */}
              {fixation && (
                <div className="p-3 rounded-xl bg-[var(--color-mr1-orange-bg)]">
                  <p className="text-xs font-semibold text-[var(--color-mr1-orange)]">Fixação amanhã</p>
                  <p className="text-sm text-[var(--color-mr1-text)]">{fixation.questions} questões</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setSelectedLesson(null)}
              className="flex-1 border-[var(--color-mr1-lines)] text-[var(--color-mr1-text2)]"
            >
              Voltar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white"
            >
              {saving ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
