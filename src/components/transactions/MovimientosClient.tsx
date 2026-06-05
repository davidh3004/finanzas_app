'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import TransactionForm from '@/components/transactions/TransactionForm'
import PendingReviewCard from '@/components/transactions/PendingReviewCard'
import { Card } from '@/components/ui/Card'
import type { Account, Category, Transaction } from '@/types/database'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus } from 'lucide-react'
import Link from 'next/link'

interface MovimientosClientProps {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  pendingTransactions: Transaction[]
  openForm?: boolean
  filtro?: string
}

const typeIcon = {
  income:   ArrowUpRight,
  expense:  ArrowDownLeft,
  transfer: ArrowLeftRight,
} as const

const typeColor = {
  income:   'text-emerald-400',
  expense:  'text-red-400',
  transfer: 'text-slate-400',
} as const

export default function MovimientosClient({
  accounts,
  categories,
  transactions,
  pendingTransactions,
  openForm = false,
  filtro,
}: MovimientosClientProps) {
  const [modalOpen, setModalOpen] = useState(openForm)
  const router = useRouter()

  // Limpiar el ?nuevo=1 de la URL una vez que se abrió el modal
  useEffect(() => {
    if (openForm) {
      router.replace('/movimientos')
    }
  }, [openForm, router])

  function handleSuccess() {
    setModalOpen(false)
    window.location.href = '/movimientos'
  }

  return (
    <>
      {/* Botón flotante en mobile */}
      <button
        onClick={() => setModalOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Botón desktop */}
      <div className="hidden lg:flex justify-end mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo movimiento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { label: 'Todos',      value: undefined },
          { label: 'Pendientes', value: 'pending_review' },
          { label: 'Confirmados',value: 'confirmed' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/movimientos?filtro=${value}` : '/movimientos'}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filtro === value || (!filtro && !value)
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-700 text-slate-400 hover:border-slate-600'
            )}
          >
            {label}
            {label === 'Pendientes' && pendingTransactions.length > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black rounded-full px-1.5 py-0 text-[10px] font-bold">
                {pendingTransactions.length}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Bandeja de revisión */}
      {pendingTransactions.length > 0 && (!filtro || filtro === 'pending_review') && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
            Pendientes de revisión ({pendingTransactions.length})
          </p>
          {pendingTransactions.map(t => (
            <PendingReviewCard key={t.id} transaction={t} categories={categories} />
          ))}
        </div>
      )}

      {/* Lista de movimientos */}
      <Card className="p-0 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-slate-400 text-sm">No hay movimientos.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-3 text-xs text-emerald-400 hover:underline"
            >
              Agregar el primero
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {transactions.map(t => {
              const type = t.type as keyof typeof typeIcon
              const Icon = typeIcon[type] ?? ArrowLeftRight
              const colorClass = typeColor[type] ?? 'text-slate-400'
              const accountName = accounts.find(a => a.id === t.account_id)?.name
              const category = t.category_id ? categories.find(c => c.id === t.category_id) : null
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/40 transition-colors">
                  <div className={cn('p-2 rounded-xl bg-slate-800', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {t.merchant ?? t.description ?? 'Sin descripción'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
                      {category && (
                        <>
                          <span className="text-slate-700">·</span>
                          <p className="text-xs truncate" style={{ color: category.color ?? '#64748b' }}>
                            {category.name}
                          </p>
                        </>
                      )}
                      {accountName && (
                        <>
                          <span className="text-slate-700">·</span>
                          <p className="text-xs text-slate-600 truncate">{accountName}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-semibold', colorClass)}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                      {formatCurrency(Number(t.amount), t.currency)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Modal nuevo movimiento */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo movimiento">
        {accounts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-400 mb-3">
              Primero crea una cuenta para poder registrar movimientos.
            </p>
            <Link
              href="/cuentas"
              onClick={() => setModalOpen(false)}
              className="text-sm text-emerald-400 hover:underline"
            >
              Ir a Cuentas
            </Link>
          </div>
        ) : (
          <TransactionForm
            accounts={accounts}
            categories={categories}
            onSuccess={handleSuccess}
          />
        )}
      </Modal>
    </>
  )
}
