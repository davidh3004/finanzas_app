'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import TransactionForm from '@/components/transactions/TransactionForm'
import EditTransactionForm from '@/components/transactions/EditTransactionForm'
import PendingReviewCard from '@/components/transactions/PendingReviewCard'
import { Card } from '@/components/ui/Card'
import type { Account, Category, Transaction } from '@/types/database'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Plus, Pencil, SlidersHorizontal, X } from 'lucide-react'
import Link from 'next/link'

interface ActiveFilters {
  filtro?:    string
  tipo?:      string
  cuenta?:    string
  categoria?: string
  desde?:     string
  hasta?:     string
  moneda?:    string
}

interface MovimientosClientProps {
  accounts:            Account[]
  categories:          Category[]
  transactions:        Transaction[]
  pendingTransactions: Transaction[]
  openForm?:           boolean
  activeFilters?:      ActiveFilters
  tasaUsdDop?:         number
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

// Build last 13 months list for the month selector
function buildMonths() {
  const months: { label: string; desde: string; hasta: string }[] = []
  for (let i = 0; i < 13; i++) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const y = d.getFullYear()
    const m = d.getMonth()
    months.push({
      label: d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }),
      desde: new Date(y, m, 1).toISOString().split('T')[0],
      hasta: new Date(y, m + 1, 0).toISOString().split('T')[0],
    })
  }
  return months
}

