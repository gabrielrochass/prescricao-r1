"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, Plus, BarChart3, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/hoje", label: "Hoje", icon: Home },
  { href: "/calendario", label: "Calendário", icon: Calendar },
  { href: "/adicionar", label: "Adicionar", icon: Plus, accent: true },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/mais", label: "Mais", icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-mr1-lines)] z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map(({ href, label, icon: Icon, accent }) => {
          const active = pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors touch-target",
                accent && !active && "text-[var(--color-mr1-action)]",
                active
                  ? "text-[var(--color-mr1-action)]"
                  : !accent && "text-[var(--color-mr1-text2)]"
              )}
            >
              {accent ? (
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center",
                  active ? "bg-[var(--color-mr1-action)]" : "bg-[var(--color-mr1-pink-bg)]"
                )}>
                  <Icon className={cn("h-5 w-5", active ? "text-white" : "text-[var(--color-mr1-action)]")} />
                </div>
              ) : (
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              )}
              <span className={cn(
                "text-[10px]",
                active ? "font-semibold" : "font-medium"
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
