"use client"

import { useEffect, useState } from "react"
import { Info } from "lucide-react"
import { DonutChart } from "@/components/mr1/donut-chart"
import type { Simulado, BigArea } from "@/lib/types"
import { getCompletedSimulados } from "@/lib/db/simulados"
import { getSubjectCount } from "@/lib/db/subjects"
import { getAgendaStats } from "@/lib/db/agenda"
import Link from "next/link"

const BIG_AREAS: BigArea[] = [
  "Clínica Médica",
  "Cirurgia",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Medicina Preventiva",
]

const AREA_SHORT: Record<BigArea, string> = {
  "Clínica Médica": "Clínica",
  "Cirurgia": "Cirurgia",
  "Pediatria": "Pediatria",
  "Ginecologia e Obstetrícia": "GO",
  "Medicina Preventiva": "Preventiva",
}

const AREA_BAR_LABEL: Record<BigArea, string> = {
  "Clínica Médica": "Clínica",
  "Cirurgia": "Cirurgia",
  "Pediatria": "Pediatria",
  "Ginecologia e Obstetrícia": "GO",
  "Medicina Preventiva": "Preventiva",
}

const TOTAL_AULAS = 112

function InfoButton() {
  return (
    <button
      className="flex items-center justify-center w-5 h-5 rounded-full border border-[var(--color-mr1-text2)] opacity-40 hover:opacity-70 transition-opacity"
      aria-label="Informações"
    >
      <Info className="h-3 w-3 text-[var(--color-mr1-text2)]" />
    </button>
  )
}

