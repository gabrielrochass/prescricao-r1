"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Info } from "lucide-react"
import Link from "next/link"

const ACCURACY_BANDS = [
  { label: "Domínio", range: "85% ou mais", color: "bg-emerald-100 text-emerald-700", afterFix: "7 dias", afterReview: "intervalo × fator", questions: 10 },
  { label: "Bom", range: "70% a 84%", color: "bg-blue-100 text-blue-700", afterFix: "4 dias", afterReview: "intervalo × 1,5", questions: 10 },
  { label: "Atenção", range: "50% a 69%", color: "bg-amber-100 text-amber-700", afterFix: "2 dias", afterReview: "intervalo pela metade (mín 2d)", questions: 15 },
  { label: "Rever teoria", range: "abaixo de 50%", color: "bg-red-100 text-red-700", afterFix: "1 dia", afterReview: "volta ao início", questions: 20 },
]

const EFFORT_TABLE = [
  { effort: 1, label: "Muito fácil", questions: 10, factor: "×3" },
  { effort: 2, label: "Fácil", questions: 12, factor: "×2,75" },
  { effort: 3, label: "Médio", questions: 15, factor: "×2,5" },
  { effort: 4, label: "Difícil", questions: 20, factor: "×2,25" },
  { effort: 5, label: "Muito difícil", questions: 25, factor: "×2" },
]

export default function RegrasPage() {
  return (
    <div className="px-4 pt-6 space-y-4 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/mais" className="p-2 hover:bg-[var(--color-mr1-lines)] rounded-lg touch-target">
          <ArrowLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </Link>
        <h1 className="font-display text-2xl text-[var(--color-mr1-text)]">Regras de revisão</h1>
      </div>

      {/* Escada */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)]">
            Escada de revisão
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-xs text-[var(--color-mr1-text2)]">
            Cada assunto tem até 6 revisões na escada. O próximo intervalo depende do acerto.
          </p>
          {ACCURACY_BANDS.map(band => (
            <div key={band.label} className="p-3 rounded-xl bg-[var(--color-mr1-bg)] space-y-1">
              <div className="flex items-center gap-2">
                <Badge className={band.color}>{band.label}</Badge>
                <span className="text-xs text-[var(--color-mr1-text2)]">{band.range}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--color-mr1-text2)]">
                <div>Após fixação: <span className="font-medium text-[var(--color-mr1-text)]">{band.afterFix}</span></div>
                <div>Após revisão: <span className="font-medium text-[var(--color-mr1-text)]">{band.afterReview}</span></div>
                <div>Questões: <span className="font-medium text-[var(--color-mr1-text)]">{band.questions}</span></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Esforço */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)]">
            Fixação pelo esforço
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="space-y-2">
            {EFFORT_TABLE.map(row => (
              <div key={row.effort} className="flex items-center justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-mr1-action)] text-white text-xs flex items-center justify-center font-semibold">
                    {row.effort}
                  </span>
                  <span className="text-xs text-[var(--color-mr1-text)]">{row.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[var(--color-mr1-text2)]">
                  <span>{row.questions}q</span>
                  <span className="font-medium text-[var(--color-mr1-text)]">{row.factor}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 mt-3 p-2 rounded-lg bg-[var(--color-mr1-butter)]">
            <Info className="h-3.5 w-3.5 text-[var(--color-mr1-text2)] mt-0.5 shrink-0" />
            <p className="text-[10px] text-[var(--color-mr1-text2)]">
              Incidência ajusta: alta +5 questões, média +0, baixa −3 (mínimo 8)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Limites */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)]">
            Limites e tetos
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <div className="grid grid-cols-1 gap-2 text-xs">
            <div className="flex justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
              <span className="text-[var(--color-mr1-text2)]">Máximo de revisões por assunto</span>
              <span className="font-semibold text-[var(--color-mr1-text)]">6 da escada + 1 garantida</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
              <span className="text-[var(--color-mr1-text2)]">Teto de intervalo (alta incidência)</span>
              <span className="font-semibold text-[var(--color-mr1-text)]">60 dias</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
              <span className="text-[var(--color-mr1-text2)]">Teto de intervalo (média)</span>
              <span className="font-semibold text-[var(--color-mr1-text)]">90 dias</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
              <span className="text-[var(--color-mr1-text2)]">Teto de intervalo (baixa)</span>
              <span className="font-semibold text-[var(--color-mr1-text)]">120 dias</span>
            </div>
            <div className="flex justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
              <span className="text-[var(--color-mr1-text2)]">Limite diário</span>
              <span className="font-semibold text-[var(--color-mr1-text)]">30 → 80 (+5/mês)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simulados */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)]">
            Simulados
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2 text-xs">
          <div className="flex justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
            <span className="text-[var(--color-mr1-text2)]">Até abril 2027</span>
            <span className="font-semibold text-[var(--color-mr1-text)]">1 por mês (4º domingo)</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
            <span className="text-[var(--color-mr1-text2)]">Maio a novembro 2027</span>
            <span className="font-semibold text-[var(--color-mr1-text)]">2 por mês (2º e 4º dom)</span>
          </div>
          <div className="flex justify-between p-2 rounded-lg bg-[var(--color-mr1-bg)]">
            <span className="text-[var(--color-mr1-text2)]">Reta final (nov-dez 2027)</span>
            <span className="font-semibold text-[var(--color-mr1-text)]">1 por semana (todo dom)</span>
          </div>
          <div className="flex items-start gap-2 mt-2 p-2 rounded-lg bg-[var(--color-mr1-butter)]">
            <Info className="h-3.5 w-3.5 text-[var(--color-mr1-text2)] mt-0.5 shrink-0" />
            <p className="text-[10px] text-[var(--color-mr1-text2)]">
              Correção no dia seguinte. Registro por grande área, 20 questões cada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Reta final */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold text-[var(--color-mr1-text)]">
            Reta final (6 semanas)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 text-xs text-[var(--color-mr1-text2)] space-y-1">
          <p>De 07/11/2027 até a SES-PE em 19/12/2027.</p>
          <p>Todo assunto recebe uma revisão garantida (RF), fora das 6 da escada.</p>
          <p>Sem aula nova. Só revisão e simulados.</p>
          <p>O ENAMED não tem reta final própria — segue só a escada.</p>
        </CardContent>
      </Card>
    </div>
  )
}
