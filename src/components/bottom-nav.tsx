"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlignLeft, CalendarDays, Plus, PieChart, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/hoje", label: "Hoje", icon: AlignLeft },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/adicionar", label: "Adicionar", icon: Plus, accent: true },
  { href: "/metricas", label: "Métricas", icon: PieChart },
  { href: "/mais", label: "Mais", icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#F1E4E9] z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map(({ href, label, icon: Icon, accent }) => {
          const active = pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 transition-colors touch-target active:opacity-70",
                active
                  ? "text-[#C23B6C]"
                  : accent ? "text-[#C23B6C]" : "text-[#7C6673]"
              )}
            >
              {accent ? (
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center -mt-1",
                  "bg-[#C23B6C]"
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
              ) : (
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              )}
              <span className={cn(
                "text-[10px]",
                active ? "font-semibold text-[#C23B6C]" : "font-medium"
              )}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
