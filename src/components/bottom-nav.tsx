"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, BarChart3, CalendarDays, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Hoje", icon: Home },
  { href: "/registrar", label: "Registrar", icon: BookOpen },
  { href: "/planejar", label: "Planejar", icon: CalendarDays },
  { href: "/progresso", label: "Progresso", icon: BarChart3 },
  { href: "/config", label: "Config", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px]",
                active
                  ? "text-indigo-600"
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              <span className={cn("text-[10px] font-medium", active && "font-semibold")}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
