"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { User, Exam } from "@/lib/types"
import { getUser } from "@/lib/db/users"
import { getExams } from "@/lib/db/exams"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#7C6673] pt-6 pb-2 px-4">
      {children}
    </h2>
  )
}

function ListRow({
  href,
  label,
  rightText,
  rightElement,
  showChevron = true,
  isLast = false,
  danger = false,
}: {
  href?: string
  label: string
  rightText?: string
  rightElement?: React.ReactNode
  showChevron?: boolean
  isLast?: boolean
  danger?: boolean
}) {
  const content = (
    <div
      className={`flex items-center justify-between px-4 min-h-[44px] bg-white ${
        !isLast ? "border-b border-[#F1E4E9]" : ""
      }`}
    >
      <span className={`text-[15px] ${danger ? "text-[#C23B6C]" : "text-[#4A2B3F]"}`}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        {rightText && (
          <span className="text-[13px] text-[#7C6673]">{rightText}</span>
        )}
        {rightElement}
        {showChevron && (
          <ChevronRight className="h-4 w-4 text-[#7C6673] opacity-50" />
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

export default function MaisPage() {
  const [user, setUser] = useState<User | null>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [u, e] = await Promise.all([getUser(), getExams()])
        setUser(u)
        setExams(e)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FCF8F9]">
        <div className="animate-pulse text-[#7C6673]">Carregando...</div>
      </div>
    )
  }

  const examSummary = exams.length > 0
    ? exams.map(e => `${e.name} ${format(new Date(e.exam_date), "dd/MM/yy", { locale: ptBR })}`).join(", ")
    : "Nenhuma prova"

  const notificationTimes = user
    ? `${user.notification_morning}, ${user.notification_evening}`
    : ""

  return (
    <div className="min-h-screen bg-[#FCF8F9] pb-8">
      <div className="px-4 pt-6 pb-2">
        <h1 className="font-display text-3xl text-[#4A2B3F]">Mais</h1>
      </div>

      {/* PLANO */}
      <SectionHeader>Plano</SectionHeader>
      <div className="bg-white">
        <ListRow href="/mais/rotacoes" label="Rod\u00edzios e capacidade" />
        <ListRow href="/mais/regras" label="Regras de revis\u00e3o" />
        <ListRow href="/adicionar" label="Grade do Eu M\u00e9dico Residente" />
        <ListRow
          href={undefined}
          label="Provas e datas"
          rightText={examSummary}
          isLast
        />
      </div>

      {/* APP */}
      <SectionHeader>App</SectionHeader>
      <div className="bg-white">
        <ListRow
          href={undefined}
          label="Notifica\u00e7\u00f5es"
          rightText={notificationTimes}
          isLast
        />
      </div>

      {/* CONTA E DADOS */}
      <SectionHeader>Conta e dados</SectionHeader>
      <div className="bg-white">
        <ListRow
          label={user?.email || ""}
          rightElement={
            <span className="text-[13px] text-[#7C6673] flex items-center gap-1">
              <span className="text-green-600">&#10003;</span> Sincronizado
            </span>
          }
          showChevron={false}
        />
        <ListRow href={undefined} label="Exportar backup (planilha)" />
        <ListRow href={undefined} label="Importar backup" />
        <ListRow
          label="Sair da conta"
          showChevron={false}
          danger
          isLast
        />
      </div>

      {/* Footer note */}
      <p className="px-6 pt-6 text-center text-[12px] leading-relaxed text-[#7C6673]">
        Tudo \u00e9 salvo na nuvem automaticamente. Ao entrar em outro aparelho, seu plano e seu hist\u00f3rico aparecem do jeito que voc\u00ea deixou.
      </p>
    </div>
  )
}
