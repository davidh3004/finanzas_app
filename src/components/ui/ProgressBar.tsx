import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number    // 0-100
  max?: number
  className?: string
  barClassName?: string
  showLabel?: boolean
  label?: string
}

export function ProgressBar({
  value,
  max = 100,
  className,
  barClassName,
  showLabel = false,
  label,
}: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          {label && <span>{label}</span>}
          {showLabel && <span>{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color, barClassName)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
