"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { User, Exam } from "@/lib/types"
import { getUser } from "@/lib/db/users"
import { getExams } from "@/lib/db/exams"

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
  showChevron,
  isLast = false,
  danger = false,
  onClick,
}: {
  href?: string
  label: string
  rightText?: string
  rightElement?: React.ReactNode
  showChevron?: boolean
  isLast?: boolean
  danger?: boolean
  onClick?: () => void
}) {
  const isInteractive = !!(href || onClick)
  const chevronVisible = showChevron ?? isInteractive

  const content = (
    <div
      className={`flex items-center justify-between px-4 min-h-[44px] bg-white ${
        !isLast ? "border-b border-[#F1E4E9]" : ""
      } ${isInteractive ? "list-row-interactive" : "list-row-static"}`}
      onClick={!href ? onClick : undefined}
      role={onClick && !href ? "button" : undefined}
    >
      <span className={`text-[15px] ${danger ? "text-[#C23B6C]" : "text-[#4A2B3F]"}`}>
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {rightText && (
          <span className="text-[13px] text-[#7C6673] truncate max-w-[140px]">{rightText}</span>
        )}
        {rightElement}
        {chevronVisible && (
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

  const notificationTimes = user
    ? `${user.notification_morning}, ${user.notification_evening}`
    : ""

  return (
    <div className="min-h-screen bg-[#FCF8F9] pb-8">
      <div className="px-4 pt-6 pb-2">
        <h1 className="font-display text-3xl text-[#4A2B3F]">Mais</h1>
      </div>

      <SectionHeader>Plano</SectionHeader>
      <div className="bg-white">
        <ListRow href="/mais/rotacoes" label="Rodízios e capacidade" />
        <ListRow href="/mais/regras" label="Regras de revisão" />
        <ListRow href="/adicionar" label="Grade do Eu Médico Residente" />
        <ListRow label="Provas e datas" isLast />
      </div>

      <SectionHeader>App</SectionHeader>
      <div className="bg-white">
        <ListRow label="Notificações" rightText={notificationTimes} isLast />
      </div>

      <SectionHeader>Conta e dados</SectionHeader>
      <div className="bg-white">
        <ListRow
          label={user?.email || ""}
          rightElement={
            <span className="text-[13px] text-[#7C6673] flex items-center gap-1">
              <span className="text-green-600">&#10003;</span> Sincronizado
            </span>
          }
        />
        <ListRow label="Exportar backup (planilha)" />
        <ListRow label="Importar backup" />
        <ListRow
          label="Sair da conta"
          danger
          isLast
        />
      </div>

      <p className="px-6 pt-6 text-center text-[12px] leading-relaxed text-[#7C6673]">
        Tudo é salvo na nuvem automaticamente. Ao entrar em outro aparelho, seu plano e seu histórico aparecem do jeito que você deixou.
      </p>
    </div>
  )
}
