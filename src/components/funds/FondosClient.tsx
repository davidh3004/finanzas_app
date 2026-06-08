'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import FundForm from '@/components/funds/FundForm'
import { aportarFondo, deleteFund } from '@/app/actions/funds'
import type { Fund, Account } from '@/types/database'
import { formatCurrency, calcMonthsToGoal, cn } from '@/lib/utils'
import { Plus, Pencil, PlusCircle, Loader2, Umbrella, TrendingUp, Target, Trash2 } from 'lucide-react'

interface FondosClientProps {
  funds: Fund[]
  accounts: Account[]
}

const fundIcon = {
  emergency:  Umbrella,
  investment: TrendingUp,
  saving:     Target,
} as const

const fundColor = {
  emergency:  'text-yellow-400',
  investment: 'text-emerald-400',
  saving:     'text-blue-400',
} as const

export default function FondosClient({ funds, accounts }: FondosClientProps) {
  const [modalOpen, setModalOpen]             = useState(false)
  const [editingFund, setEditingFund]         = useState<Fund | null>(null)
  const [aportarId, setAportarId]             = useState<string | null>(null)
  const [aportarAmount, setAportarAmount]     = useState('')
  const [aportarLoading, setAportarLoading]   = useState(false)
  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const router = useRouter()

  function handleSuccess() {
    setModalOpen(false)
    setEditingFund(null)
    router.refresh()
  }

  async function handleDelete(fund: Fund) {
    if (!confirm(`¿Eliminar el fondo "${fund.name}"? Esta acción lo oculta pero conserva el historial.`)) return
    setDeletingId(fund.id)
    await deleteFund(fund.id)
    setDeletingId(null)
    router.refresh()
  }

  async function handleAportar(fundId: string) {
    const amount = parseFloat(aportarAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return
    setAportarLoading(true)
    await aportarFondo(fundId, amount)
    setAportarLoading(false)
    setAportarId(null)
    setAportarAmount('')
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
        {/* Botón desktop */}
        <div className="hidden lg:flex justify-end">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo fondo
          </button>
        </div>

        {funds.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-sm mb-3">No hay fondos configurados.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="text-xs text-emerald-400 hover:underline"
            >
              Crear el primero
            </button>
          </div>
        ) : (
          funds.map(fund => {
            const Icon = fundIcon[fund.type as keyof typeof fundIcon] ?? Target
            const colorClass = fundColor[fund.type as keyof typeof fundColor] ?? 'text-slate-400'
            const current = Number(fund.current_amount)
            const target  = Number(fund.target_amount)
            const pct     = target > 0 ? Math.min((current / target) * 100, 100) : 0
            const rate    = Number(fund.projection_rate)
            const months  = calcMonthsToGoal(current, target, 0, rate)
            const isAportando = aportarId === fund.id

            return (
              <div key={fund.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl bg-slate-800 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{fund.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{fund.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingFund(fund)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(fund)}
                      disabled={deletingId === fund.id}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Montos */}
                <div className="flex justify-between text-sm mb-2">
                  <span className={`font-bold text-xl ${colorClass}`}>
                    {formatCurrency(current, fund.currency)}
                  </span>
                  <span className="text-slate-400 text-xs self-end mb-0.5">
                    meta: {formatCurrency(target, fund.currency)}
                  </span>
                </div>

                {/* Barra */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-1">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      pct >= 100 ? 'bg-emerald-400' : pct >= 70 ? 'bg-emerald-500' : colorClass.replace('text-', 'bg-')
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-slate-500 mb-3">
                  <span>{pct.toFixed(1)}%</span>
                  {current < target && months > 0 && months !== Infinity && (
                    <span>~{months} meses para llenar{rate > 0 ? ` (${(rate * 100).toFixed(0)}% anual)` : ''}</span>
                  )}
                  {current >= target && (
                    <span className="text-emerald-400 font-medium">✓ Meta alcanzada</span>
                  )}
                </div>

                {/* Aportar */}
                {isAportando ? (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={aportarAmount}
                      onChange={e => setAportarAmount(e.target.value)}
                      placeholder="Monto a aportar"
                      autoFocus
                      className="flex-1 bg-slate-800 border border-emerald-500 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none"
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAportar(fund.id)
                        if (e.key === 'Escape') { setAportarId(null); setAportarAmount('') }
                      }}
                    />
                    <button
                      onClick={() => handleAportar(fund.id)}
                      disabled={aportarLoading}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {aportarLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aportar'}
                    </button>
                    <button
                      onClick={() => { setAportarId(null); setAportarAmount('') }}
                      className="px-3 py-2 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAportarId(fund.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-700 text-xs text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Aportar al fondo
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal nuevo fondo */}
      <Modal
        open={modalOpen || editingFund !== null}
        onClose={() => { setModalOpen(false); setEditingFund(null) }}
        title={editingFund ? 'Editar fondo' : 'Nuevo fondo'}
      >
        <FundForm
          fund={editingFund ?? undefined}
          accounts={accounts}
          onSuccess={handleSuccess}
        />
      </Modal>
    </>
  )
}
