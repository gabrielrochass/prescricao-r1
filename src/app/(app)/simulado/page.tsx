"use client"

import { useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle2, ClipboardList, Calendar, AlertTriangle } from "lucide-react"
import type { Simulado, BigArea } from "@/lib/types"
import { getSimulados, recordSimuladoResults } from "@/lib/db/simulados"
import { cn } from "@/lib/utils"
import Link from "next/link"

const BIG_AREAS: { key: BigArea; short: string; color: string }[] = [
  { key: "Cl\u00ednica M\u00e9dica", short: "CM", color: "bg-blue-100 text-blue-700" },
  { key: "Cirurgia", short: "CIR", color: "bg-red-100 text-red-700" },
  { key: "Pediatria", short: "PED", color: "bg-green-100 text-green-700" },
  { key: "Ginecologia e Obstetr\u00edcia", short: "GO", color: "bg-purple-100 text-purple-700" },
  { key: "Medicina Preventiva", short: "PREV", color: "bg-amber-100 text-amber-700" },
]

const QUESTIONS_PER_AREA = 20
const TOTAL_QUESTIONS = QUESTIONS_PER_AREA * BIG_AREAS.length

type AreaScore = { correct: number; errors: number }

function makeEmptyScores(): Record<BigArea, AreaScore> {
  const initial: Record<string, AreaScore> = {}
  for (const area of BIG_AREAS) {
    initial[area.key] = { correct: 0, errors: 0 }
  }
  return initial as Record<BigArea, AreaScore>
}

