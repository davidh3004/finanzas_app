'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/categories'
import type { Category, CategoryKind } from '@/types/database'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, Loader2, ChevronRight, ChevronDown } from 'lucide-react'

interface CategoriesClientProps {
  categories: Category[]
}

const KIND_LABELS: Record<CategoryKind, string> = {
  expense:  'Gastos',
  income:   'Ingresos',
  saving:   'Ahorro',
  transfer: 'Transferencias',
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#64748b',
]

const VISIBLE_KINDS: CategoryKind[] = ['expense', 'income', 'saving']

interface InlineForm {
  name:     string
  color:    string
  parentId: string | null
  kind:     CategoryKind
}

export default function CategoriesClient({ categories }: CategoriesClientProps) {
  const router = useRouter()

  // { [key]: categoryId or `new-${kind}` or `new-child-${parentId}` }
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [addingKey, setAddingKey]   = useState<string | null>(null)
  const [form, setForm]             = useState<InlineForm>({ name: '', color: COLORS[0], parentId: null, kind: 'expense' })
  const [saving, setSaving]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())

  const parentCategories = categories.filter(c => c.parent_id === null)
  const childMap: Record<string, Category[]> = {}
  for (const c of categories.filter(c => c.parent_id)) {
    if (!childMap[c.parent_id!]) childMap[c.parent_id!] = []
    childMap[c.parent_id!].push(c)
  }

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function startAdd(kind: CategoryKind, parentId: string | null) {
    setAddingKey(parentId ? `child-${parentId}` : `root-${kind}`)
    setForm({ name: '', color: COLORS[0], parentId, kind })
    setEditingId(null)
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setAddingKey(null)
    setForm({ name: cat.name, color: cat.color ?? COLORS[0], parentId: cat.parent_id, kind: cat.kind })
  }

  function cancel() {
    setEditingId(null)
    setAddingKey(null)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    let result: { success: boolean; error?: string }

    if (editingId) {
      result = await updateCategory(editingId, { name: form.name, color: form.color })
    } else {
      result = await createCategory({ name: form.name, color: form.color, kind: form.kind, parentId: form.parentId })
    }

    setSaving(false)
    if (result.success) {
      cancel()
      router.refresh()
    }
  }

  async function handleDelete(cat: Category) {
    const hasChildren = (childMap[cat.id] ?? []).length > 0
    const msg = hasChildren
      ? `"${cat.name}" tiene subcategorías. ¿Eliminar igualmente?`
      : `¿Eliminar la categoría "${cat.name}"?`
    if (!confirm(msg)) return
    setDeletingId(cat.id)
    await deleteCategory(cat.id)
    setDeletingId(null)
    router.refresh()
  }

  function InlineEditor({ onSave }: { onSave: () => void }) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-slate-800/50 rounded-xl">
        <div className="flex gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setForm(f => ({ ...f, color: c }))}
              className={cn(
                'w-5 h-5 rounded-full transition-all flex-shrink-0',
                form.color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110' : 'opacity-60 hover:opacity-100'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Nombre de la categoría"
          autoFocus
          onKeyDown={e => {
            if (e.key === 'Enter') onSave()
            if (e.key === 'Escape') cancel()
          }}
          className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
        />
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Guardar'}
        </button>
        <button
          onClick={cancel}
          className="text-slate-500 hover:text-slate-300 text-xs"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {VISIBLE_KINDS.map(kind => {
        const parents = parentCategories.filter(c => c.kind === kind)
        return (
          <div key={kind} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Kind header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {KIND_LABELS[kind]}
              </p>
              <button
                onClick={() => startAdd(kind, null)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
              >
                <Plus className="w-3 h-3" /> Nueva categoría
              </button>
            </div>

            {/* Add root category form */}
            {addingKey === `root-${kind}` && (
              <div className="px-4 py-2 border-b border-slate-800">
                <InlineEditor onSave={handleSave} />
              </div>
            )}

            {/* Categories */}
            <div className="divide-y divide-slate-800/50">
              {parents.length === 0 && addingKey !== `root-${kind}` && (
                <p className="text-xs text-slate-600 px-4 py-3">Sin categorías aún.</p>
              )}
              {parents.map(cat => {
                const children   = childMap[cat.id] ?? []
                const isExpanded = expanded.has(cat.id)

                return (
                  <div key={cat.id}>
                    {/* Parent row */}
                    {editingId === cat.id ? (
                      <div className="px-4 py-2">
                        <InlineEditor onSave={handleSave} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2.5 group">
                        {children.length > 0 ? (
                          <button onClick={() => toggleExpanded(cat.id)} className="flex-shrink-0 text-slate-600 hover:text-slate-300">
                            {isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5" />
                              : <ChevronRight className="w-3.5 h-3.5" />
                            }
                          </button>
                        ) : (
                          <span className="w-3.5 h-3.5 flex-shrink-0" />
                        )}
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color ?? '#64748b' }}
                        />
                        <span className="text-sm font-medium text-slate-200 flex-1">{cat.name}</span>
                        {children.length > 0 && (
                          <span className="text-xs text-slate-600">{children.length}</span>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startAdd(kind, cat.id)}
                            className="p-1 rounded text-slate-600 hover:text-emerald-400 transition-colors"
                            title="Añadir subcategoría"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          {!cat.is_system && (
                            <>
                              <button
                                onClick={() => startEdit(cat)}
                                className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(cat)}
                                disabled={deletingId === cat.id}
                                className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Children */}
                    {(isExpanded || addingKey === `child-${cat.id}`) && (
                      <div className="ml-8 border-l border-slate-800/60">
                        {children.map(child => (
                          <div key={child.id}>
                            {editingId === child.id ? (
                              <div className="px-4 py-2">
                                <InlineEditor onSave={handleSave} />
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-4 py-2 group">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: child.color ?? '#64748b' }}
                                />
                                <span className="text-sm text-slate-300 flex-1">{child.name}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {!child.is_system && (
                                    <>
                                      <button
                                        onClick={() => startEdit(child)}
                                        className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors"
                                      >
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(child)}
                                        disabled={deletingId === child.id}
                                        className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {/* Add child form */}
                        {addingKey === `child-${cat.id}` && (
                          <div className="px-4 py-2">
                            <InlineEditor onSave={handleSave} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
