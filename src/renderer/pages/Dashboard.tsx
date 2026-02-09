import { useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Mic, Clock, Type, TrendingUp, Zap, Copy } from 'lucide-react'
import { useUsageStore } from '../stores/usage.store'
import { useRecordingStore } from '../stores/recording.store'
import { cn } from '../lib/cn'

export default function Dashboard() {
  const { stats, loading, fetchStats } = useUsageStore()
  const lastResult = useRecordingStore((s) => s.lastResult)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const formatTimeSaved = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m`
    return '0m'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your voice-to-text productivity at a glance</p>
      </div>

      {/* Last transcription */}
      {lastResult && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Latest Transcription</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 font-medium">
                {lastResult.word_count} words
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(lastResult.polished_text)}
              className="p-2 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">{lastResult.polished_text}</p>
          {lastResult.raw_text !== lastResult.polished_text && (
            <details className="mt-3">
              <summary className="text-xs text-indigo-500 dark:text-indigo-400 cursor-pointer font-medium">View raw transcription</summary>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed pl-3 border-l-2 border-indigo-200 dark:border-indigo-800">
                {lastResult.raw_text}
              </p>
            </details>
          )}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Type} label="Words today" value={stats?.today.words.toLocaleString() ?? '0'}
          sublabel={`${stats?.today.recordings ?? 0} recordings`} gradient="from-indigo-500 to-blue-500" />
        <StatCard icon={Clock} label="Time saved" value={formatTimeSaved(stats?.today.time_saved_ms ?? 0)}
          sublabel="vs typing today" gradient="from-emerald-500 to-teal-500" />
        <StatCard icon={TrendingUp} label="This week" value={stats?.week.words.toLocaleString() ?? '0'}
          sublabel={`${stats?.week.recordings ?? 0} recordings`} gradient="from-blue-500 to-cyan-500" />
        <StatCard icon={Mic} label="All time" value={stats?.all_time.words.toLocaleString() ?? '0'}
          sublabel={`${stats?.all_time.recordings ?? 0} total`} gradient="from-purple-500 to-pink-500" />
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-1">Words per day</h2>
        <p className="text-xs text-gray-400 mb-4">Your daily transcription volume</p>
        {stats && stats.daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                formatter={(value: number) => [value.toLocaleString(), 'Words']} />
              <Bar dataKey="total_words" fill="url(#chartGradient)" radius={[6, 6, 0, 0]} />
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex flex-col items-center justify-center text-gray-400">
            <Mic className="w-10 h-10 mb-3 text-gray-200 dark:text-gray-700" />
            <p className="text-sm font-medium">{loading ? 'Loading...' : 'No data yet'}</p>
            {!loading && <p className="text-xs mt-1">Start speaking to see your stats here</p>}
          </div>
        )}
      </div>

      {/* Top apps */}
      {stats && stats.top_apps.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-1">Top apps</h2>
          <p className="text-xs text-gray-400 mb-4">Where you dictate the most this month</p>
          <div className="space-y-3">
            {stats.top_apps.map((app, i) => (
              <div key={app.app} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-5 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{app.app}</span>
                    <span className="text-xs text-gray-400 font-medium">{app.count} recordings</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${(app.count / stats.top_apps[0].count) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sublabel, gradient }: {
  icon: any; label: string; value: string; sublabel: string; gradient: string
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
      <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3', gradient)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-xl font-bold mt-0.5 tracking-tight">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{sublabel}</p>
    </div>
  )
}
