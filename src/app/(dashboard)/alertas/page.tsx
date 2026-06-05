import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/Card'
import { Bell, BellOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

export default async function AlertasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const unread = alerts?.filter(a => !a.read).length ?? 0

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {unread > 0 && (
        <p className="text-xs text-slate-400">
          {unread} {unread === 1 ? 'alerta sin leer' : 'alertas sin leer'}
        </p>
      )}

      <Card className="p-0 overflow-hidden">
        {(alerts?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <BellOff className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-400">No hay alertas.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {alerts?.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3',
                  !alert.read && 'bg-emerald-500/5'
                )}
              >
                <Bell className={cn(
                  'w-4 h-4 mt-0.5 flex-shrink-0',
                  alert.read ? 'text-slate-600' : 'text-emerald-400'
                )} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100">{alert.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{alert.message}</p>
                  <p className="text-xs text-slate-600 mt-1">{formatDate(alert.created_at)}</p>
                </div>
                {!alert.read && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1.5" />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
