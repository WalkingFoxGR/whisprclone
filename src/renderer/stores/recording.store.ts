import { create } from 'zustand'
import type { RecordingState, RecordingStatus } from '../../shared/types'

interface RecordingStore {
  state: RecordingState
  duration_ms: number
  error: string | null
  lastResult: { raw_text: string; polished_text: string; word_count: number } | null
  audioLevel: number

  updateStatus: (status: RecordingStatus) => void
  setAudioLevel: (level: number) => void
  reset: () => void
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  state: 'idle',
  duration_ms: 0,
  error: null,
  lastResult: null,
  audioLevel: 0,

  updateStatus: (status: RecordingStatus) => {
    set({
      state: status.state,
      duration_ms: status.duration_ms ?? 0,
      error: status.error ?? null,
      lastResult: status.result ?? null,
    })
  },

  setAudioLevel: (level: number) => {
    set({ audioLevel: level })
  },

  reset: () => {
    set({
      state: 'idle',
      duration_ms: 0,
      error: null,
      lastResult: null,
      audioLevel: 0,
    })
  },
}))
