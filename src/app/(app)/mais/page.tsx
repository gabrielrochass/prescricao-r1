"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, User, FileDown, BookOpen, Scale, ChevronRight, CheckCircle2 } from "lucide-react"
import type { User as UserType, Exam } from "@/lib/types"
import { getUser, updateUser } from "@/lib/db/users"
import { getExams } from "@/lib/db/exams"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function MaisPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  const [displayName, setDisplayName] = useState("")
  const [morningTime, setMorningTime] = useState("")
  const [eveningTime, setEveningTime] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const [u, e] = await Promise.all([getUser(), getExams()])
        setUser(u)
        setExams(e)
        setDisplayName(u.display_name)
        setMorningTime(u.notification_morning)
        setEveningTime(u.notification_evening)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    try {
      await updateUser({
        display_name: displayName,
        notification_morning: morningTime,
        notification_evening: eveningTime,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-[var(--color-mr1-text2)]">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 space-y-4 pb-8">
      <h1 className="font-display text-3xl text-[var(--color-mr1-text)]">Mais</h1>

      {/* Profile */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--color-mr1-pink-bg)] flex items-center justify-center">
              <User className="h-5 w-5 text-[var(--color-mr1-action)]" />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-[var(--color-mr1-text2)]">Nome</Label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="border-[var(--color-mr1-lines)] mt-1"
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--color-mr1-text2)]">Especialidade</p>
            <p className="text-sm font-medium text-[var(--color-mr1-text)]">{user?.specialty}</p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--color-mr1-action)]" />
            <span className="text-sm font-semibold text-[var(--color-mr1-text)]">Notificações</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-mr1-text2)]">Manhã</Label>
              <Input
                type="time"
                value={morningTime}
                onChange={e => setMorningTime(e.target.value)}
                className="border-[var(--color-mr1-lines)]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-mr1-text2)]">Noite</Label>
              <Input
                type="time"
                value={eveningTime}
                onChange={e => setEveningTime(e.target.value)}
                className="border-[var(--color-mr1-lines)]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exams */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--color-mr1-action)]" />
            <span className="text-sm font-semibold text-[var(--color-mr1-text)]">Provas-alvo</span>
          </div>
          {exams.map(exam => (
            <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-mr1-bg)]">
              <div>
                <p className="text-sm font-medium text-[var(--color-mr1-text)]">{exam.name}</p>
                <p className="text-xs text-[var(--color-mr1-text2)]">
                  {format(new Date(exam.exam_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {exam.estimated && " (estimada)"}
                </p>
              </div>
              {exam.reference_cutoff && (
                <Badge variant="outline" className="text-[10px] border-[var(--color-mr1-lines)]">
                  Corte: {exam.reference_cutoff}
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Review rules link */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-[var(--color-mr1-action)]" />
              <span className="text-sm font-semibold text-[var(--color-mr1-text)]">Regras de revisão</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[var(--color-mr1-text2)]" />
          </div>
          <p className="text-xs text-[var(--color-mr1-text2)] mt-1">
            Escada de revisão, faixas de acerto, simulados, reta final
          </p>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <FileDown className="h-4 w-4 text-[var(--color-mr1-action)]" />
            <span className="text-sm font-semibold text-[var(--color-mr1-text)]">Exportar backup</span>
          </div>
          <p className="text-xs text-[var(--color-mr1-text2)] mt-1">
            Exporta estudos, revisões e simulados em planilha
          </p>
        </CardContent>
      </Card>

      {/* Save button */}
      <Button
        onClick={handleSave}
        className="w-full h-12 text-base font-semibold bg-[var(--color-mr1-action)] hover:bg-[var(--color-mr1-action)]/90 text-white"
      >
        {saved ? (
          <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Salvo</span>
        ) : "Salvar"}
      </Button>
    </div>
  )
}
