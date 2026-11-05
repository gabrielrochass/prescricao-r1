"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Calendar,
  BookOpen,
  PartyPopper,
  ArrowRight,
  ArrowLeft,
  Minus,
  Plus,
} from "lucide-react"
import type { Exam, GradeLesson } from "@/lib/types"
import { getExams } from "@/lib/db/exams"
import { getGradeLessons } from "@/lib/db/grade-lessons"
import { createRotation } from "@/lib/db/rotations"
import { updateUser } from "@/lib/db/users"
import { cn } from "@/lib/utils"

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

const STEP_COUNT = 6

export default function OnboardingPage() {
  const router = useRouter()

  const [today, setToday] = useState<Date | null>(null)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)

  // Step 2: Provas
  const [exams, setExams] = useState<Exam[]>([])

  // Step 3: Rodizio
  const [rotationName, setRotationName] = useState("")
  const [weekdayHours, setWeekdayHours] = useState(2)
  const [weekendHours, setWeekendHours] = useState(4)
  const [shiftsPerWeek, setShiftsPerWeek] = useState(0)
  const [newTopicDays, setNewTopicDays] = useState<number[]>([1, 3, 5])
  const [savingRotation, setSavingRotation] = useState(false)

  // Step 4: Grade
  const [lessons, setLessons] = useState<GradeLesson[]>([])

  // Step 6: finishing
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    const now = new Date()
    setToday(now)

    async function load() {
      try {
        const [ex, gl] = await Promise.all([getExams(), getGradeLessons()])
        setExams(ex)
        setLessons(gl)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleTopicDay = useCallback((day: number) => {
    setNewTopicDays(prev => {
      if (prev.includes(day)) {
        return prev.filter(d => d !== day)
      }
      if (prev.length >= 3) return prev
      return [...prev, day].sort((a, b) => a - b)
    })
  }, [])

  async function handleNextFromStep(currentStep: number) {
    if (currentStep === 2) {
      // Save rotation
      if (!rotationName.trim()) {
        setStep(currentStep + 1)
        return
      }
      setSavingRotation(true)
      try {
        await createRotation({
          name: rotationName.trim(),
          weekday_hours: weekdayHours,
          weekend_hours: weekendHours,
          shifts_per_week: shiftsPerWeek,
          new_topic_days: newTopicDays,
        })
      } catch (e) {
        console.error(e)
      } finally {
        setSavingRotation(false)
      }
    }

    if (currentStep === STEP_COUNT - 1) {
      // Final step: mark onboarding complete
      setFinishing(true)
      try {
        await updateUser({ onboarding_completed: true })
        router.push("/hoje")
      } catch (e) {
        console.error(e)
        router.push("/hoje")
      }
      return
    }

    setStep(currentStep + 1)
  }

  const essentialCount = lessons.filter(l => l.category === "essential").length
  const importantCount = lessons.filter(l => l.category === "important").length
  const complementaryCount = lessons.filter(l => l.category === "complementary").length

  const firstWeekDate = today ? format(addDays(today, 1), "dd 'de' MMMM", { locale: ptBR }) : ""

  if (loading || !today) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-mr1-bg)]">
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-mr1-bg)] flex flex-col">
      {/* Progress bar */}
      <div className="px-4 pt-4">
        <div className="flex gap-1.5">
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                i <= step ? "bg-[var(--color-mr1-action)]" : "bg-[var(--color-mr1-lines)]"
              )}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-4 pt-8 pb-6 max-w-lg mx-auto w-full">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
            <div className="h-20 w-20 rounded-full bg-[var(--color-mr1-pink-bg)] flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-[var(--color-mr1-action)]" />
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-4xl text-[var(--color-mr1-text)]">
                Bem-vinda ao MR1
              </h1>
              <p className="text-sm text-[var(--color-mr1-text2)] leading-relaxed max-w-xs mx-auto">
                Seu plano de estudo inteligente para residencia medica.
                Vamos configurar tudo em menos de 2 minutos.
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Provas */}
        {step === 1 && (
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">
                Suas provas
              </h1>
              <p className="text-sm text-[var(--color-mr1-text2)] mt-1">
                Confirme as datas das suas provas-alvo.
              </p>
            </div>

            <div className="space-y-3">
              {exams.map(exam => (
                <Card key={exam.id} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[var(--color-mr1-pink-bg)] flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-[var(--color-mr1-action)]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-mr1-text)]">
                            {exam.name}
                          </p>
                          <p className="text-xs text-[var(--color-mr1-text2)]">
                            {format(new Date(exam.exam_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      {exam.estimated && (
                        <Badge variant="outline" className="text-[10px] border-[var(--color-mr1-lines)] text-[var(--color-mr1-text2)]">
                          estimada
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-xs text-[var(--color-mr1-text2)] text-center">
              Voce pode ajustar as datas depois em Mais &gt; Provas.
            </p>
          </div>
        )}

        {/* Step 2: Rodizio */}
        {step === 2 && (
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">
                Rodizio atual
              </h1>
              <p className="text-sm text-[var(--color-mr1-text2)] mt-1">
                Nos conte sobre seu rodizio para ajustar o plano.
              </p>
            </div>

            <div className="space-y-4">
              {/* Rotation name */}
              <div className="space-y-2">
                <Label className="text-xs text-[var(--color-mr1-text2)]">Nome do rodizio</Label>
                <Input
                  placeholder="Ex: Clinica Medica, Cirurgia..."
                  value={rotationName}
                  onChange={e => setRotationName(e.target.value)}
                  className="border-[var(--color-mr1-lines)] bg-white"
                />
              </div>

              {/* Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--color-mr1-text2)]">Horas estudo (dia util)</Label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWeekdayHours(prev => Math.max(0, prev - 0.5))}
                      className="h-9 w-9 rounded-lg bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target active:scale-95"
                    >
                      <Minus className="h-3.5 w-3.5 text-[var(--color-mr1-text2)]" />
                    </button>
                    <span className="text-lg font-bold text-[var(--color-mr1-text)] w-10 text-center tabular-nums">
                      {weekdayHours}
                    </span>
                    <button
                      onClick={() => setWeekdayHours(prev => Math.min(8, prev + 0.5))}
                      className="h-9 w-9 rounded-lg bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5 text-[var(--color-mr1-text2)]" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-[var(--color-mr1-text2)]">Horas estudo (final de semana)</Label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWeekendHours(prev => Math.max(0, prev - 0.5))}
                      className="h-9 w-9 rounded-lg bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target active:scale-95"
                    >
                      <Minus className="h-3.5 w-3.5 text-[var(--color-mr1-text2)]" />
                    </button>
                    <span className="text-lg font-bold text-[var(--color-mr1-text)] w-10 text-center tabular-nums">
                      {weekendHours}
                    </span>
                    <button
                      onClick={() => setWeekendHours(prev => Math.min(12, prev + 0.5))}
                      className="h-9 w-9 rounded-lg bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5 text-[var(--color-mr1-text2)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Shifts per week */}
              <div className="space-y-2">
                <Label className="text-xs text-[var(--color-mr1-text2)]">Plantoes por semana</Label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShiftsPerWeek(prev => Math.max(0, prev - 1))}
                    className="h-9 w-9 rounded-lg bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target active:scale-95"
                  >
                    <Minus className="h-3.5 w-3.5 text-[var(--color-mr1-text2)]" />
                  </button>
                  <span className="text-lg font-bold text-[var(--color-mr1-text)] w-10 text-center tabular-nums">
                    {shiftsPerWeek}
                  </span>
                  <button
                    onClick={() => setShiftsPerWeek(prev => Math.min(7, prev + 1))}
                    className="h-9 w-9 rounded-lg bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5 text-[var(--color-mr1-text2)]" />
                  </button>
                </div>
              </div>

              {/* New topic days */}
              <div className="space-y-2">
                <Label className="text-xs text-[var(--color-mr1-text2)]">
                  Dias para aula nova (max. 3)
                </Label>
                <div className="flex gap-2">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleTopicDay(i)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-medium transition-all touch-target active:scale-95",
                        newTopicDays.includes(i)
                          ? "bg-[var(--color-mr1-action)] text-white"
                          : "bg-[var(--color-mr1-lines)] text-[var(--color-mr1-text2)]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--color-mr1-text2)] text-center">
              Pule se nao quer configurar agora.
            </p>
          </div>
        )}

        {/* Step 3: Grade */}
        {step === 3 && (
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">
                Grade de aulas
              </h1>
              <p className="text-sm text-[var(--color-mr1-text2)] mt-1">
                A grade do EMR ja esta importada.
              </p>
            </div>

            <div className="space-y-3">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <span className="text-sm font-medium text-[var(--color-mr1-text)]">Essenciais</span>
                    </div>
                    <span className="text-sm font-bold text-[var(--color-mr1-text)]">{essentialCount}</span>
                  </div>
                  <p className="text-xs text-[var(--color-mr1-text2)] mt-1 ml-[22px]">
                    Alta incidencia, prioridade maxima
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="text-sm font-medium text-[var(--color-mr1-text)]">Importantes</span>
                    </div>
                    <span className="text-sm font-bold text-[var(--color-mr1-text)]">{importantCount}</span>
                  </div>
                  <p className="text-xs text-[var(--color-mr1-text2)] mt-1 ml-[22px]">
                    Incidencia media, fase 1
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                      <span className="text-sm font-medium text-[var(--color-mr1-text)]">Complementares</span>
                    </div>
                    <span className="text-sm font-bold text-[var(--color-mr1-text)]">{complementaryCount}</span>
                  </div>
                  <p className="text-xs text-[var(--color-mr1-text2)] mt-1 ml-[22px]">
                    Incidencia baixa, fase 2
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-mr1-orange-bg)]">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[var(--color-mr1-orange)]" />
                <span className="text-sm font-semibold text-[var(--color-mr1-orange)]">
                  {lessons.length} aulas no total
                </span>
              </div>
              <p className="text-xs text-[var(--color-mr1-text2)] mt-1">
                Distribuidas em 5 grandes areas: Clinica Medica, Cirurgia, Pediatria, GO e Preventiva.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="flex-1 space-y-6">
            <div>
              <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">
                Seu plano
              </h1>
              <p className="text-sm text-[var(--color-mr1-text2)] mt-1">
                Seu plano comeca em {firstWeekDate}.
              </p>
            </div>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-[var(--color-mr1-text2)] uppercase tracking-wide">
                  Primeira semana
                </p>
                <div className="space-y-2">
                  {[0, 1, 2].map(i => {
                    const lesson = lessons[i]
                    if (!lesson) return null
                    return (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-mr1-bg)]">
                        <div className="h-8 w-8 rounded-lg bg-[var(--color-mr1-orange-bg)] flex items-center justify-center">
                          <span className="text-xs font-bold text-[var(--color-mr1-orange)]">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--color-mr1-text)] truncate">
                            {lesson.name}
                          </p>
                          <p className="text-[10px] text-[var(--color-mr1-text2)]">
                            {lesson.big_area} · {Math.round(lesson.mandatory_duration_min / 60 * 10) / 10}h
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-[var(--color-mr1-text2)] uppercase tracking-wide">
                  Ritmo semanal
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--color-mr1-text)]">3</p>
                    <p className="text-[10px] text-[var(--color-mr1-text2)]">aulas/semana</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--color-mr1-text)]">30</p>
                    <p className="text-[10px] text-[var(--color-mr1-text2)]">questoes/dia</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--color-mr1-text)]">~4h</p>
                    <p className="text-[10px] text-[var(--color-mr1-text2)]">video/semana</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-[var(--color-mr1-text2)] text-center">
              O plano se adapta automaticamente ao seu ritmo e desempenho.
            </p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
            {/* Confetti-like visual */}
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-[var(--color-mr1-pink-bg)] flex items-center justify-center">
                <PartyPopper className="h-12 w-12 text-[var(--color-mr1-action)]" />
              </div>
              {/* Decorative dots */}
              <div className="absolute -top-2 -left-2 h-3 w-3 rounded-full bg-[var(--color-mr1-orange)]" />
              <div className="absolute -top-1 right-0 h-2 w-2 rounded-full bg-[var(--color-mr1-pink)]" />
              <div className="absolute bottom-0 -left-3 h-2.5 w-2.5 rounded-full bg-[var(--color-mr1-action)]" />
              <div className="absolute -bottom-2 right-2 h-2 w-2 rounded-full bg-[var(--color-mr1-orange)]" />
              <div className="absolute top-3 -right-4 h-3 w-3 rounded-full bg-[var(--color-mr1-pink-tag)]" />
              <div className="absolute -bottom-3 -left-1 h-1.5 w-1.5 rounded-full bg-[var(--color-mr1-orange-tag)]" />
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-4xl text-[var(--color-mr1-text)]">
                Tudo pronto!
              </h1>
              <p className="text-sm text-[var(--color-mr1-text2)] leading-relaxed max-w-xs mx-auto">
                Seu plano de estudo personalizado esta configurado.
                Bons estudos!
              </p>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="mt-auto pt-6 space-y-3">
          {step === 0 ? (
            <Button
              onClick={() => handleNextFromStep(0)}
              className="w-full bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white active:scale-95"
              size="lg"
            >
              Comecar
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          ) : step === STEP_COUNT - 1 ? (
            <Button
              onClick={() => handleNextFromStep(step)}
              disabled={finishing}
              className="w-full bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white active:scale-95"
              size="lg"
            >
              {finishing ? <><span className="mr1-spinner" /> Preparando...</> : "Ir para o plano"}
              {!finishing && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(prev => Math.max(0, prev - 1))}
                className="border-[var(--color-mr1-lines)] text-[var(--color-mr1-text2)] active:scale-95"
                size="lg"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => handleNextFromStep(step)}
                disabled={savingRotation}
                className="flex-1 bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white active:scale-95"
                size="lg"
              >
                {savingRotation ? <><span className="mr1-spinner" /> Salvando...</> : step === 2 ? (rotationName.trim() ? "Salvar e continuar" : "Pular") : "Continuar"}
                {!savingRotation && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          )}

          {/* Step indicator */}
          <p className="text-[10px] text-[var(--color-mr1-text2)] text-center">
            {step + 1} de {STEP_COUNT}
          </p>
        </div>
      </div>
    </div>
  )
}
