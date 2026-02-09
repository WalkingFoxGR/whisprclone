import { create } from 'zustand'
import type { UsageStats } from '../../shared/types'

interface UsageStore {
  stats: UsageStats | null
  loading: boolean
  fetchStats: () => Promise<void>
}

const emptyStats: UsageStats = {
  today: { words: 0, recordings: 0, time_saved_ms: 0 },
  week: { words: 0, recordings: 0, time_saved_ms: 0 },
  month: { words: 0, recordings: 0, time_saved_ms: 0 },
  all_time: { words: 0, recordings: 0 },
  daily: [],
  top_apps: [],
}

export const useUsageStore = create<UsageStore>((set) => ({
  stats: null,
  loading: false,

  fetchStats: async () => {
    set({ loading: true })
    try {
      const stats = await window.api.usage.getStats()
      set({ stats, loading: false })
    } catch {
      set({ stats: emptyStats, loading: false })
    }
  },
}))
