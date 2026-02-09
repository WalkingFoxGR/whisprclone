import { create } from 'zustand'
import type { Snippet, SnippetInput } from '../../shared/types'

interface SnippetsStore {
  snippets: Snippet[]
  loading: boolean
  fetchAll: () => Promise<void>
  add: (input: SnippetInput) => Promise<void>
  update: (id: number, input: Partial<SnippetInput>) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useSnippetsStore = create<SnippetsStore>((set, get) => ({
  snippets: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const snippets = await window.api.snippets.getAll()
    set({ snippets, loading: false })
  },

  add: async (input) => {
    const snippet = await window.api.snippets.add(input)
    set({ snippets: [...get().snippets, snippet] })
  },

  update: async (id, input) => {
    await window.api.snippets.update(id, input)
    await get().fetchAll()
  },

  remove: async (id) => {
    set({ snippets: get().snippets.filter((s) => s.id !== id) })
    await window.api.snippets.remove(id)
  },
}))
