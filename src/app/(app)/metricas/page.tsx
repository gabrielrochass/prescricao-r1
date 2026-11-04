"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react"
import { DonutChart } from "@/components/mr1/donut-chart"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import type { Simulado, BigArea } from "@/lib/types"
import { getCompletedSimulados } from "@/lib/db/simulados"
import { getSubjectCount } from "@/lib/db/subjects"
import { getAgendaStats } from "@/lib/db/agenda"
import { cn } from "@/lib/utils"

const BIG_AREAS: BigArea[] = ["Clínica Médica", "Cirurgia", "Pediatria", "Ginecologia e Obstetrícia", "Medicina Preventiva"]
const AREA_SHORT: Record<BigArea, string> = {
  "Clínica Médica": "CM",
  "Cirurgia": "CIR",
  "Pediatria": "PED",
  "Ginecologia e Obstetrícia": "GO",
  "Medicina Preventiva": "PREV",
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

  // Cronograma progress
  const cronogramaPct = Math.round((subjectCount / 112) * 100)

  // Latest simulado
  const latestSim = simulados.length > 0 ? simulados[simulados.length - 1] : null
  const firstSim = simulados.length > 0 ? simulados[0] : null

  // Simulado total accuracy
  const latestTotal = latestSim?.area_results?.reduce((s, r) => s + r.correct, 0) ?? 0
  const latestPct = latestSim?.area_results ? Math.round((latestTotal / 100) * 100) : 0

  const firstTotal = firstSim?.area_results?.reduce((s, r) => s + r.correct, 0) ?? 0
  const firstPct = firstSim?.area_results ? Math.round((firstTotal / 100) * 100) : 0

  const trend = simulados.length >= 2
    ? latestPct > firstPct ? "improving" : latestPct < firstPct ? "declining" : "stable"
    : "stable"

  // Area accuracy from latest simulado
  const areaData = BIG_AREAS.map(area => {
    const result = latestSim?.area_results?.find(r => r.big_area === area)
    const firstResult = firstSim?.area_results?.find(r => r.big_area === area)
    return {
      area,
      short: AREA_SHORT[area],
      accuracy: result ? Math.round((result.correct / 20) * 100) : 0,
      firstAccuracy: firstResult ? Math.round((firstResult.correct / 20) * 100) : 0,
      gain: result && firstResult ? result.correct - firstResult.correct : 0,
    }
  })

  // Bar chart data for area progress
  const progressBarData = [...areaData].sort((a, b) => b.gain - a.gain)

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Métricas</h1>

      {/* Cronograma donut */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center gap-5">
          <DonutChart
            value={cronogramaPct}
            size={90}
            strokeWidth={8}
            color="var(--color-mr1-orange)"
            label={`${cronogramaPct}%`}
            sublabel="concluído"
          />
          <div>
            <p className="font-display text-xl text-[var(--color-mr1-text)]">Cronograma</p>
            <p className="text-sm text-[var(--color-mr1-text2)]">{subjectCount} de 112 aulas</p>
            <p className="text-xs text-[var(--color-mr1-text2)] mt-1">
              {stats.totalDone} itens feitos · {stats.totalLate} atrasados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Simulado donut */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex items-center gap-5">
          <DonutChart
            value={latestPct}
            size={90}
            strokeWidth={8}
            color="var(--color-mr1-pink)"
            label={latestSim ? `${latestPct}%` : "—"}
            sublabel={latestSim ? "último" : "sem dados"}
          />
          <div>
            <p className="font-display text-xl text-[var(--color-mr1-text)]">Simulados</p>
            <p className="text-sm text-[var(--color-mr1-text2)]">{simulados.length} realizados</p>
            {simulados.length >= 2 && (
              <div className="flex items-center gap-1 mt-1">
                {trend === "improving" && <TrendingUp className="h-3.5 w-3.5 text-green-600" />}
                {trend === "declining" && <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
                {trend === "stable" && <Minus className="h-3.5 w-3.5 text-[var(--color-mr1-text2)]" />}
                <span className="text-xs text-[var(--color-mr1-text2)]">
                  {trend === "improving" ? "Melhorando" : trend === "declining" ? "Piorando" : "Estável"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accuracy by area — 5 small donuts */}
      {latestSim && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)]">
              Acerto por área (último simulado)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex justify-between">
              {areaData.map(a => (
                <div key={a.area} className="flex flex-col items-center gap-1">
                  <DonutChart
                    value={a.accuracy}
                    size={52}
                    strokeWidth={5}
                    color="var(--color-mr1-pink)"
                    label={`${a.accuracy}`}
                  />
                  <span className="text-[9px] font-semibold text-[var(--color-mr1-text2)]">{a.short}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Area progress bars */}
      {simulados.length >= 2 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-1 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)]">
              Quanto cada área avançou
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={progressBarData} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-mr1-lines)" />
                <XAxis type="number" tick={{ fontSize: 9, fill: "var(--color-mr1-text2)" }} />
                <YAxis dataKey="short" type="category" tick={{ fontSize: 10, fill: "var(--color-mr1-text2)" }} width={40} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                  formatter={(v) => [`${Number(v) > 0 ? "+" : ""}${v} acertos`, "Ganho"]}
                />
                <Bar dataKey="gain" radius={[0, 4, 4, 0]} fill="var(--color-mr1-pink)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Reference: GO cutoff */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-mr1-butter)]">
        <Info className="h-4 w-4 text-[var(--color-mr1-text2)] shrink-0" />
        <p className="text-xs text-[var(--color-mr1-text2)]">
          Nota de corte GO na SES-PE: 64,3 em 2026 (inclui currículo, não só acerto)
        </p>
      </div>
    </div>
  )
}
