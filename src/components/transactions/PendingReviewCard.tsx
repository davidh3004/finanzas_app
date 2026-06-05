'use client'

import { useState } from 'react'
import { confirmTransaction, discardTransaction, updateTransactionCategory } from '@/app/actions/transactions'
import type { Transaction, Category } from '@/types/database'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Check, X, ChevronDown, Loader2, Clock } from 'lucide-react'

interface PendingReviewCardProps {
  transaction: Transaction & {
    category?: { id: string; name: string } | null
    account?: { id: string; name: string } | null
  }
  categories: Category[]
}

export default function PendingReviewCard({ transaction: t, categories }: PendingReviewCardProps) {
  const [categoryId, setCategoryId] = useState(t.category_id ?? t.ai_category_suggestion ?? '')
  const [confirming, setConfirming] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const [done, setDone] = useState(false)

  const parentCategories = categories.filter(c => c.parent_id === null && c.kind !== 'transfer')
  const childCategories  = categories.filter(c => c.parent_id !== null)

  async function handleConfirm() {
    setConfirming(true)
    // Si cambió la categoría, actualizarla primero
    if (categoryId && categoryId !== t.category_id) {
      await updateTransactionCategory(t.id, categoryId)
    }
    await confirmTransaction(t.id)
    setDone(true)
    setConfirming(false)
  }

  async function handleDiscard() {
    setDiscarding(true)
    await discardTransaction(t.id)
    setDone(true)
    setDiscarding(false)
  }

  if (done) return null

  const aiSuggested = t.ai_category_suggestion === categoryId && t.ai_confidence

  return (
    <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/50 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {t.merchant ?? t.description ?? 'Sin nombre'}
            </p>
            <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
          </div>
        </div>
        <span className={cn(
          'text-sm font-bold flex-shrink-0',
          t.type === 'income' ? 'text-emerald-400' : 'text-red-400'
        )}>
          {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, t.currency)}
        </span>
      </div>

      {/* Selector de categoría */}
      <div className="relative">
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value)}
          className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 pr-7"
        >
          <option value="">Sin categoría</option>
          {parentCategories.map(parent => {
            const children = childCategories.filter(c => c.parent_id === parent.id)
            if (children.length === 0) {
              return <option key={parent.id} value={parent.id}>{parent.name}</option>
            }
            return (
              <optgroup key={parent.id} label={parent.name}>
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </optgroup>
            )
          })}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
        {aiSuggested && (
          <span className="absolute left-3 -top-2 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30">
            AI · {Math.round(Number(t.ai_confidence) * 100)}%
          </span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          onClick={handleDiscard}
          disabled={discarding || confirming}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50"
        >
          {discarding ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          Descartar
        </button>
        <button
          onClick={handleConfirm}
          disabled={confirming || discarding}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-medium transition-colors disabled:opacity-50"
        >
          {confirming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Confirmar
        </button>
      </div>
    </div>
  )
}
