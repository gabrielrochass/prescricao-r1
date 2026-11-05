"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import type { Rotation } from "@/lib/types"
import { getRotations, createRotation, deleteRotation } from "@/lib/db/rotations"
import { cn } from "@/lib/utils"
import Link from "next/link"

const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export default function RotacoesPage() {
  const [rotations, setRotations] = useState<Rotation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Form
  const [name, setName] = useState("")
  const [weekdayHours, setWeekdayHours] = useState("2")
  const [weekendHours, setWeekendHours] = useState("4")
  const [shifts, setShifts] = useState("0")
  const [topicDays, setTopicDays] = useState<number[]>([1, 3, 5])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const r = await getRotations()
        setRotations(r)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function toggleDay(day: number) {
    if (topicDays.includes(day)) {
      setTopicDays(topicDays.filter(d => d !== day))
    } else if (topicDays.length < 3) {
      setTopicDays([...topicDays, day].sort())
    }
  }

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const r = await createRotation({
        name: name.trim(),
        weekday_hours: parseFloat(weekdayHours) || 2,
        weekend_hours: parseFloat(weekendHours) || 4,
        shifts_per_week: parseInt(shifts) || 0,
        new_topic_days: topicDays,
      })
      setRotations(prev => [...prev, r])
      setShowForm(false)
      setName("")
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRotation(id)
      setRotations(prev => prev.filter(r => r.id !== id))
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
      <div className="flex items-center gap-3">
        <Link href="/mais" className="p-2 hover:bg-[var(--color-mr1-lines)] rounded-lg touch-target">
          <ArrowLeft className="h-5 w-5 text-[var(--color-mr1-text2)]" />
        </Link>
        <h1 className="font-display text-2xl text-[var(--color-mr1-text)]">Rodízios</h1>
      </div>

      {/* Existing rotations */}
      {rotations.map(rotation => (
        <Card key={rotation.id} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-mr1-text)]">{rotation.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-mr1-text2)]">
                  <span>Sem: {rotation.weekday_hours}h</span>
                  <span>FDS: {rotation.weekend_hours}h</span>
                  <span>Plantões: {rotation.shifts_per_week}/sem</span>
                </div>
                <div className="flex gap-1 mt-2">
                  {WEEKDAY_NAMES.map((day, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full",
                        rotation.new_topic_days.includes(i)
                          ? "bg-[var(--color-mr1-orange-bg)] text-[var(--color-mr1-orange)] font-semibold"
                          : "bg-[var(--color-mr1-lines)] text-[var(--color-mr1-text2)]"
                      )}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => handleDelete(rotation.id)} className="p-2 hover:bg-red-50 rounded-lg touch-target active:bg-red-100">
                <Trash2 className="h-4 w-4 text-[var(--color-mr1-text2)]" />
              </button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add form */}
      {showForm ? (
        <Card className="border-0 shadow-sm border-l-4 border-l-[var(--color-mr1-action)]">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-[var(--color-mr1-text)]">Novo rodízio</p>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-mr1-text2)]">Nome</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Clínica Médica"
                className="border-[var(--color-mr1-lines)]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-[var(--color-mr1-text2)]">Horas/dia útil</Label>
                <Input type="number" value={weekdayHours} onChange={e => setWeekdayHours(e.target.value)} className="border-[var(--color-mr1-lines)]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--color-mr1-text2)]">Horas/FDS</Label>
                <Input type="number" value={weekendHours} onChange={e => setWeekendHours(e.target.value)} className="border-[var(--color-mr1-lines)]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-[var(--color-mr1-text2)]">Plantões/sem</Label>
                <Input type="number" value={shifts} onChange={e => setShifts(e.target.value)} className="border-[var(--color-mr1-lines)]" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-[var(--color-mr1-text2)]">Dias de tema novo (até 3)</Label>
              <div className="flex gap-1.5">
                {WEEKDAY_NAMES.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => toggleDay(i)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-medium transition-all touch-target active:scale-95",
                      topicDays.includes(i)
                        ? "bg-[var(--color-mr1-action)] text-white"
                        : "bg-[var(--color-mr1-lines)] text-[var(--color-mr1-text2)]"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {topicDays.length >= 3 && (
                <p className="text-[10px] text-[var(--color-mr1-orange)]">Máximo de 3 dias atingido</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 border-[var(--color-mr1-lines)]">
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={saving || !name.trim()} className="flex-1 bg-[var(--color-mr1-action)] text-white">
                {saving ? <><span className="mr1-spinner" /> Salvando...</> : "Criar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full border-dashed border-[var(--color-mr1-lines)] text-[var(--color-mr1-text2)] hover:text-[var(--color-mr1-action)]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar rodízio
        </Button>
      )}
    </div>
  )
}