export default function MetricasPage() {
  const [simulados, setSimulados] = useState<Simulado[]>([])
  const [subjectCount, setSubjectCount] = useState(0)
  const [stats, setStats] = useState({ totalPlanned: 0, totalDone: 0, totalLate: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sims, count, st] = await Promise.all([
          getCompletedSimulados(),
          getSubjectCount(),
          getAgendaStats(),
        ])
        setSimulados(sims)
        setSubjectCount(count)
        setStats(st)
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
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  // --- Cronograma ---
  const cronogramaPct = subjectCount > 0
    ? Math.round((subjectCount / TOTAL_AULAS) * 100)
    : 0

  const behindLabel = stats.totalLate > 0
    ? `${stats.totalLate} ${stats.totalLate === 1 ? "ponto" : "pontos"} atrás do plano`
    : "No ritmo do plano"

  // --- Simulados ---
  const latestSim = simulados.length > 0 ? simulados[simulados.length - 1] : null
  const firstSim = simulados.length > 0 ? simulados[0] : null

  const simPct = (sim: Simulado | null) => {
    if (!sim?.area_results) return 0
    const total = sim.area_results.reduce((s, r) => s + r.correct, 0)
    return Math.round((total / 100) * 100)
  }

  const latestPct = simPct(latestSim)
  const firstPct = simPct(firstSim)
  const totalGain = latestPct - firstPct

  const trendLabel =
    simulados.length >= 2
      ? totalGain > 0
        ? "Melhorando"
        : totalGain < 0
          ? "Piorando"
          : "Estável"
      : "Sem comparação"

  const trendSublabel =
    simulados.length >= 2 && totalGain !== 0
      ? `${totalGain > 0 ? "+" : ""}${totalGain} pontos desde o 1\u00BA`
      : ""

  // Simulado trend bar data
  const simTrendData = simulados.map((sim, i) => {
    const pct = simPct(sim)
    const prevPct = i > 0 ? simPct(simulados[i - 1]) : 0
    const delta = i > 0 ? pct - prevPct : 0
    return {
      label: `${i + 1}\u00BA`,
      pct,
      delta,
      deltaLabel: i > 0 ? `+${delta}` : "",
    }
  })

  // Area accuracy per simulado
  const areaData = BIG_AREAS.map((area) => {
    const latestResult = latestSim?.area_results?.find((r) => r.big_area === area)
    const firstResult = firstSim?.area_results?.find((r) => r.big_area === area)
    const accuracy = latestResult ? Math.round((latestResult.correct / 20) * 100) : 0
    const firstAccuracy = firstResult ? Math.round((firstResult.correct / 20) * 100) : 0
    return {
      area,
      short: AREA_SHORT[area],
      barLabel: AREA_BAR_LABEL[area],
      accuracy,
      firstAccuracy,
      gainPontos: latestResult && firstResult ? latestResult.correct - firstResult.correct : 0,
    }
  })

  // Area progress sorted by gain descending
  const progressBarData = [...areaData].sort((a, b) => b.gainPontos - a.gainPontos)

  return (
    <div className="px-4 pt-6 space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Métricas</h1>
        <Link
          href="/simulado"
          className="px-4 py-2 text-sm font-medium rounded-full border border-[var(--color-mr1-action)] text-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-pink-bg)] transition-colors"
        >
          Novo simulado
        </Link>
      </div>

      {/* Cronograma Card */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-semibold text-[var(--color-mr1-text)]">Cronograma</span>
          <InfoButton />
        </div>
        <div className="flex items-center gap-5">
          <DonutChart
            value={cronogramaPct}
            size={90}
            strokeWidth={8}
            color="var(--color-mr1-orange)"
            label={`${cronogramaPct}%`}
            labelClassName="font-display text-xl text-[var(--color-mr1-text)]"
          />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-[var(--color-mr1-text)]">
              <span className="font-semibold">{subjectCount} de {TOTAL_AULAS}</span> aulas
            </p>
            <span
              className="inline-block text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ backgroundColor: "#FFF6D6", color: "#8B7B2A" }}
            >
              {behindLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Simulados Card */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex justify-between items-start mb-3">
          <span className="text-sm font-semibold text-[var(--color-mr1-text)]">Simulados</span>
          <InfoButton />
        </div>

        <div className="flex items-center gap-5">
          <DonutChart
            value={latestPct}
            size={90}
            strokeWidth={8}
            color="var(--color-mr1-pink)"
            label={latestSim ? `${latestPct}%` : "\u2014"}
            labelClassName="font-display text-xl text-[var(--color-mr1-text)]"
          />
          <div className="flex flex-col gap-0.5">
            <p className="text-base font-semibold text-[var(--color-mr1-text)]">
              {trendLabel}
            </p>
            {trendSublabel && (
              <p className="text-xs text-[var(--color-mr1-text2)]">{trendSublabel}</p>
            )}
          </div>
        </div>

        {/* Simulado trend horizontal bars */}
        {simulados.length > 0 && (
          <div className="mt-5 space-y-2">
            {simTrendData.map((d) => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-mr1-text2)] w-6 text-right font-medium">
                  {d.label}
                </span>
                <div className="flex-1 h-5 bg-[var(--color-mr1-lines)] rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${d.pct}%`,
                      backgroundColor: "var(--color-mr1-pink)",
                    }}
                  />
                  <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold"
                    style={{ color: d.pct > 50 ? "white" : "var(--color-mr1-text)" }}
                  >
                    {d.pct}%
                  </span>
                </div>
                {d.deltaLabel && (
                  <span className="text-[10px] font-semibold text-[var(--color-mr1-pink)] w-7">
                    {d.deltaLabel}
                  </span>
                )}
                {!d.deltaLabel && <span className="w-7" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acerto por area */}
      {latestSim && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-semibold text-[var(--color-mr1-text)] mb-4">
            Acerto por área
          </p>
          <div className="flex justify-between">
            {areaData.map((a) => (
              <div key={a.area} className="flex flex-col items-center gap-1">
                <DonutChart
                  value={a.accuracy}
                  size={52}
                  strokeWidth={5}
                  color="var(--color-mr1-pink)"
                  label={`${a.accuracy}%`}
                  labelClassName="font-display text-[11px] text-[var(--color-mr1-text)]"
                />
                <span className="text-[10px] font-semibold text-[var(--color-mr1-text2)]">
                  {a.short}
                </span>
                {simulados.length >= 2 && (
                  <span className="text-[9px] text-[var(--color-mr1-pink)] font-medium">
                    {a.gainPontos >= 0 ? "+" : ""}{a.gainPontos} {a.gainPontos === 1 ? "ponto" : "pontos"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quanto cada area avancou */}
      {simulados.length >= 2 && (
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <p className="text-sm font-semibold text-[var(--color-mr1-text)] mb-3">
            Quanto cada área avançou
          </p>
          <div className="space-y-2.5">
            {progressBarData.map((a) => {
              const maxGain = progressBarData[0]?.gainPontos || 1
              const barWidth = maxGain > 0 ? Math.max(8, (a.gainPontos / maxGain) * 100) : 8
              return (
                <div key={a.area} className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-mr1-text2)] w-16 text-right font-medium truncate">
                    {a.barLabel}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-5 rounded-full transition-all duration-500"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: "var(--color-mr1-pink)",
                      }}
                    />
                    <span className="text-xs font-semibold text-[var(--color-mr1-pink)]">
                      {a.gainPontos >= 0 ? "+" : ""}{a.gainPontos}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-xs text-[var(--color-mr1-text2)] opacity-60">
        Números de exemplo.
      </p>
    </div>
  )
}
