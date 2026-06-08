'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { markAlertRead, markAllAlertsRead } from '@/app/actions/alerts'
import { sendDailySummary } from '@/app/actions/email'
import type { Alert } from '@/types/database'
import { Card } from '@/components/ui/Card'
import {
  Bell, BellOff, TrendingDown, Wallet,
  CreditCard, CalendarClock, Check, CheckCheck, Mail, Loader2,
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

interface Props {
  alerts:          Alert[]
  emailConfigured: boolean
}

export default function AlertasClient({ alerts: initial, emailConfigured }: Props) {
  const [readIds,       setReadIds]       = useState<Set<string>>(new Set())
  const [allDone,       setAllDone]       = useState(false)
  const [sendingEmail,  setSendingEmail]  = useState(false)
  const [emailMsg,      setEmailMsg]      = useState<string | null>(null)
  const router = useRouter()

  const alerts = initial.map(a => ({ ...a, read: a.read || readIds.has(a.id) || allDone }))
  const unread  = alerts.filter(a => !a.read).length

  async function handleMarkRead(id: string) {
    setReadIds(prev => new Set([...prev, id]))
    await markAlertRead(id)
    router.refresh()
  }

  async function handleMarkAll() {
    setAllDone(true)
    await markAllAlertsRead()
    router.refresh()
  }

  async function handleSendEmail() {
    setSendingEmail(true)
    setEmailMsg(null)
    const result = await sendDailySummary()
    setSendingEmail(false)
    setEmailMsg(result.success ? '✓ Email enviado' : `Error: ${result.error}`)
    setTimeout(() => setEmailMsg(null), 4000)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between min-h-[20px]">
        <p className="text-xs text-slate-400">
          {unread > 0
            ? `${unread} ${unread === 1 ? 'alerta sin leer' : 'alertas sin leer'}`
            : 'Todo al día'}
        </p>
        <div className="flex items-center gap-3">
          {emailConfigured && (
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {sendingEmail
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Mail className="w-3.5 h-3.5" />}
              {emailMsg ?? 'Enviar resumen'}
            </button>
          )}
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar todo
            </button>
          )}
        </div>
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
              const Icon      = TYPE_ICON[alert.type] ?? Bell
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
                    <p className="text-xs text-slate-600 mt-1">{formatDate(alert.created_at.slice(0, 10))}</p>
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
