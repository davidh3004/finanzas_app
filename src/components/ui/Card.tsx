import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-slate-900 border border-slate-800 rounded-2xl p-4', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children }: CardProps) {
  return (
    <h3 className={cn('text-xs font-medium text-slate-400 uppercase tracking-wider mb-3', className)}>
      {children}
    </h3>
  )
}