export default function SimuladoPage() {
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState<Date | null>(null)

  // Form state
  const [selectedSimulado, setSelectedSimulado] = useState<Simulado | null>(null)
  const [scores, setScores] = useState<Record<BigArea, AreaScore>>(makeEmptyScores)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [savedTotal, setSavedTotal] = useState(0)

  useEffect(() => {
    const now = new Date()
    setToday(now)

    async function load() {
      try {
        const sims = await getSimulados()
        setSimulados(sims)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalCorrect = useMemo(
    () => BIG_AREAS.reduce((sum, a) => sum + scores[a.key].correct, 0),
    [scores]
  )

  const totalErrors = useMemo(
    () => BIG_AREAS.reduce((sum, a) => sum + scores[a.key].errors, 0),
    [scores]
  )

  const totalPct = TOTAL_QUESTIONS > 0 ? Math.round((totalCorrect / TOTAL_QUESTIONS) * 100) : 0

  function updateScore(area: BigArea, field: "correct" | "errors", value: string) {
    const num = Math.max(0, Math.min(QUESTIONS_PER_AREA, parseInt(value) || 0))
    setScores(prev => {
      const updated = { ...prev[area], [field]: num }
      // Auto-calculate the other field so correct + errors = 20
      if (field === "correct") {
        updated.errors = QUESTIONS_PER_AREA - num
      } else {
        updated.correct = QUESTIONS_PER_AREA - num
      }
      return { ...prev, [area]: updated }
    })
  }

  async function handleSave() {
    if (!selectedSimulado) return
    setSaving(true)

    try {
      const results = BIG_AREAS.map(a => ({
        big_area: a.key,
        errors: scores[a.key].errors,
        correct: scores[a.key].correct,
      }))

      await recordSimuladoResults(selectedSimulado.id, results)

      setSimulados(prev =>
        prev.map(s =>
          s.id === selectedSimulado.id
            ? { ...s, status: "done" as const, done_date: format(new Date(), "yyyy-MM-dd") }
            : s
        )
      )

      setSavedTotal(totalCorrect)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setSelectedSimulado(null)
        setScores(makeEmptyScores())
      }, 2000)
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

  if (success) {
    const pct = Math.round((savedTotal / TOTAL_QUESTIONS) * 100)
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-4">
        <div className="h-20 w-20 rounded-full bg-[var(--color-mr1-pink-bg)] flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-[var(--color-mr1-pink)]" />
        </div>
        <h2 className="font-display text-2xl text-[var(--color-mr1-text)]">Resultado salvo</h2>
        <p className="text-sm text-[var(--color-mr1-text2)]">
          {savedTotal} de {TOTAL_QUESTIONS} ({pct}%)
        </p>
      </div>
    )
  }

  const pendingSimulados = simulados.filter(s => s.status === "planned")
  const doneSimulados = simulados.filter(s => s.status === "done")

  // Form view: registrar resultado
  if (selectedSimulado) {
    return (
      <div className="px-4 pt-6 space-y-4 pb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedSimulado(null)} className="touch-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
          </button>
          <div>
            <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Resultado</h1>
            <p className="text-xs text-[var(--color-mr1-text2)]">
              Simulado de {format(new Date(selectedSimulado.planned_date + "T12:00:00"), "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Area sections */}
        {BIG_AREAS.map(area => {
          const score = scores[area.key]
          const areaPct = Math.round((score.correct / QUESTIONS_PER_AREA) * 100)

          return (
            <Card key={area.key} className="border-0 shadow-sm">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-[10px] px-1.5 py-0.5", area.color)}>
                      {area.short}
                    </Badge>
                    {area.key}
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    areaPct >= 70 ? "text-green-600" : areaPct >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {areaPct}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--color-mr1-text2)]">Acertos</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={QUESTIONS_PER_AREA}
                      value={score.correct || ""}
                      onChange={e => updateScore(area.key, "correct", e.target.value)}
                      placeholder="0"
                      className="border-[var(--color-mr1-lines)] text-center text-lg font-semibold h-12"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--color-mr1-text2)]">Erros</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={QUESTIONS_PER_AREA}
                      value={score.errors || ""}
                      onChange={e => updateScore(area.key, "errors", e.target.value)}
                      placeholder="0"
                      className="border-[var(--color-mr1-lines)] text-center text-lg font-semibold h-12"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[var(--color-mr1-text2)] text-center mt-1">
                  Total: {score.correct + score.errors} de {QUESTIONS_PER_AREA}
                </p>
              </CardContent>
            </Card>
          )
        })}

        {/* Total score */}
        <Card className={cn(
          "border-0 shadow-sm",
          totalPct >= 70 ? "bg-green-50" : totalPct >= 50 ? "bg-[var(--color-mr1-butter)]" : "bg-red-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-mr1-text)]">Nota total</p>
                <p className="text-xs text-[var(--color-mr1-text2)]">
                  {totalCorrect} acertos, {totalErrors} erros
                </p>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-display text-3xl",
                  totalPct >= 70 ? "text-green-600" : totalPct >= 50 ? "text-amber-600" : "text-red-600"
                )}>
                  {totalPct}%
                </p>
                <p className="text-[10px] text-[var(--color-mr1-text2)]">
                  {totalCorrect}/{TOTAL_QUESTIONS}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 text-base font-semibold bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white"
        >
          {saving ? "Salvando..." : "Salvar resultado"}
        </Button>
      </div>
    )
  }

  // List view
  return (
    <div className="px-4 pt-6 space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/hoje" className="touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </Link>
        <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Simulados</h1>
      </div>

      {/* Pending simulados */}
      {pendingSimulados.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[var(--color-mr1-action)]" />
              Pr\u00f3ximos simulados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {pendingSimulados.map(sim => (
              <div
                key={sim.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-mr1-bg)]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-mr1-text)]">
                    {format(new Date(sim.planned_date + "T12:00:00"), "d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className="text-[9px] px-1.5 py-0 bg-[var(--color-mr1-pink-bg)] text-[var(--color-mr1-pink)]">
                      {sim.type === "final_stretch" ? "Reta final" : "Regular"}
                    </Badge>
                  </div>
                </div>
                <Button
                  onClick={() => setSelectedSimulado(sim)}
                  className="h-10 px-4 text-sm font-semibold bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white"
                >
                  <ClipboardList className="h-4 w-4 mr-1.5" />
                  Registrar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Done simulados */}
      {doneSimulados.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--color-mr1-orange)]" />
              Realizados ({doneSimulados.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {doneSimulados.map(sim => {
              const total = sim.area_results?.reduce((s, r) => s + r.correct, 0) ?? 0
              const pct = sim.area_results ? Math.round((total / TOTAL_QUESTIONS) * 100) : 0

              return (
                <div
                  key={sim.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-mr1-bg)]"
                >
                  <div>
                    <p className="text-sm font-medium text-[var(--color-mr1-text)]">
                      {format(new Date(sim.planned_date + "T12:00:00"), "d 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-[10px] text-[var(--color-mr1-text2)]">
                      {total} acertos de {TOTAL_QUESTIONS}
                    </p>
                  </div>
                  <span className={cn(
                    "font-display text-2xl",
                    pct >= 70 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {simulados.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-16 w-16 rounded-full bg-[var(--color-mr1-pink-bg)] flex items-center justify-center">
            <ClipboardList className="h-8 w-8 text-[var(--color-mr1-pink)]" />
          </div>
          <p className="text-sm text-[var(--color-mr1-text2)]">Nenhum simulado agendado</p>
          <p className="text-xs text-[var(--color-mr1-text2)] text-center max-w-[240px]">
            Simulados s\u00e3o criados automaticamente pelo motor de agendamento
          </p>
        </div>
      )}

      {/* Tip */}
      {simulados.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--color-mr1-butter)]">
          <AlertTriangle className="h-4 w-4 text-[var(--color-mr1-orange)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--color-mr1-text2)]">
            Cada simulado tem 100 quest\u00f5es: 20 por grande \u00e1rea (CM, CIR, PED, GO, PREV). Registre o resultado ap\u00f3s corrigir.
          </p>
        </div>
      )}
    </div>
  )
}
