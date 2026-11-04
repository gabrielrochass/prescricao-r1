import { cn } from "@/lib/utils"
import type { AgendaType } from "@/lib/types"

const TYPE_CONFIG: Record<AgendaType, { letter: string; bg: string; text: string }> = {
  study: { letter: "E", bg: "bg-[var(--color-mr1-orange-bg)]", text: "text-[var(--color-mr1-orange)]" },
  fixation: { letter: "F", bg: "bg-[var(--color-mr1-orange-bg)]", text: "text-[var(--color-mr1-orange)]" },
  review: { letter: "R", bg: "bg-[var(--color-mr1-pink-bg)]", text: "text-[var(--color-mr1-pink)]" },
  simulado: { letter: "S", bg: "bg-[var(--color-mr1-pink-bg)]", text: "text-[var(--color-mr1-pink)]" },
  guaranteed_review: { letter: "RF", bg: "bg-[var(--color-mr1-pink-bg)]", text: "text-[var(--color-mr1-pink)]" },
}

export function AgendaBadge({
  type,
  reviewNumber,
  className,
}: {
  type: AgendaType
  reviewNumber?: number | null
  className?: string
}) {
  const config = TYPE_CONFIG[type]
  const label = type === "review" && reviewNumber ? `R${reviewNumber}` : config.letter

  return (
    <span className={cn(
      "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold min-w-[24px]",
      config.bg, config.text, className
    )}>
      {label}
    </span>
  )
}

export function AgendaTypeName({ type }: { type: AgendaType }) {
  const names: Record<AgendaType, string> = {
    study: "Estudo",
    fixation: "Fixação",
    review: "Revisão",
    simulado: "Simulado",
    guaranteed_review: "Revisão Garantida",
  }
  return <>{names[type]}</>
}
