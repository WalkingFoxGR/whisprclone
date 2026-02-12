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

export const useRecordingStore = create<RecordingStore>((set, get) => ({
  state: 'idle',
  duration_ms: 0,
  error: null,
  lastResult: null,
  audioLevel: 0,

  updateStatus: (status: RecordingStatus) => {
    // Preserve lastResult if the new status doesn't include one
    // (e.g., going from idle→recording shouldn't clear the previous result)
    const currentResult = get().lastResult
    set({
      state: status.state,
      duration_ms: status.duration_ms ?? 0,
      error: status.error ?? null,
      lastResult: status.result ?? currentResult,
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
