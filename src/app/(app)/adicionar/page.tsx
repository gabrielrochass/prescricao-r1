"use client"

import { useEffect, useState } from "react"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Search, ChevronDown } from "lucide-react"
import { AgendaBadge } from "@/components/mr1/agenda-badge"
import type { GradeLesson, Effort, Incidence } from "@/lib/types"
import { getGradeLessons } from "@/lib/db/grade-lessons"
import { getStudiedLessonIds, createSubject } from "@/lib/db/subjects"
import { createAgendaItem } from "@/lib/db/agenda"
import { DEFAULT_USER_ID } from "@/lib/supabase"
import { calculateFixation, categoryToIncidence, calculateNextReview, getIntervalCap } from "@/lib/engine/review-engine"
import { FINAL_STRETCH_START } from "@/lib/engine/scheduler"
import { cn } from "@/lib/utils"
import Link from "next/link"

const EFFORT_LABELS: Record<Effort, string> = {
  1: "Muito fácil", 2: "Fácil", 3: "Médio", 4: "Difícil", 5: "Muito difícil",
}

const INCIDENCE_LABELS: Record<Incidence, string> = { high: "alta", medium: "média", low: "baixa" }

export default function AdicionarPage() {
  const [lessons, setLessons] = useState<GradeLesson[]>([])
  const [studiedIds, setStudiedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [today, setToday] = useState<Date | null>(null)

  const [step, setStep] = useState(1)
  const [selectedLesson, setSelectedLesson] = useState<GradeLesson | null>(null)
  const [effort, setEffort] = useState<Effort>(3)
  const [fixationDone, setFixationDone] = useState(false)
  const [fixationFeitas, setFixationFeitas] = useState("")
  const [fixationAcertos, setFixationAcertos] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedSubjectId, setSavedSubjectId] = useState<string | null>(null)

  useEffect(() => {
    setToday(new Date())
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

  if (loading || !today) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FCF8F9]">
        <div className="animate-pulse text-[#7C6673]">Carregando...</div>
      </div>
    )
  }

  const incidence: Incidence = selectedLesson ? categoryToIncidence(selectedLesson.category) : "medium"
  const fixation = calculateFixation(effort, incidence)
  const todayStr = format(today, "yyyy-MM-dd")
  const tomorrowStr = format(addDays(today, 1), "yyyy-MM-dd")

  // Generate projected review dates (assuming "bom" accuracy for preview)
  function getProjectedReviews(): { num: number; date: string; interval: number; questions: number; isRF?: boolean }[] {
    const reviews: { num: number; date: string; interval: number; questions: number; isRF?: boolean }[] = []
    let currentDate = addDays(today!, 1) // after fixation
    let currentInterval = 4 // "bom" after fixation = 4 days
    const examDate = "2027-12-19"

    for (let r = 1; r <= 6; r++) {
      const nextDate = addDays(currentDate, currentInterval)
      if (nextDate > new Date(examDate)) break
      reviews.push({
        num: r,
        date: format(nextDate, "dd/MM/yyyy"),
        interval: currentInterval,
        questions: 10,
      })
      currentDate = nextDate
      currentInterval = Math.min(Math.round(currentInterval * 1.5), getIntervalCap(incidence))
    }

    // Guaranteed review in final stretch
    reviews.push({
      num: 0,
      date: "entre 07/11/2027 e 18/12/2027",
      interval: 0,
      questions: 10,
      isRF: true,
    })

    return reviews
  }

  async function handleSaveStudy() {
    if (!selectedLesson) return
    setSaving(true)
    try {
      const subject = await createSubject({
        grade_lesson_id: selectedLesson.id,
        incidence,
        effort,
      })
      await createAgendaItem({
        type: "study", review_number: null, planned_date: todayStr,
        done_date: todayStr, status: "done", planned_questions: null,
        done_questions: null, correct_questions: null, interval_used: null,
        subject_id: subject.id, simulado_id: null, user_id: DEFAULT_USER_ID,
      })
      setSavedSubjectId(subject.id)
      setStudiedIds(prev => [...prev, selectedLesson.id])
      setStep(2)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveFixation() {
    if (!savedSubjectId) return
    setSaving(true)
    try {
      if (fixationDone) {
        await createAgendaItem({
          type: "fixation", review_number: null, planned_date: todayStr,
          done_date: todayStr, status: "done",
          planned_questions: fixation.questions,
          done_questions: parseInt(fixationFeitas) || fixation.questions,
          correct_questions: parseInt(fixationAcertos) || 0,
          interval_used: 1, subject_id: savedSubjectId, simulado_id: null, user_id: DEFAULT_USER_ID,
        })
      } else {
        await createAgendaItem({
          type: "fixation", review_number: null, planned_date: tomorrowStr,
          done_date: null, status: "planned", planned_questions: fixation.questions,
          done_questions: null, correct_questions: null,
          interval_used: 1, subject_id: savedSubjectId, simulado_id: null, user_id: DEFAULT_USER_ID,
        })
      }
      setStep(3)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setStep(1)
    setSelectedLesson(null)
    setEffort(3)
    setFixationDone(false)
    setFixationFeitas("")
    setFixationAcertos("")
    setSavedSubjectId(null)
  }

  const filteredLessons = lessons.filter(l =>
    search ? l.name.toLowerCase().includes(search.toLowerCase()) : true
  )

  const projectedReviews = selectedLesson ? getProjectedReviews() : []

  const essentialCount = lessons.filter(l => l.category === "essential").length
  const importantCount = lessons.filter(l => l.category === "important").length
  const complementaryCount = lessons.filter(l => l.category === "complementary").length
  const studiedCount = studiedIds.length
  const progressPct = lessons.length > 0 ? Math.round((studiedCount / lessons.length) * 100) : 0

  // ─── STEP 1: Estudo ───
  if (step === 1 && !selectedLesson) {
    return (
      <div className="min-h-screen bg-[#FCF8F9] flex flex-col">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <Link href="/hoje" className="text-[15px] text-[#7C6673]">Cancelar</Link>
          <span className="font-display text-xl text-[#4A2B3F]">Adicionar estudo</span>
          <span className="text-[13px] text-[#7C6673]">1 de 3</span>
        </div>

        <div className="px-4 space-y-3 flex-1 flex flex-col">
          {/* Date */}
          <div className="flex items-center justify-between py-2 border-b border-[#F1E4E9]">
            <span className="text-[13px] text-[#7C6673]">Data do estudo</span>
            <span className="text-[15px] text-[#4A2B3F]">{format(today, "dd/MM/yyyy")}</span>
          </div>

          {/* EMR info + progress */}
          <div className="p-3 rounded-xl bg-white border border-[#F1E4E9]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[13px] font-medium text-[#4A2B3F]">Grade do Eu Médico Residente</p>
                <p className="text-[11px] text-[#7C6673]">Extensivo 2025 R1 Bônus</p>
              </div>
              <span className="text-[13px] font-semibold text-[#C23B6C]">{progressPct}%</span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-[#F1E4E9] overflow-hidden">
              <div className="h-full rounded-full bg-[#E06A1B] transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-[#7C6673]">
              <span>{studiedCount} de {lessons.length} aulas estudadas</span>
              <div className="flex gap-2">
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700">{essentialCount} essenciais</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{importantCount} importantes</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{complementaryCount} compl.</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7C6673]" />
            <Input
              placeholder="Buscar aula da grade..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 border-[#F1E4E9] bg-white text-[#4A2B3F]"
            />
          </div>

          <p className="text-[10px] text-[#7C6673]">
            A lista segue a ordem de prioridade do EMR para ENAMED e SES-PE. Essenciais primeiro, depois Importantes, depois Complementares.
          </p>

          {/* Lesson list — fills remaining space */}
          <div className="flex-1 overflow-y-auto rounded-xl bg-white -mx-0.5 min-h-0">
            {filteredLessons.map((lesson, i) => {
              const isStudied = studiedIds.includes(lesson.id)
              const catLabel = lesson.category === "essential" ? "Essencial" : lesson.category === "important" ? "Importante" : "Complementar"
              const catColor = lesson.category === "essential" ? "text-red-600" : lesson.category === "important" ? "text-amber-600" : "text-blue-600"
              return (
                <button
                  key={lesson.id}
                  onClick={() => !isStudied && setSelectedLesson(lesson)}
                  disabled={isStudied}
                  className={cn(
                    "w-full text-left px-4 py-3 touch-target flex items-center gap-3",
                    i < filteredLessons.length - 1 && "border-b border-[#F1E4E9]",
                    isStudied && "opacity-40"
                  )}
                >
                  <span className="text-[11px] text-[#7C6673] w-5 text-right shrink-0 tabular-nums">{lesson.sort_order}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[14px] leading-tight", isStudied ? "line-through text-[#7C6673]" : "text-[#4A2B3F]")}>
                      {lesson.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-[#7C6673]">{lesson.big_area}</span>
                      <span className="text-[10px] text-[#7C6673]">·</span>
                      <span className={cn("text-[10px] font-medium", catColor)}>{catLabel}</span>
                      {lesson.mandatory_duration_min > 0 && (
                        <>
                          <span className="text-[10px] text-[#7C6673]">·</span>
                          <span className="text-[10px] text-[#7C6673]">{Math.round(lesson.mandatory_duration_min / 60 * 10) / 10}h</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {isStudied ? (
                      <CheckCircle2 className="h-4 w-4 text-[#C23B6C]" />
                    ) : (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        incidence === "high" ? "bg-red-50 text-red-600" : incidence === "medium" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {INCIDENCE_LABELS[categoryToIncidence(lesson.category)]}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  if (step === 1 && selectedLesson) {
    return (
      <div className="min-h-screen bg-[#FCF8F9]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={handleCancel} className="text-[15px] text-[#7C6673]">Cancelar</button>
          <span className="font-display text-xl text-[#4A2B3F]">Adicionar estudo</span>
          <span className="text-[13px] text-[#7C6673]">1 de 3</span>
        </div>

        <div className="px-4 space-y-4 pt-2">
          <div className="flex items-center justify-between py-2 border-b border-[#F1E4E9]">
            <span className="text-[13px] text-[#7C6673]">Data do estudo</span>
            <span className="text-[15px] text-[#4A2B3F]">{format(today, "dd/MM/yyyy")}</span>
          </div>

          <div className="border-b border-[#F1E4E9] pb-3">
            <span className="text-[13px] text-[#7C6673]">Aula da grade</span>
            <button onClick={() => setSelectedLesson(null)} className="flex items-center justify-between w-full mt-1">
              <span className="text-[15px] text-[#4A2B3F]">{selectedLesson.name}</span>
              <ChevronDown className="h-4 w-4 text-[#7C6673]" />
            </button>
            <p className="text-[11px] text-[#7C6673] mt-0.5">{selectedLesson.big_area}, {selectedLesson.category === "essential" ? "Essencial" : selectedLesson.category === "important" ? "Importante" : "Complementar"}</p>
          </div>

          {/* Effort */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#4A2B3F] font-medium">Percepção de esforço</span>
              <span className="text-[13px] text-[#7C6673]">{EFFORT_LABELS[effort].toLowerCase()}</span>
            </div>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as Effort[]).map(e => (
                <button
                  key={e}
                  onClick={() => setEffort(e)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[15px] font-medium transition-all touch-target",
                    effort === e
                      ? "bg-[#C23B6C] text-white"
                      : "bg-white border border-[#F1E4E9] text-[#4A2B3F]"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-[#7C6673] px-1">
              <span>1, muito fácil</span>
              <span>5, muito difícil</span>
            </div>
          </div>

          {/* Incidence */}
          <div className="flex items-center justify-between py-3 border-t border-[#F1E4E9]">
            <div>
              <span className="text-[13px] text-[#4A2B3F] font-medium">Incidência na prova</span>
              <p className="text-[11px] text-[#7C6673]">Pela categoria {selectedLesson.category === "essential" ? "Essencial" : selectedLesson.category === "important" ? "Importante" : "Complementar"} do EMR</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-[#4A2B3F]">{INCIDENCE_LABELS[incidence]}</span>
              <button className="text-[13px] text-[#C23B6C] border border-[#C23B6C] rounded-lg px-2 py-0.5">Mudar</button>
            </div>
          </div>

          <Button onClick={handleSaveStudy} disabled={saving} className="w-full h-12 bg-[#C23B6C] text-white text-[15px] font-semibold rounded-xl">
            {saving ? "Salvando..." : "Salvar estudo"}
          </Button>
        </div>
      </div>
    )
  }

  // ─── STEP 2: Fixação ───
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#FCF8F9]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={handleCancel} className="text-[15px] text-[#7C6673]">Cancelar</button>
          <span className="font-display text-xl text-[#4A2B3F]">Fixação</span>
          <span className="text-[13px] text-[#7C6673]">2 de 3</span>
        </div>

        <div className="px-4 space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-[#FFF0E6]">
            <p className="text-[11px] text-[#7C6673]">{selectedLesson?.big_area}, {selectedLesson?.category === "essential" ? "Essencial" : selectedLesson?.category === "important" ? "Importante" : "Complementar"}</p>
            <p className="text-[15px] font-semibold text-[#4A2B3F]">{selectedLesson?.name}</p>
            <p className="text-[11px] text-[#7C6673]">Estudado em {format(today, "dd/MM/yyyy")}, esforço {effort}/5, incidência {INCIDENCE_LABELS[incidence]}</p>
          </div>

          <div className="p-4 rounded-xl bg-[#FFF0E6] border-2 border-[#FFC9A6]">
            <p className="text-[11px] text-[#E06A1B] font-semibold">Questões de fixação</p>
            <p className="font-display text-4xl text-[#4A2B3F]">{fixation.questions} questões</p>
            <p className="text-[13px] text-[#7C6673] mt-1">Agendada para amanhã (até 48 horas depois da aula). Se já fez, registre agora.</p>
          </div>

          {!fixationDone ? (
            <>
              <Button onClick={handleSaveFixation} disabled={saving} className="w-full h-12 bg-[#C23B6C] text-white text-[15px] font-semibold rounded-xl">
                {saving ? "Salvando..." : "Concluir fixação"}
              </Button>
              <button onClick={() => setFixationDone(true)} className="w-full text-center text-[13px] text-[#7C6673] py-2">
                Já fiz, registrar agora
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[13px] text-[#7C6673]">Feitas</span>
                  <Input type="number" inputMode="numeric" value={fixationFeitas} onChange={e => setFixationFeitas(e.target.value)} placeholder={String(fixation.questions)} className="h-12 text-center text-lg border-[#F1E4E9]" />
                </div>
                <div className="space-y-1">
                  <span className="text-[13px] text-[#7C6673]">Acertos</span>
                  <Input type="number" inputMode="numeric" value={fixationAcertos} onChange={e => setFixationAcertos(e.target.value)} placeholder="0" className="h-12 text-center text-lg border-[#F1E4E9]" />
                </div>
              </div>
              <Button onClick={handleSaveFixation} disabled={saving} className="w-full h-12 bg-[#C23B6C] text-white text-[15px] font-semibold rounded-xl">
                {saving ? "Salvando..." : "Concluir fixação"}
              </Button>
              <button onClick={() => setFixationDone(false)} className="w-full text-center text-[13px] text-[#7C6673] py-2">
                Voltar e editar
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── STEP 3: Revisões previstas ───
  if (step === 3) {
    const fixAcc = fixationFeitas && fixationAcertos
      ? Math.round((parseInt(fixationAcertos) / parseInt(fixationFeitas)) * 100)
      : null

    return (
      <div className="min-h-screen bg-[#FCF8F9]">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={handleCancel} className="text-[15px] text-[#7C6673]">Cancelar</button>
          <span className="font-display text-xl text-[#4A2B3F]">Revisões</span>
          <span className="text-[13px] text-[#7C6673]">3 de 3</span>
        </div>

        <div className="px-4 space-y-4 pt-2">
          {/* Summary card */}
          <div className="p-4 rounded-xl bg-white border border-[#F1E4E9]">
            <p className="text-[13px] text-[#7C6673]">{selectedLesson?.name}, fixação concluída</p>
            {fixAcc !== null && (
              <>
                <p className="font-display text-3xl text-[#4A2B3F]">
                  {fixAcc}% <span className="text-[15px] text-[#7C6673]">{fixationAcertos} de {fixationFeitas} acertos</span>
                </p>
                <Badge className={cn(
                  "mt-1 text-[11px]",
                  fixAcc >= 85 ? "bg-emerald-100 text-emerald-700" :
                  fixAcc >= 70 ? "bg-sky-100 text-sky-700" :
                  fixAcc >= 50 ? "bg-amber-100 text-amber-700" :
                  "bg-rose-100 text-rose-700"
                )}>
                  {fixAcc >= 85 ? "Domínio" : fixAcc >= 70 ? "Bom" : fixAcc >= 50 ? "Atenção" : "Rever teoria"}
                </Badge>
              </>
            )}
          </div>

          {/* Next review highlight */}
          {projectedReviews.length > 0 && !projectedReviews[0].isRF && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#FFEEF3] border border-[#FFC2D6]">
                <p className="text-[11px] text-[#D94E7F] font-semibold">Próxima revisão</p>
                <p className="font-display text-lg text-[#4A2B3F]">{projectedReviews[0].date.split("/").slice(0, 2).join("/")}</p>
                <p className="text-[10px] text-[#7C6673]">em {projectedReviews[0].interval} dias</p>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#F1E4E9]">
                <p className="text-[11px] text-[#7C6673]">Revisões previstas</p>
                <p className="font-display text-lg text-[#4A2B3F]">{projectedReviews.length}</p>
                <p className="text-[10px] text-[#7C6673]">até a SES-PE</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-0">
            <p className="text-[11px] font-semibold text-[#7C6673] uppercase tracking-wider pb-2">Linha do tempo</p>
            {projectedReviews.map((r, i) => (
              <div key={r.isRF ? "rf" : r.num} className={cn(
                "flex items-center gap-3 py-3",
                i < projectedReviews.length - 1 && "border-b border-[#F1E4E9]"
              )}>
                <AgendaBadge
                  type={r.isRF ? "guaranteed_review" : "review"}
                  reviewNumber={r.isRF ? null : r.num}
                />
                <div className="flex-1">
                  <p className="text-[13px] text-[#4A2B3F]">
                    {r.isRF ? "Reta final da SES-PE" : r.date}
                  </p>
                  <p className="text-[10px] text-[#7C6673]">
                    {r.isRF ? r.date : `+${r.interval} dias depois do anterior`}
                  </p>
                </div>
                <span className="text-[11px] text-[#7C6673]">{r.questions} questões</span>
              </div>
            ))}
            <div className="flex items-center gap-3 py-3 border-t border-[#F1E4E9]">
              <div className="w-7 h-7 rounded-lg bg-[#F1E4E9] flex items-center justify-center">
                <span className="text-[9px] font-bold text-[#7C6673]">FIM</span>
              </div>
              <p className="text-[13px] text-[#4A2B3F]">SES-PE (estimada)</p>
              <span className="text-[11px] text-[#7C6673] ml-auto">19/12/2027</span>
            </div>
          </div>

          <p className="text-[11px] text-[#7C6673] text-center">
            As datas se recalculam a cada revisão, conforme o seu acerto.
          </p>

          <Link href="/calendario">
            <Button className="w-full h-12 bg-[#C23B6C] text-white text-[15px] font-semibold rounded-xl">
              Ver no calendário
            </Button>
          </Link>
          <button onClick={handleCancel} className="w-full text-center text-[13px] text-[#7C6673] py-2 pb-6">
            Adicionar outro estudo
          </button>
        </div>
      </div>
    )
  }

  return null
}
