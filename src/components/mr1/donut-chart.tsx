"use client"

interface DonutChartProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  label?: string
  sublabel?: string
}

export function DonutChart({
  value,
  size = 120,
  strokeWidth = 10,
  color = "var(--color-mr1-action)",
  bgColor = "var(--color-mr1-lines)",
  label,
  sublabel,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className="font-display text-2xl text-[var(--color-mr1-text)]">{label}</span>
        )}
        {sublabel && (
          <span className="text-[10px] text-[var(--color-mr1-text2)]">{sublabel}</span>
        )}
      </div>
    </div>
  )
}
