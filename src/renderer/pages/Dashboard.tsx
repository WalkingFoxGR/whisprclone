import { useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Mic, Clock, Type, TrendingUp, Zap } from 'lucide-react'
import { useUsageStore } from '../stores/usage.store'
import { useRecordingStore } from '../stores/recording.store'
import { cn } from '../lib/cn'

export default function Dashboard() {
  const { stats, loading, fetchStats } = useUsageStore()
  const lastResult = useRecordingStore((s) => s.lastResult)

  useEffect(() => {
    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const formatTimeSaved = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track your voice-to-text productivity
        </p>
      </div>

      {/* Last transcription result */}
      {lastResult && (
        <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Latest transcription ({lastResult.word_count} words)
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {lastResult.polished_text}
          </p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          icon={Type}
          label="Words today"
          value={stats?.today.words.toLocaleString() ?? '0'}
          sublabel={`${stats?.today.recordings ?? 0} recordings`}
          color="indigo"
        />
        <StatCard
          icon={Clock}
          label="Time saved today"
          value={formatTimeSaved(stats?.today.time_saved_ms ?? 0)}
          sublabel="vs typing"
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Words this week"
          value={stats?.week.words.toLocaleString() ?? '0'}
          sublabel={`${stats?.week.recordings ?? 0} recordings`}
          color="blue"
        />
        <StatCard
          icon={Mic}
          label="All time"
          value={stats?.all_time.words.toLocaleString() ?? '0'}
          sublabel={`${stats?.all_time.recordings ?? 0} total recordings`}
          color="purple"
        />
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Words per day</h2>
        {stats && stats.daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}
                formatter={(value: number) => [value.toLocaleString(), 'Words']}
              />
              <Bar dataKey="total_words" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm">
            {loading ? 'Loading...' : 'No data yet. Start speaking to see your stats!'}
          </div>
        )}
      </div>

      {/* Top apps */}
      {stats && stats.top_apps.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Top apps this month</h2>
          <div className="space-y-3">
            {stats.top_apps.map((app, i) => (
              <div key={app.app} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-400 w-5">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{app.app}</span>
                    <span className="text-xs text-gray-500">{app.count} recordings</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${(app.count / stats.top_apps[0].count) * 100}%` }}
                    />
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

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
}: {
  icon: any
  label: string
  value: string
  sublabel: string
  color: 'indigo' | 'green' | 'blue' | 'purple'
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400',
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
    </div>
  )
}
