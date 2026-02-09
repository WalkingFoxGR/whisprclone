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

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleAdd = async () => {
    if (!newTrigger.trim() || !newExpansion.trim()) return
    await add({ trigger_phrase: newTrigger.trim(), expansion: newExpansion.trim() })
    setNewTrigger('')
    setNewExpansion('')
    setShowAddForm(false)
  }

  const startEdit = (snippet: any) => {
    setEditingId(snippet.id)
    setEditTrigger(snippet.trigger_phrase)
    setEditExpansion(snippet.expansion)
  }

  const saveEdit = async () => {
    if (!editingId) return
    await update(editingId, { trigger_phrase: editTrigger, expansion: editExpansion })
    setEditingId(null)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Snippets</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Voice shortcuts that expand to full text
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add snippet
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <input
            type="text"
            value={newTrigger}
            onChange={(e) => setNewTrigger(e.target.value)}
            placeholder='Trigger phrase (e.g., "my calendar")'
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            autoFocus
          />
          <textarea
            value={newExpansion}
            onChange={(e) => setNewExpansion(e.target.value)}
            placeholder="Expansion text (the full text that will be inserted)"
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!newTrigger.trim() || !newExpansion.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Snippets list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-8">Loading...</div>
        ) : snippets.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
            <Zap className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              No snippets yet. Create one to speed up common phrases!
            </p>
          </div>
        ) : (
          snippets.map((snippet) => (
            <div
              key={snippet.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 group"
            >
              {editingId === snippet.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editTrigger}
                    onChange={(e) => setEditTrigger(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  />
                  <textarea
                    value={editExpansion}
                    onChange={(e) => setEditExpansion(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={saveEdit} className="p-1.5 text-indigo-600 hover:text-indigo-700">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-sm">"{snippet.trigger_phrase}"</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs text-gray-400 mr-2">
                        Used {snippet.use_count}x
                      </span>
                      <button
                        onClick={() => startEdit(snippet)}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(snippet.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {snippet.expansion}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
