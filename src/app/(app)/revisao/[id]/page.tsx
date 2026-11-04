"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { format, addDays, differenceInDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Minus, Plus, CheckCircle2, BookOpen, AlertTriangle, Calendar, Target } from "lucide-react"
import { AgendaBadge } from "@/components/mr1/agenda-badge"
import type { AgendaItem, Exam } from "@/lib/types"
import { completeAgendaItem, createAgendaItem } from "@/lib/db/agenda"
import { getSubject } from "@/lib/db/subjects"
import { getPrimaryExam } from "@/lib/db/exams"
import { DEFAULT_USER_ID, supabase } from "@/lib/supabase"
import {
  getAccuracyBand,
  calculateNextReview,
  categoryToIncidence,
} from "@/lib/engine/review-engine"
import { FINAL_STRETCH_START } from "@/lib/engine/scheduler"
import { cn } from "@/lib/utils"
import Link from "next/link"

const BAND_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "domínio": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "bom": { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  "atenção": { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  "rever teoria": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
}

export default function RevisaoCheckPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [today, setToday] = useState<Date | null>(null)
  const [item, setItem] = useState<AgendaItem | null>(null)
  const [subjectData, setSubjectData] = useState<Awaited<ReturnType<typeof getSubject>> | null>(null)
  const [primaryExam, setPrimaryExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const [feitas, setFeitas] = useState(0)
  const [acertos, setAcertos] = useState(0)

  const [nextReviewInfo, setNextReviewInfo] = useState<{
    intervalDays: number
    questions: number
    suggestSummary: boolean
    nextDate: string
  } | null>(null)

  useEffect(() => {
    const now = new Date()
    setToday(now)

    async function load() {
      try {
        const { data: agendaItem, error } = await supabase
          .from("agenda_items")
          .select("*, subject:subjects(*, grade_lesson:grade_lessons(*))")
          .eq("id", id)
          .single()
        if (error || !agendaItem) {
          router.push("/hoje")
          return
        }

        setItem(agendaItem)
        setFeitas(agendaItem.planned_questions ?? 10)
        setAcertos(agendaItem.planned_questions ?? 10)

        if (agendaItem.subject_id) {
          const sub = await getSubject(agendaItem.subject_id)
          setSubjectData(sub)
        }

        const exam = await getPrimaryExam()
        setPrimaryExam(exam)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  // Derived values
  const accuracy = feitas > 0 ? Math.round((acertos / feitas) * 100) : 0
  const band = getAccuracyBand(accuracy)
  const bandColors = BAND_COLORS[band.label] ?? BAND_COLORS["atenção"]

  const effort = (subjectData?.effort ?? 3) as 1 | 2 | 3 | 4 | 5
  const incidence = subjectData
    ? categoryToIncidence(subjectData.grade_lesson?.category ?? "complementary")
    : "medium" as const
  const reviewNumber = item?.review_number ?? 1
  const isAfterFixation = item?.type === "fixation"
  const currentInterval = item?.interval_used ?? 1

  const examDateStr = primaryExam?.exam_date ?? "2027-12-19"

  // Calculate next review live
  const nextReview = today
    ? calculateNextReview({
        accuracy,
        currentInterval,
        reviewNumber: isAfterFixation ? 1 : reviewNumber,
        effort,
        incidence,
        isAfterFixation,
        examDate: examDateStr,
        finalStretchStart: FINAL_STRETCH_START,
        totalLadderReviews: 6,
      })
    : null

  const nextReviewDate = today && nextReview
    ? format(addDays(today, nextReview.intervalDays), "dd/MM/yyyy")
    : null

  const daysUntilExam = today ? differenceInDays(new Date(examDateStr), today) : 0
  const reviewsRemaining = isAfterFixation ? 6 : Math.max(0, 6 - reviewNumber)

  const subjectName = item?.subject?.grade_lesson?.name ?? "Materia"
  const reviewLabel = isAfterFixation
    ? "Fixacao"
    : `R${reviewNumber}`

  const handleIncrement = useCallback((setter: React.Dispatch<React.SetStateAction<number>>, max?: number) => {
    setter(prev => max !== undefined ? Math.min(prev + 1, max) : prev + 1)
  }, [])

  const handleDecrement = useCallback((setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter(prev => Math.max(0, prev - 1))
  }, [])

  async function handleConcluir() {
    if (!item || !today) return
    setSaving(true)

    try {
      await completeAgendaItem(item.id, feitas, acertos)

      // Calculate and schedule next review
      const nextCalc = calculateNextReview({
        accuracy,
        currentInterval,
        reviewNumber: isAfterFixation ? 1 : reviewNumber,
        effort,
        incidence,
        isAfterFixation,
        examDate: examDateStr,
        finalStretchStart: FINAL_STRETCH_START,
        totalLadderReviews: 6,
      })

      if (nextCalc && item.subject_id) {
        const nextDate = format(addDays(today, nextCalc.intervalDays), "yyyy-MM-dd")
        const nextRevNum = isAfterFixation ? 1 : reviewNumber + 1

        await createAgendaItem({
          type: "review",
          review_number: nextRevNum,
          planned_date: nextDate,
          done_date: null,
          status: "planned",
          planned_questions: nextCalc.questions,
          done_questions: null,
          correct_questions: null,
          interval_used: nextCalc.intervalDays,
          subject_id: item.subject_id,
          simulado_id: null,
          user_id: DEFAULT_USER_ID,
        })

        setNextReviewInfo({
          intervalDays: nextCalc.intervalDays,
          questions: nextCalc.questions,
          suggestSummary: nextCalc.suggestSummary,
          nextDate,
        })
      }

      setDone(true)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !today) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[var(--color-mr1-text2)]">Item nao encontrado</div>
      </div>
    )
  }

  // Done state
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-5 px-6">
        <div className="h-20 w-20 rounded-full bg-[var(--color-mr1-pink-bg)] flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-[var(--color-mr1-action)]" />
        </div>
        <h2 className="font-display text-2xl text-[var(--color-mr1-text)] text-center">
          {reviewLabel} concluida!
        </h2>
        <p className="text-sm text-[var(--color-mr1-text2)] text-center">
          {subjectName}
        </p>

        {/* Accuracy result */}
        <div className={cn(
          "w-full p-4 rounded-2xl border",
          bandColors.bg, bandColors.border
        )}>
          <div className="flex items-center justify-between">
            <span className={cn("text-sm font-semibold capitalize", bandColors.text)}>
              {band.label}
            </span>
            <span className={cn("text-2xl font-bold", bandColors.text)}>
              {accuracy}%
            </span>
          </div>
          <p className="text-xs text-[var(--color-mr1-text2)] mt-1">
            {acertos} de {feitas} questoes corretas
          </p>
        </div>

        {/* Next review info */}
        {nextReviewInfo && (
          <Card className="w-full border-0 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--color-mr1-action)]" />
                <span className="text-sm font-semibold text-[var(--color-mr1-text)]">
                  Proxima revisao
                </span>
              </div>
              <p className="text-sm text-[var(--color-mr1-text)]">
                {format(new Date(nextReviewInfo.nextDate), "dd 'de' MMMM", { locale: ptBR })} ({nextReviewInfo.intervalDays} dias)
              </p>
              <p className="text-xs text-[var(--color-mr1-text2)]">
                {nextReviewInfo.questions} questoes
              </p>
            </CardContent>
          </Card>
        )}

        {/* Suggest summary lesson */}
        {nextReviewInfo?.suggestSummary && (
          <Card className="w-full border-0 shadow-sm bg-[var(--color-mr1-butter)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[var(--color-mr1-orange)]" />
                <span className="text-sm font-semibold text-[var(--color-mr1-text)]">
                  Sugestao: Aula Resumo
                </span>
              </div>
              <p className="text-xs text-[var(--color-mr1-text2)] mt-1">
                Seu aproveitamento ficou abaixo de 50%. Considere reassistir a aula resumo de {subjectName} antes da proxima revisao.
              </p>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={() => router.push("/hoje")}
          className="w-full bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white mt-2"
          size="lg"
        >
          Voltar para Hoje
        </Button>
      </div>
    )
  }

  // Main check form
  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/hoje" className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <AgendaBadge type={item.type} reviewNumber={item.review_number} />
            <h1 className="font-display text-2xl text-[var(--color-mr1-text)]">
              {subjectName}
            </h1>
          </div>
          <p className="text-xs text-[var(--color-mr1-text2)] mt-0.5">
            {isAfterFixation ? "Fixacao" : `Revisao ${reviewNumber} de 6`}
          </p>
        </div>
      </div>

      {/* Feitas input */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--color-mr1-text)]">
              Questoes feitas
            </label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleDecrement(setFeitas)}
                className="h-11 w-11 rounded-full bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target"
              >
                <Minus className="h-4 w-4 text-[var(--color-mr1-text2)]" />
              </button>
              <span className="text-3xl font-bold text-[var(--color-mr1-text)] w-16 text-center tabular-nums">
                {feitas}
              </span>
              <button
                onClick={() => handleIncrement(setFeitas)}
                className="h-11 w-11 rounded-full bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target"
              >
                <Plus className="h-4 w-4 text-[var(--color-mr1-text2)]" />
              </button>
            </div>
          </div>

          <div className="h-px bg-[var(--color-mr1-lines)]" />

          <div className="space-y-3">
            <label className="text-sm font-medium text-[var(--color-mr1-text)]">
              Acertos
            </label>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handleDecrement(setAcertos)}
                className="h-11 w-11 rounded-full bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target"
              >
                <Minus className="h-4 w-4 text-[var(--color-mr1-text2)]" />
              </button>
              <span className="text-3xl font-bold text-[var(--color-mr1-text)] w-16 text-center tabular-nums">
                {acertos}
              </span>
              <button
                onClick={() => handleIncrement(setAcertos, feitas)}
                className="h-11 w-11 rounded-full bg-[var(--color-mr1-lines)] flex items-center justify-center touch-target"
              >
                <Plus className="h-4 w-4 text-[var(--color-mr1-text2)]" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <p className="text-xs font-semibold text-[var(--color-mr1-text2)] uppercase tracking-wide">
            Preview
          </p>

          {/* Accuracy band */}
          <div className={cn(
            "p-3 rounded-xl border",
            bandColors.bg, bandColors.border
          )}>
            <div className="flex items-center justify-between">
              <span className={cn("text-sm font-semibold capitalize", bandColors.text)}>
                {band.label}
              </span>
              <span className={cn("text-xl font-bold", bandColors.text)}>
                {feitas > 0 ? `${accuracy}%` : "--"}
              </span>
            </div>
          </div>

          {/* Next review */}
          {nextReview && nextReviewDate ? (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-mr1-pink-bg)]">
              <Calendar className="h-4 w-4 text-[var(--color-mr1-pink)] mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-mr1-text)]">
                  Proxima: {nextReviewDate}
                </p>
                <p className="text-xs text-[var(--color-mr1-text2)]">
                  {nextReview.questions} questoes em {nextReview.intervalDays} dias
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--color-mr1-lines)]">
              <Target className="h-4 w-4 text-[var(--color-mr1-text2)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--color-mr1-text2)]">
                Ultima revisao do ciclo ou apos a data da prova
              </p>
            </div>
          )}

          {/* Reviews remaining */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-mr1-text2)]">
              Revisoes restantes ate SES-PE
            </span>
            <Badge variant="outline" className="text-xs font-semibold border-[var(--color-mr1-lines)]">
              {reviewsRemaining}
            </Badge>
          </div>

          {/* Days until exam */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-mr1-text2)]">
              Dias ate a prova
            </span>
            <Badge variant="outline" className="text-xs font-semibold border-[var(--color-mr1-lines)]">
              {daysUntilExam}
            </Badge>
          </div>

          {/* Suggest summary */}
          {band.label === "rever teoria" && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-mr1-butter)]">
              <AlertTriangle className="h-4 w-4 text-[var(--color-mr1-orange)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--color-mr1-text)]">
                Aproveitamento baixo. Considere assistir a <strong>Aula Resumo</strong> antes da proxima revisao.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Concluir button */}
      <Button
        onClick={handleConcluir}
        disabled={saving || feitas === 0}
        className="w-full bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white"
        size="lg"
      >
        {saving ? "Salvando..." : "Concluir"}
      </Button>
    </div>
  )
}
