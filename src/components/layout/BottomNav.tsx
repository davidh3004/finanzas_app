'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  CreditCard,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Solo los 4 más usados + "Más" para el resto
const mainNav = [
  { href: '/',            label: 'Inicio',    icon: LayoutDashboard },
  { href: '/movimientos', label: 'Movimientos',icon: ArrowLeftRight  },
  { href: '/fondos',      label: 'Fondos',    icon: Target          },
  { href: '/tarjetas',    label: 'Tarjetas',  icon: CreditCard      },
  { href: '/menu',        label: 'Más',       icon: MoreHorizontal  },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 safe-area-pb">
      <div className="flex items-stretch h-16">
        {mainNav.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                isActive ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'text-emerald-400')} />
              <span className="leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