export default function MovimientosClient({
  accounts,
  categories,
  transactions,
  pendingTransactions,
  openForm = false,
  activeFilters = {},
  tasaUsdDop = 60,
}: MovimientosClientProps) {
  const [modalOpen, setModalOpen] = useState(openForm)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const router = useRouter()

  const months = buildMonths()

  // Which month option is currently selected (by matching desde+hasta)
  const selectedMonthIdx = months.findIndex(
    m => m.desde === activeFilters.desde && m.hasta === activeFilters.hasta
  )

  useEffect(() => {
    if (openForm) router.replace('/movimientos')
  }, [openForm, router])

  function handleSuccess() {
    setModalOpen(false)
    window.location.href = '/movimientos'
  }

  function handleEditSuccess() {
    setEditingTx(null)
    window.location.href = '/movimientos'
  }

  const pushFilter = useCallback((updates: Partial<ActiveFilters>) => {
    const merged = { ...activeFilters, ...updates }
    const params = new URLSearchParams()
    if (merged.filtro)    params.set('filtro',    merged.filtro)
    if (merged.tipo)      params.set('tipo',      merged.tipo)
    if (merged.cuenta)    params.set('cuenta',    merged.cuenta)
    if (merged.categoria) params.set('categoria', merged.categoria)
    if (merged.desde)     params.set('desde',     merged.desde)
    if (merged.hasta)     params.set('hasta',     merged.hasta)
    if (merged.moneda)    params.set('moneda',    merged.moneda)
    const qs = params.toString()
    router.push(qs ? `/movimientos?${qs}` : '/movimientos')
  }, [activeFilters, router])

  const clearFilter = useCallback((key: keyof ActiveFilters) => {
    const updated = { ...activeFilters, [key]: undefined }
    pushFilter(updated)
  }, [activeFilters, pushFilter])

  const isFiltered = !!(
    activeFilters.filtro || activeFilters.tipo || activeFilters.cuenta ||
    activeFilters.categoria || activeFilters.desde || activeFilters.moneda
  )

  // Parent categories only (for filter dropdown)
  const parentCategories = categories.filter(c => !c.parent_id && c.kind !== 'transfer' && c.kind !== 'income')

  const pillBase = 'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer'
  const pillActive = 'bg-emerald-500 border-emerald-500 text-white'
  const pillInactive = 'border-slate-700 text-slate-400 hover:border-slate-600'

  return (
    <>
      {/* FAB mobile */}
      <button
        onClick={() => setModalOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Desktop header */}
      <div className="hidden lg:flex justify-end mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo movimiento
        </button>
      </div>

      {/* ── Filter bar ─────────────────────────────────── */}
      <div className="mb-4 space-y-3">
        {/* Row 1: status + toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Todos',      value: undefined },
            { label: 'Pendientes', value: 'pending_review' },
            { label: 'Confirmados',value: 'confirmed' },
          ].map(({ label, value }) => (
            <button
              key={label}
              onClick={() => pushFilter({ filtro: value })}
              className={cn(pillBase, activeFilters.filtro === value || (!activeFilters.filtro && !value) ? pillActive : pillInactive)}
            >
              {label}
              {label === 'Pendientes' && pendingTransactions.length > 0 && (
                <span className="ml-1.5 bg-yellow-500 text-black rounded-full px-1.5 text-[10px] font-bold">
                  {pendingTransactions.length}
                </span>
              )}
            </button>
          ))}

          <div className="flex-1" />

          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              showFilters || isFiltered ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-600'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
            {isFiltered && (
              <span className="ml-0.5 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                {[activeFilters.tipo, activeFilters.cuenta, activeFilters.categoria, activeFilters.desde, activeFilters.moneda].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: expanded filters */}
        {showFilters && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            {/* Type + currency pills */}
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-slate-500 self-center mr-1">Tipo:</span>
              {[
                { label: 'Todos',         value: undefined },
                { label: 'Ingreso',       value: 'income' },
                { label: 'Gasto',         value: 'expense' },
                { label: 'Transferencia', value: 'transfer' },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => pushFilter({ tipo: value })}
                  className={cn(pillBase, activeFilters.tipo === value || (!activeFilters.tipo && !value) ? pillActive : pillInactive)}
                >
                  {label}
                </button>
              ))}
              <span className="text-slate-700 self-center">|</span>
              <span className="text-xs text-slate-500 self-center">Moneda:</span>
              {[
                { label: 'Todas', value: undefined },
                { label: 'DOP',   value: 'DOP' },
                { label: 'USD',   value: 'USD' },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => pushFilter({ moneda: value })}
                  className={cn(pillBase, activeFilters.moneda === value || (!activeFilters.moneda && !value) ? pillActive : pillInactive)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Selects row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Month */}
              <select
                value={selectedMonthIdx >= 0 ? selectedMonthIdx : ''}
                onChange={e => {
                  const idx = Number(e.target.value)
                  if (isNaN(idx)) {
                    pushFilter({ desde: undefined, hasta: undefined })
                  } else {
                    pushFilter({ desde: months[idx].desde, hasta: months[idx].hasta })
                  }
                }}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 capitalize"
              >
                <option value="">Todos los meses</option>
                {months.map((m, i) => (
                  <option key={m.desde} value={i}>{m.label}</option>
                ))}
              </select>

              {/* Account */}
              <select
                value={activeFilters.cuenta ?? ''}
                onChange={e => pushFilter({ cuenta: e.target.value || undefined })}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Todas las cuentas</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              {/* Category */}
              <select
                value={activeFilters.categoria ?? ''}
                onChange={e => pushFilter({ categoria: e.target.value || undefined })}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Todas las categorías</option>
                {parentCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Active filter chips + clear */}
            {isFiltered && (
              <div className="flex items-center gap-2 flex-wrap pt-1">
                {activeFilters.tipo && (
                  <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 text-xs text-slate-300">
                    {activeFilters.tipo}
                    <button onClick={() => clearFilter('tipo')} className="text-slate-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeFilters.desde && (
                  <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 text-xs text-slate-300">
                    {months[selectedMonthIdx]?.label ?? activeFilters.desde}
                    <button onClick={() => { clearFilter('desde'); clearFilter('hasta') }} className="text-slate-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeFilters.cuenta && (
                  <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 text-xs text-slate-300">
                    {accounts.find(a => a.id === activeFilters.cuenta)?.name ?? 'Cuenta'}
                    <button onClick={() => clearFilter('cuenta')} className="text-slate-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeFilters.categoria && (
                  <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 text-xs text-slate-300">
                    {categories.find(c => c.id === activeFilters.categoria)?.name ?? 'Categoría'}
                    <button onClick={() => clearFilter('categoria')} className="text-slate-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {activeFilters.moneda && (
                  <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1 text-xs text-slate-300">
                    {activeFilters.moneda}
                    <button onClick={() => clearFilter('moneda')} className="text-slate-500 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <Link
                  href="/movimientos"
                  className="text-xs text-slate-500 hover:text-white transition-colors ml-auto"
                >
                  Limpiar todo
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result count when filtered */}
      {isFiltered && (
        <p className="text-xs text-slate-500 mb-3">
          {transactions.length} {transactions.length === 1 ? 'resultado' : 'resultados'}
        </p>
      )}

      {/* Pending review tray */}
      {pendingTransactions.length > 0 && (!activeFilters.filtro || activeFilters.filtro === 'pending_review') && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
            Pendientes de revisión ({pendingTransactions.length})
          </p>
          {pendingTransactions.map(t => (
            <PendingReviewCard key={t.id} transaction={t} categories={categories} />
          ))}
        </div>
      )}

      {/* Transaction list */}
      <Card className="p-0 overflow-hidden">
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-slate-400 text-sm">
              {isFiltered ? 'No hay movimientos con estos filtros.' : 'No hay movimientos.'}
            </p>
            {!isFiltered && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-3 text-xs text-emerald-400 hover:underline"
              >
                Agregar el primero
              </button>
            )}
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
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <p className={cn('text-sm font-semibold', colorClass)}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                      {formatCurrency(Number(t.amount), t.currency)}
                    </p>
                    <button
                      onClick={() => setEditingTx(t)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Edit modal */}
      <Modal open={editingTx !== null} onClose={() => setEditingTx(null)} title="Editar movimiento">
        {editingTx && (
          <EditTransactionForm
            transaction={editingTx}
            categories={categories}
            onSuccess={handleEditSuccess}
          />
        )}
      </Modal>

      {/* New transaction modal */}
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
            tasaUsdDop={tasaUsdDop}
          />
        )}
      </Modal>
    </>
  )
}
