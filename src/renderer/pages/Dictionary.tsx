import { useEffect, useState } from 'react'
import { Plus, Trash2, Search, BookOpen } from 'lucide-react'
import { useDictionaryStore } from '../stores/dictionary.store'
import { cn } from '../lib/cn'

export default function Dictionary() {
  const { entries, loading, fetchAll, add, remove } = useDictionaryStore()
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newWord, setNewWord] = useState('')
  const [newReplacement, setNewReplacement] = useState('')
  const [newCategory, setNewCategory] = useState<'general' | 'name' | 'technical'>('general')

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const filtered = entries.filter(
    (e) =>
      e.word.toLowerCase().includes(search.toLowerCase()) ||
      (e.replacement && e.replacement.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAdd = async () => {
    if (!newWord.trim()) return
    await add({
      word: newWord.trim(),
      replacement: newReplacement.trim() || undefined,
      category: newCategory,
    })
    setNewWord('')
    setNewReplacement('')
    setShowAddForm(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dictionary</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Custom words and names for better transcription accuracy
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add word
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="Word or name"
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              autoFocus
            />
            <input
              type="text"
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              placeholder="Replacement (optional)"
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['general', 'name', 'technical'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-medium capitalize',
                    newCategory === cat
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newWord.trim()}
                className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search dictionary..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
        />
      </div>

      {/* Entries list */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              {search ? 'No matches found' : 'No words yet. Add your first word!'}
            </p>
          </div>
        ) : (
          filtered.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-4 py-3 group">
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm">{entry.word}</span>
                {entry.replacement && (
                  <span className="text-xs text-gray-400">
                    &rarr; {entry.replacement}
                  </span>
                )}
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs',
                    entry.category === 'name'
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : entry.category === 'technical'
                        ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  )}
                >
                  {entry.category}
                </span>
              </div>
              <button
                onClick={() => remove(entry.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 rounded transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
