"use client"

import { useState, useRef, useEffect } from "react"
import { Info } from "lucide-react"

interface InfoTooltipProps {
  text: string
  className?: string
}

export function InfoTooltip({ text, className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className={`relative inline-flex ${className ?? ""}`}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="touch-target flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-95"
        aria-label="Mais informações"
        aria-expanded={open}
      >
        <div className="h-5 w-5 rounded-full border border-[#F1E4E9] flex items-center justify-center hover:bg-[#F1E4E9] transition-colors">
          <Info className="h-3 w-3 text-[#7C6673]" />
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-64 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Arrow */}
          <div className="w-3 h-3 bg-[#FFF6D6] rotate-45 absolute -top-1.5 left-1/2 -translate-x-1/2" />
          {/* Content */}
          <div className="relative bg-[#FFF6D6] rounded-xl p-3 shadow-lg">
            <p className="text-[12px] leading-relaxed text-[#4A2B3F]">{text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
