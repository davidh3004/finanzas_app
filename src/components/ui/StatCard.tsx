import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  sublabel?: string
  icon?: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
  valueClassName?: string
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  trendValue,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <div className={cn('bg-slate-900 border border-slate-800 rounded-2xl p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-400 truncate">{label}</p>
          <p className={cn('text-xl font-bold text-white mt-1 truncate', valueClassName)}>{value}</p>
          {sublabel && <p className="text-xs text-slate-500 mt-0.5 truncate">{sublabel}</p>}
        </div>
        {Icon && (
          <div className="ml-3 p-2 rounded-xl bg-slate-800">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <span className={cn(
            'text-xs font-medium',
            trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        </div>
      )}
    </div>
  )
}
