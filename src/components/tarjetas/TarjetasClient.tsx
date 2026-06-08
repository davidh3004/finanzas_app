'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import TarjetaForm from '@/components/tarjetas/TarjetaForm'
import { deleteCreditCard } from '@/app/actions/creditCards'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react'

interface CardData {
  id:             string
  credit_limit:   number
  cut_day:        number
  due_day:        number
  annual_fee:     number
  cashback_rules: Record<string, number>
  account: {
    name:            string
    current_balance: number
    currency:        string
    color:           string | null
  } | null
}

interface TarjetasClientProps {
  cards: CardData[]
}

export default function TarjetasClient({ cards }: TarjetasClientProps) {
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editingCard, setEditingCard] = useState<CardData | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const router = useRouter()

  function handleSuccess() {
    setModalOpen(false)
    setEditingCard(null)
    router.refresh()
  }

  async function handleDelete(card: CardData) {
    if (!confirm(`¿Cancelar la tarjeta "${card.account?.name}"? Esta acción oculta la tarjeta pero conserva el historial.`)) return
    setDeletingId(card.id)
    await deleteCreditCard(card.id)
    setDeletingId(null)
    router.refresh()
  }

  return (
    <>
      {/* Botón nueva tarjeta — mobile flotante */}
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
          Nueva tarjeta
        </button>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {cards.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <CreditCard className="w-10 h-10 text-slate-700" />
              <p className="text-sm text-slate-400">No hay tarjetas aún.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-emerald-400 hover:underline"
              >
                Agregar primera tarjeta
              </button>
            </div>
          </Card>
        ) : (
          cards.map((card) => {
            const balance    = Math.abs(Number(card.account?.current_balance ?? 0))
            const limit      = Number(card.credit_limit)
            const utilPct    = limit > 0 ? (balance / limit) * 100 : 0
            const isHighUtil = utilPct > 30

            return (
              <Card key={card.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ backgroundColor: `${card.account?.color ?? '#3b82f6'}20` }}
                  >
                    <CreditCard
                      className="w-5 h-5"
                      style={{ color: card.account?.color ?? '#3b82f6' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {card.account?.name ?? '—'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Corte: día {card.cut_day} · Pago: día {card.due_day}
                      {card.annual_fee > 0 && ` · Comisión anual: ${formatCurrency(card.annual_fee, card.account?.currency)}`}
                    </p>
                  </div>
                  {isHighUtil && (
                    <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCard(card)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(card)}
                      disabled={deletingId === card.id}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Cancelar tarjeta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Utilización */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Utilización</span>
                    <span className={isHighUtil ? 'text-yellow-400 font-medium' : 'text-slate-300'}>
                      {utilPct.toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar value={utilPct} />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Usado: {formatCurrency(balance, card.account?.currency)}</span>
                    <span>Límite: {formatCurrency(limit, card.account?.currency)}</span>
                  </div>
                </div>

                {/* Cashback */}
                {Object.keys(card.cashback_rules).length > 0 && (
                  <div className="pt-3 border-t border-slate-800">
                    <p className="text-xs font-medium text-slate-400 mb-2">Cashback</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(card.cashback_rules).map(([cat, pct]) => (
                        <span
                          key={cat}
                          className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5"
                        >
                          {cat}: {String(pct)}%
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      <Modal
        open={modalOpen || editingCard !== null}
        onClose={() => { setModalOpen(false); setEditingCard(null) }}
        title={editingCard ? 'Editar tarjeta' : 'Nueva tarjeta de crédito'}
      >
        <TarjetaForm card={editingCard ?? undefined} onSuccess={handleSuccess} />
      </Modal>
    </>
  )
}
