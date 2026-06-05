'use client'

import { Bell, Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/':              'Dashboard',
  '/movimientos':   'Movimientos',
  '/cuentas':       'Cuentas',
  '/fondos':        'Fondos',
  '/tarjetas':      'Tarjetas',
  '/presupuestos':  'Presupuestos',
  '/alertas':       'Alertas',
  '/simulador':     'Simulador',
  '/chat':          'Chat IA',
  '/reportes':      'Reportes',
  '/configuracion': 'Configuración',
}

export default function Header({ alertCount = 0 }: { alertCount?: number }) {
  const pathname = usePathname()

  const title = Object.entries(pageTitles).find(([path]) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  )?.[1] ?? 'Finanzas'

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-14 px-4 bg-slate-950/80 backdrop-blur border-b border-slate-800 lg:px-6">
      <h1 className="text-base font-semibold text-white">{title}</h1>

      <div className="flex items-center gap-2">
        {/* Botón agregar movimiento rápido */}
        <Link
          href="/movimientos?nuevo=1"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar</span>
        </Link>

        {/* Alertas */}
        <Link
          href="/alertas"
          className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
