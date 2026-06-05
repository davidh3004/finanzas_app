'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import AccountForm from '@/components/accounts/AccountForm'
import type { Account, AccountType } from '@/types/database'
import { formatCurrency, cn } from '@/lib/utils'
import { Wallet, PiggyBank, TrendingUp, CreditCard, Banknote, Plus } from 'lucide-react'

const typeLabel: Record<AccountType, string> = {
  checking:        'Cuenta corriente',
  savings:         'Cuenta de ahorros',
  investment_fund: 'Fondo de inversión',
  brokerage:       'Corretaje',
  credit_card:     'Tarjeta de crédito',
  cash:            'Efectivo',
}

const typeIcon: Record<AccountType, React.ElementType> = {
  checking:        Wallet,
  savings:         PiggyBank,
  investment_fund: TrendingUp,
  brokerage:       TrendingUp,
  credit_card:     CreditCard,
  cash:            Banknote,
}

interface CuentasClientProps {
  accounts: Account[]
  patrimonioNeto: number
  deudaTarjeta: number
}

export default function CuentasClient({ accounts, patrimonioNeto, deudaTarjeta }: CuentasClientProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const router = useRouter()

  function handleSuccess() {
    setModalOpen(false)
    router.refresh()
  }

  return (
    <>
      {/* Botón flotante mobile */}
      <button
        onClick={() => setModalOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Resumen + botón desktop */}
        <div className="flex items-start gap-3">
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Patrimonio neto</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{formatCurrency(patrimonioNeto)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-slate-400">Deuda tarjetas</p>
              <p className="text-xl font-bold text-red-400 mt-1">{formatCurrency(deudaTarjeta)}</p>
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex-shrink-0 mt-0"
          >
            <Plus className="w-4 h-4" />
            Nueva cuenta
          </button>
        </div>

        {/* Lista */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <p className="text-sm text-slate-400">No hay cuentas aún.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-emerald-400 hover:underline"
              >
                Crear la primera cuenta
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {accounts.map(account => {
                const Icon = typeIcon[account.type as AccountType] ?? Wallet
                const isCC = account.type === 'credit_card'
                const balance = Number(account.current_balance)

                return (
                  <div key={account.id} className="flex items-center gap-3 px-4 py-3.5">
                    <div
                      className="p-2.5 rounded-xl flex-shrink-0"
                      style={{ backgroundColor: account.color ? `${account.color}20` : '#1e293b' }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: account.color ?? '#64748b' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{account.name}</p>
                      <p className="text-xs text-slate-500">{typeLabel[account.type as AccountType]}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn(
                        'text-sm font-semibold',
                        isCC
                          ? balance < 0 ? 'text-red-400' : 'text-slate-300'
                          : balance >= 0 ? 'text-white' : 'text-red-400'
                      )}>
                        {formatCurrency(Math.abs(balance), account.currency)}
                      </p>
                      <p className="text-xs text-slate-600">{account.currency}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal nueva cuenta */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva cuenta">
        <AccountForm onSuccess={handleSuccess} />
      </Modal>
    </>
  )
}
