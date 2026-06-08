'use client'

import { useState, useTransition } from 'react'
import { markAlertRead, markAllAlertsRead } from '@/app/actions/alerts'
import type { Alert } from '@/types/database'
import { Card } from '@/components/ui/Card'
import {
  Bell, BellOff, TrendingDown, Wallet,
  CreditCard, CalendarClock, Check, CheckCheck,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  budget_exceeded:  TrendingDown,
  low_balance:      Wallet,
  high_utilization: CreditCard,
  card_due:         CalendarClock,
}

const TYPE_COLOR: Record<string, string> = {
  budget_exceeded:  'text-red-400',
  low_balance:      'text-yellow-400',
  high_utilization: 'text-orange-400',
  card_due:         'text-blue-400',
}

export default function AlertasClient({ alerts: initial }: { alerts: Alert[] }) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [allDone, setAllDone] = useState(false)
  const [, startTransition] = useTransition()

  const alerts = initial.map(a => ({ ...a, read: a.read || readIds.has(a.id) || allDone }))
  const unread = alerts.filter(a => !a.read).length

  function handleMarkRead(id: string) {
    setReadIds(prev => new Set([...prev, id]))
    startTransition(async () => { await markAlertRead(id) })
  }

  function handleMarkAll() {
    setAllDone(true)
    startTransition(async () => { await markAllAlertsRead() })
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between min-h-[20px]">
        <p className="text-xs text-slate-400">
          {unread > 0
            ? `${unread} ${unread === 1 ? 'alerta sin leer' : 'alertas sin leer'}`
            : 'Todo al día'}
        </p>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todo como leído
          </button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BellOff className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-400">No hay alertas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {alerts.map((alert) => {
              const Icon = TYPE_ICON[alert.type] ?? Bell
              const iconColor = TYPE_COLOR[alert.type] ?? 'text-slate-500'
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 transition-colors',
                    !alert.read && 'bg-emerald-500/5'
                  )}
                >
                  <Icon className={cn(
                    'w-4 h-4 mt-0.5 flex-shrink-0',
                    alert.read ? 'text-slate-600' : iconColor
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100">{alert.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                    <p className="text-xs text-slate-600 mt-1">{formatDate(alert.created_at)}</p>
                  </div>
                  {!alert.read ? (
                    <button
                      onClick={() => handleMarkRead(alert.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-slate-800 transition-colors flex-shrink-0"
                      title="Marcar como leída"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-700 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
