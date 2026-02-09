import { create } from 'zustand'
import type { DictionaryEntry, DictionaryInput } from '../../shared/types'

interface DictionaryStore {
  entries: DictionaryEntry[]
  loading: boolean
  fetchAll: () => Promise<void>
  add: (input: DictionaryInput) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useDictionaryStore = create<DictionaryStore>((set, get) => ({
  entries: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const entries = await window.api.dictionary.getAll()
    set({ entries, loading: false })
  },

  add: async (input) => {
    const entry = await window.api.dictionary.add(input)
    set({ entries: [...get().entries, entry].sort((a, b) => a.word.localeCompare(b.word)) })
  },

  remove: async (id) => {
    set({ entries: get().entries.filter((e) => e.id !== id) })
    await window.api.dictionary.remove(id)
  },
}))
