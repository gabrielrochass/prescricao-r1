"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Settings, User, Target, Bell, BookOpen } from "lucide-react"
import type { UserSettings, ProgressionConfig, TargetExam } from "@/lib/types"
import { getUserSettings, updateUserSettings, getProgressionConfig, updateProgressionConfig, getTargetExams } from "@/lib/queries"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function ConfigPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [config, setConfig] = useState<ProgressionConfig | null>(null)
  const [exams, setExams] = useState<TargetExam[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Local form state
  const [userName, setUserName] = useState("")
  const [dailyLimit, setDailyLimit] = useState("")
  const [initialQuestions, setInitialQuestions] = useState("")
  const [targetQuestions, setTargetQuestions] = useState("")
  const [weeklyIncrement, setWeeklyIncrement] = useState("")
  const [minAccuracy, setMinAccuracy] = useState("")
  const [notificationTime, setNotificationTime] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const [s, c, e] = await Promise.all([
          getUserSettings(),
          getProgressionConfig(),
          getTargetExams(),
        ])
        setSettings(s)
        setConfig(c)
        setExams(e)

        if (s) {
          setUserName(s.user_name)
          setDailyLimit(s.daily_question_limit.toString())
          setNotificationTime(s.notification_time)
        }
        if (c) {
          setInitialQuestions(c.initial_daily_questions.toString())
          setTargetQuestions(c.target_daily_questions.toString())
          setWeeklyIncrement(c.weekly_increment_pct.toString())
          setMinAccuracy(c.min_accuracy_to_progress.toString())
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await Promise.all([
        updateUserSettings({
          user_name: userName,
          daily_question_limit: parseInt(dailyLimit) || 250,
          notification_time: notificationTime,
        }),
        updateProgressionConfig({
          initial_daily_questions: parseInt(initialQuestions) || 15,
          target_daily_questions: parseInt(targetQuestions) || 100,
          weekly_increment_pct: parseFloat(weeklyIncrement) || 12,
          min_accuracy_to_progress: parseFloat(minAccuracy) || 65,
        }),
      ])
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 space-y-4 pb-8">
      <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>

      {/* Profile */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-500" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Seu nome</Label>
            <Input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Como quer ser chamada?"
              className="border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Progression */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" />
            Progressão
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Questões iniciais/dia</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={initialQuestions}
                onChange={(e) => setInitialQuestions(e.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Meta final/dia</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={targetQuestions}
                onChange={(e) => setTargetQuestions(e.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Incremento semanal (%)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={weeklyIncrement}
                onChange={(e) => setWeeklyIncrement(e.target.value)}
                className="border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Accuracy mínima (%)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={minAccuracy}
                onChange={(e) => setMinAccuracy(e.target.value)}
                className="border-slate-200"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Limite diário de questões</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-500" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Horário do lembrete</Label>
            <Input
              type="time"
              value={notificationTime}
              onChange={(e) => setNotificationTime(e.target.value)}
              className="border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Target Exams */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            Provas-Alvo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {exams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <div>
                <p className="text-sm font-medium">{exam.name}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(exam.exam_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <Badge variant={exam.priority === "primary" ? "default" : "outline"} className="text-[10px]">
                {exam.priority === "primary" ? "Principal" : "Secundária"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700"
      >
        {saved ? "Salvo ✓" : saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  )
}
