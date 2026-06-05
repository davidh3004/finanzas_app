import { createClient } from '@/lib/supabase/server'
import { Card, CardTitle } from '@/components/ui/Card'
import { Settings2 } from 'lucide-react'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: config } = await supabase
    .from('config')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-slate-400" />
          <CardTitle className="mb-0">Configuración global</CardTitle>
        </div>

        {config ? (
          <dl className="space-y-3 text-sm">
            {[
              { label: 'Ingreso bruto mensual',  value: `RD$ ${Number(config.ingreso_bruto).toLocaleString('es-DO')}` },
              { label: 'Ingreso neto mensual',   value: `RD$ ${Number(config.ingreso_neto).toLocaleString('es-DO')}` },
              { label: 'Moneda principal',        value: config.moneda_principal },
              { label: 'Tasa USD→DOP',           value: `${config.tasa_usd_dop}` },
              { label: 'Fechas de pago',          value: `Días ${config.fecha_pago_1} y ${config.fecha_pago_2}` },
              { label: 'Fase actual',             value: config.fase_actual === 1 ? 'Fase 1 — Emergencia' : 'Fase 2 — Inversión' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between border-b border-slate-800 pb-2 last:border-0 last:pb-0">
                <dt className="text-slate-400">{label}</dt>
                <dd className="text-white font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-slate-400 text-sm">Cargando configuración...</p>
        )}

        <p className="text-xs text-slate-600 mt-4">
          Edición completa de configuración disponible en la próxima fase.
        </p>
      </Card>

      <Card>
        <CardTitle>Cuenta</CardTitle>
        <p className="text-sm text-slate-300">{user.email}</p>
        <p className="text-xs text-slate-500 mt-1">ID: {user.id.slice(0, 8)}...</p>
      </Card>
    </div>
  )
}
