import { useEffect, useState, useCallback } from 'react'
import { ClipboardCopy, Check, Search, ChevronDown, ChevronUp, Clock, Mic, DollarSign } from 'lucide-react'
import type { UsageEntry } from '../../shared/types'
import { cn } from '../lib/cn'

export default function History() {
  const [entries, setEntries] = useState<UsageEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const data = await window.api.usage.getDaily(100)
      setEntries(data)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Re-fetch when a new recording completes
  useEffect(() => {
    const unsub = window.api.onRecordingStatus((status) => {
      if (status.state === 'idle' && status.result) {
        fetchEntries()
      }
    })
    return unsub
  }, [fetchEntries])

  const handleCopy = async (text: string, id: number) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = entries.filter((e) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      e.polished_text?.toLowerCase().includes(q) ||
      e.raw_text?.toLowerCase().includes(q) ||
      e.target_app?.toLowerCase().includes(q)
    )
  })

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp * 1000)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    const time = d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
    if (isToday) return `Today ${time}`
    if (isYesterday) return `Yesterday ${time}`
    return `${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })} ${time}`
  }

  const formatDuration = (ms: number) => {
    if (!ms) return ''
    const sec = Math.round(ms / 1000)
    if (sec < 60) return `${sec}s`
    return `${Math.floor(sec / 60)}m ${sec % 60}s`
  }

  const formatCost = (cents: number) => {
    if (!cents || cents === 0) return ''
    if (cents < 1) return `$${(cents / 100).toFixed(4)}`
    return `$${(cents / 100).toFixed(2)}`
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Your recent transcriptions — click to copy
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcriptions..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
        />
      </div>

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-end gap-1 h-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-indigo-400 rounded-full animate-pulse"
                style={{ height: `${12 + Math.random() * 12}px`, animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Mic className="w-10 h-10 mb-3 text-gray-200 dark:text-gray-700" />
          <p className="text-sm font-medium">
            {search ? 'No matching transcriptions' : 'No transcriptions yet'}
          </p>
          {!search && (
            <p className="text-xs mt-1">Start speaking to see your history here</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id
            const text = entry.polished_text || entry.raw_text || ''
            const isCopied = copiedId === entry.id

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                {/* Main row */}
                <div className="flex items-start gap-3 p-4">
                  {/* Text content */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <p className={cn(
                      'text-sm text-gray-700 dark:text-gray-300 leading-relaxed',
                      !isExpanded && 'line-clamp-2'
                    )}>
                      {text}
                    </p>

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(entry.created_at)}
                      </span>
                      {entry.word_count > 0 && (
                        <span className="text-[11px] text-gray-400">
                          {entry.word_count} words
                        </span>
                      )}
                      {entry.target_app && (
                        <span className="text-[11px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400">
                          {entry.target_app}
                        </span>
                      )}
                      {entry.tone_used && entry.tone_used !== 'neutral' && (
                        <span className="text-[11px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 rounded-md text-indigo-500 dark:text-indigo-400">
                          {entry.tone_used}
                        </span>
                      )}
                      {entry.recording_duration_ms > 0 && (
                        <span className="text-[11px] text-gray-400">
                          {formatDuration(entry.recording_duration_ms)}
                        </span>
                      )}
                      {entry.estimated_cost_cents > 0 && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5" />
                          {formatCost(entry.estimated_cost_cents)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                    <button
                      onClick={() => handleCopy(text, entry.id)}
                      className={cn(
                        'p-2 rounded-lg transition-all',
                        isCopied
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500'
                          : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                      title="Copy polished text"
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && entry.raw_text && entry.raw_text !== entry.polished_text && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-400">Raw transcription</span>
                      <button
                        onClick={() => handleCopy(entry.raw_text || '', entry.id + 100000)}
                        className={cn(
                          'text-[11px] px-2 py-1 rounded-md transition-all flex items-center gap-1',
                          copiedId === entry.id + 100000
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500'
                            : 'text-gray-400 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                        )}
                      >
                        {copiedId === entry.id + 100000 ? (
                          <><Check className="w-3 h-3" /> Copied</>
                        ) : (
                          <><ClipboardCopy className="w-3 h-3" /> Copy raw</>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-3 border-l-2 border-gray-200 dark:border-gray-700">
                      {entry.raw_text}
                    </p>
                    {entry.transcription_model && (
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
                        <span>Model: {entry.transcription_model}</span>
                        {entry.polish_model && <span>→ {entry.polish_model}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
