'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  CreditCard,
  PieChart,
  Bell,
  Calculator,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/',               label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/movimientos',    label: 'Movimientos',   icon: ArrowLeftRight  },
  { href: '/cuentas',        label: 'Cuentas',       icon: Wallet          },
  { href: '/fondos',         label: 'Fondos',        icon: Target          },
  { href: '/tarjetas',       label: 'Tarjetas',      icon: CreditCard      },
  { href: '/presupuestos',   label: 'Presupuestos',  icon: PieChart        },
  { href: '/alertas',        label: 'Alertas',       icon: Bell            },
  { href: '/simulador',      label: 'Simulador',     icon: Calculator      },
  { href: '/chat',           label: 'Chat IA',       icon: MessageSquare   },
  { href: '/reportes',       label: 'Reportes',      icon: BarChart3       },
  { href: '/configuracion',  label: 'Configuración', icon: Settings        },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-slate-900 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Finanzas</p>
          <p className="text-xs text-slate-400 mt-0.5">David</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
