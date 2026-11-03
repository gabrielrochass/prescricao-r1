"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, BookOpen, FileText, GraduationCap, Layers, Target, TrendingUp } from "lucide-react"
import type { Subject } from "@/lib/types"
import { getSubjectsTree, createStudyEntry } from "@/lib/queries"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type StudyType = "questions" | "theory" | "flashcards" | "simulado"

const studyTypes: { value: StudyType; label: string; icon: LucideIcon }[] = [
  { value: "questions", label: "Questões", icon: FileText },
  { value: "theory", label: "Teoria", icon: GraduationCap },
  { value: "flashcards", label: "Flashcards", icon: Layers },
  { value: "simulado", label: "Simulado", icon: Target },
]

export default function RegistrarPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  // Form state
  const [selectedSubject, setSelectedSubject] = useState<string>("")
  const [expandedParent, setExpandedParent] = useState<string>("")
  const [studyType, setStudyType] = useState<StudyType>("questions")
  const [totalQuestions, setTotalQuestions] = useState("")
  const [correctQuestions, setCorrectQuestions] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const tree = await getSubjectsTree()
        setSubjects(tree)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSubject) return

    setSaving(true)
    try {
      await createStudyEntry({
        subject_id: selectedSubject,
        date: format(new Date(), "yyyy-MM-dd"),
        study_type: studyType,
        total_questions: totalQuestions ? parseInt(totalQuestions) : null,
        correct_questions: correctQuestions ? parseInt(correctQuestions) : null,
        notes: notes || null,
      })

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setSelectedSubject("")
        setTotalQuestions("")
        setCorrectQuestions("")
        setNotes("")
      }, 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const accuracy = totalQuestions && correctQuestions
    ? Math.round((parseInt(correctQuestions) / parseInt(totalQuestions)) * 100)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-slate-400 dark:text-slate-500">Carregando...</div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 px-4">
        <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Registrado!</h2>
        {accuracy !== null && (
          <p className="text-slate-500 dark:text-slate-400">
            Accuracy: <span className={cn("font-bold", accuracy >= 70 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>{accuracy}%</span>
          </p>
        )}
        <p className="text-sm text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          Continue assim <TrendingUp className="h-4 w-4" />
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Registrar Estudo</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">O que você estudou hoje?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Study Type */}
        <div className="grid grid-cols-4 gap-2">
          {studyTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setStudyType(type.value)}
              className={cn(
                "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                studyType === type.value
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300"
              )}
            >
              <type.icon className={cn("h-5 w-5", studyType === type.value ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400 dark:text-slate-500")} />
              <span className="text-[10px] font-medium">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Subject Selection */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Tema
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1 max-h-64 overflow-y-auto">
            {subjects.map((parent) => (
              <div key={parent.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (parent.children?.length) {
                      setExpandedParent(expandedParent === parent.id ? "" : parent.id)
                    } else {
                      setSelectedSubject(parent.id)
                    }
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    selectedSubject === parent.id
                      ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: parent.color }} />
                    {parent.name}
                    {parent.children?.length ? (
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                        {expandedParent === parent.id ? "▼" : "▶"}
                      </span>
                    ) : null}
                  </div>
                </button>

                {expandedParent === parent.id && parent.children?.map((child) => (
                  <div key={child.id} className="ml-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (child.children?.length) {
                          setSelectedSubject("")
                          setExpandedParent(expandedParent === child.id ? parent.id : child.id)
                        } else {
                          setSelectedSubject(child.id)
                        }
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                        selectedSubject === child.id
                          ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {child.name}
                    </button>

                    {/* Level 3 topics */}
                    {expandedParent === child.id && child.children?.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => setSelectedSubject(topic.id)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 ml-4 rounded-lg text-xs transition-colors",
                          selectedSubject === topic.id
                            ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                        )}
                      >
                        {topic.name}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Questions (only for question-type study) */}
        {studyType === "questions" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 dark:text-slate-400">Questões feitas</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="30"
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(e.target.value)}
                className="h-12 text-lg text-center border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 dark:text-slate-400">Acertos</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="22"
                value={correctQuestions}
                onChange={(e) => setCorrectQuestions(e.target.value)}
                className="h-12 text-lg text-center border-slate-200 dark:border-slate-700"
              />
            </div>
            {accuracy !== null && (
              <div className="col-span-2 text-center">
                <Badge
                  className={cn(
                    "text-sm px-4 py-1",
                    accuracy >= 70 ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300" : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                  )}
                >
                  Accuracy: {accuracy}%
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 dark:text-slate-400">Notas (opcional)</Label>
          <Textarea
            placeholder="Algo que queira lembrar..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border-slate-200 dark:border-slate-700 resize-none"
            rows={2}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={!selectedSubject || saving}
          className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700"
        >
          {saving ? "Salvando..." : "Salvar Estudo"}
        </Button>
      </form>
    </div>
  )
}
