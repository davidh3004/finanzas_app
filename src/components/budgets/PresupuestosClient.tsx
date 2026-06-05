'use client'

import { useState, useRef } from 'react'
import { upsertBudget, deleteBudget } from '@/app/actions/budgets'
import { formatCurrency, cn } from '@/lib/utils'
import { Pencil, Check, X, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CategoryRow {
  id: string
  name: string
  color: string | null
  spent: number
  budget: number | null
  currency: string
}

interface PresupuestosClientProps {
  categories: CategoryRow[]
  totalGastos: number
}

export default function PresupuestosClient({ categories, totalGastos }: PresupuestosClientProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function startEdit(cat: CategoryRow) {
    setEditingId(cat.id)
    setEditValue(cat.budget ? String(cat.budget) : '')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function saveEdit(categoryId: string) {
    const amount = parseFloat(editValue.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) {
      setEditingId(null)
      return
    }
    setSaving(true)
    await upsertBudget(categoryId, amount)
    setSaving(false)
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(categoryId: string) {
    await deleteBudget(categoryId)
    router.refresh()
  }

  function cancelEdit() {
    setEditingId(null)
    setEditValue('')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Resumen */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
        <span className="text-sm text-slate-400">Total gastado este mes</span>
        <span className="text-lg font-bold text-red-400">{formatCurrency(totalGastos)}</span>
      </div>

      {/* Tabla de categorías */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800 grid grid-cols-12 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <span className="col-span-5">Categoría</span>
          <span className="col-span-3 text-right">Gastado</span>
          <span className="col-span-4 text-right">Límite</span>
        </div>

        <div className="divide-y divide-slate-800">
          {categories.map(cat => {
            const hasBudget = cat.budget !== null && cat.budget > 0
            const pct = hasBudget ? Math.min((cat.spent / cat.budget!) * 100, 100) : 0
            const overBudget = hasBudget && cat.spent > cat.budget!
            const isEditing = editingId === cat.id

            return (
              <div key={cat.id} className="px-4 py-3">
                {/* Fila principal */}
                <div className="grid grid-cols-12 items-center">
                  {/* Nombre */}
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color ?? '#64748b' }}
                    />
                    <span className="text-sm font-medium text-slate-200 truncate">{cat.name}</span>
                  </div>

                  {/* Gastado */}
                  <div className="col-span-3 text-right">
                    <span className={cn(
                      'text-sm font-semibold',
                      overBudget ? 'text-red-400' : 'text-slate-300'
                    )}>
                      {formatCurrency(cat.spent)}
                    </span>
                  </div>

                  {/* Límite — editable inline */}
                  <div className="col-span-4 flex items-center justify-end gap-1.5">
                    {isEditing ? (
                      <>
                        <input
                          ref={inputRef}
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEdit(cat.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          placeholder="0"
                          className="w-24 bg-slate-700 border border-emerald-500 rounded-lg px-2 py-1 text-xs text-white text-right focus:outline-none"
                          disabled={saving}
                        />
                        <button onClick={() => saveEdit(cat.id)} disabled={saving}
                          className="text-emerald-400 hover:text-emerald-300">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={cancelEdit}
                          className="text-slate-500 hover:text-slate-300">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={cn(
                          'text-sm',
                          hasBudget ? 'text-slate-400' : 'text-slate-600'
                        )}>
                          {hasBudget ? formatCurrency(cat.budget!) : 'Sin límite'}
                        </span>
                        <button
                          onClick={() => startEdit(cat)}
                          className="text-slate-600 hover:text-slate-300 transition-colors ml-1"
                          title="Editar límite"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {hasBudget && (
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="text-slate-700 hover:text-red-400 transition-colors"
                            title="Quitar límite"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Barra de progreso (solo si hay límite) */}
                {hasBudget && (
                  <div className="mt-2">
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                      <span>{pct.toFixed(0)}% usado</span>
                      {overBudget && (
                        <span className="text-red-400">
                          +{formatCurrency(cat.spent - cat.budget!)} excedido
                        </span>
                      )}
                      {!overBudget && hasBudget && (
                        <span className="text-slate-600">
                          {formatCurrency(cat.budget! - cat.spent)} restante
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-slate-600 text-center">
        Haz clic en el ícono <Pencil className="inline w-3 h-3" /> para editar un límite. Presiona Enter para guardar.
      </p>
    </div>
  )
}
