'use client'

import Link from 'next/link'
import {
  Wallet, Target, PieChart, Bell, Calculator, MessageSquare, BarChart3, Settings, LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const menuItems = [
  { href: '/cuentas',        label: 'Cuentas',       icon: Wallet,          description: 'Saldos y cuentas' },
  { href: '/fondos',         label: 'Fondos',        icon: Target,          description: 'Emergencia e inversión' },
  { href: '/presupuestos',   label: 'Presupuestos',  icon: PieChart,        description: 'Gastos por categoría' },
  { href: '/alertas',        label: 'Alertas',       icon: Bell,            description: 'Notificaciones' },
  { href: '/simulador',      label: 'Simulador',     icon: Calculator,      description: '¿Qué pasa si...?' },
  { href: '/chat',           label: 'Chat IA',       icon: MessageSquare,   description: 'Pregúntale a tus datos' },
  { href: '/reportes',       label: 'Reportes',      icon: BarChart3,       description: 'P&L mensual' },
  { href: '/configuracion',  label: 'Configuración', icon: Settings,        description: 'Ajustes de la app' },
]

export default function MenuPage() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-md mx-auto space-y-1">
      {menuItems.map(({ href, label, icon: Icon, description }) => (
        <Link
          key={href}
          href={href}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors"
        >
          <div className="p-2 rounded-xl bg-slate-800">
            <Icon className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-100">{label}</p>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </Link>
      ))}

      <div className="pt-2 border-t border-slate-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 transition-colors"
        >
          <div className="p-2 rounded-xl bg-slate-800">
            <LogOut className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-400">Cerrar sesión</p>
          </div>
        </button>
      </div>
    </div>
  )
}
