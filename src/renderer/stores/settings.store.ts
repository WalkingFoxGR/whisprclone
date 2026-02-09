import { create } from 'zustand'
import type { AppSettings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/constants'

interface SettingsStore {
  settings: AppSettings
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSetting: (key: keyof AppSettings, value: any) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS as AppSettings,
  loading: true,

  fetchSettings: async () => {
    set({ loading: true })
    const settings = await window.api.settings.getAll()
    set({ settings, loading: false })
  },

  updateSetting: async (key, value) => {
    await window.api.settings.set(key, value)
    set({ settings: { ...get().settings, [key]: value } })
  },
}))
