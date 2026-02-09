import { useEffect, useState } from 'react'
import { Plus, Trash2, Zap, Edit2, Check, X } from 'lucide-react'
import { useSnippetsStore } from '../stores/snippets.store'

export default function Snippets() {
  const { snippets, loading, fetchAll, add, update, remove } = useSnippetsStore()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTrigger, setNewTrigger] = useState('')
  const [newExpansion, setNewExpansion] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTrigger, setEditTrigger] = useState('')
  const [editExpansion, setEditExpansion] = useState('')

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleAdd = async () => {
    if (!newTrigger.trim() || !newExpansion.trim()) return
    await add({ trigger_phrase: newTrigger.trim(), expansion: newExpansion.trim() })
    setNewTrigger(''); setNewExpansion(''); setShowAddForm(false)
  }

  const startEdit = (snippet: any) => { setEditingId(snippet.id); setEditTrigger(snippet.trigger_phrase); setEditExpansion(snippet.expansion) }
  const saveEdit = async () => { if (!editingId) return; await update(editingId, { trigger_phrase: editTrigger, expansion: editExpansion }); setEditingId(null) }

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Snippets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Voice shortcuts that expand to full text</p>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm">
          <Plus className="w-4 h-4" /> Add snippet
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3 shadow-sm">
          <input type="text" value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)}
            placeholder='Trigger phrase (e.g., "my calendar")' autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <textarea value={newExpansion} onChange={(e) => setNewExpansion(e.target.value)}
            placeholder="Expansion text (the full text that replaces the trigger)" rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            <button onClick={handleAdd} disabled={!newTrigger.trim() || !newExpansion.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : snippets.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-10 text-center shadow-sm">
            <Zap className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">No snippets yet</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Create voice shortcuts for common phrases</p>
          </div>
        ) : (
          snippets.map((snippet) => (
            <div key={snippet.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 group shadow-sm">
              {editingId === snippet.id ? (
                <div className="space-y-3">
                  <input type="text" value={editTrigger} onChange={(e) => setEditTrigger(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <textarea value={editExpansion} onChange={(e) => setEditExpansion(e.target.value)} rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    <button onClick={saveEdit} className="p-1.5 text-indigo-600 hover:text-indigo-700"><Check className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                        <Zap className="w-3 h-3 text-amber-500" />
                      </div>
                      <span className="font-medium text-sm">"{snippet.trigger_phrase}"</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-gray-400 mr-2 font-medium">Used {snippet.use_count}x</span>
                      <button onClick={() => startEdit(snippet)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(snippet.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{snippet.expansion}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
