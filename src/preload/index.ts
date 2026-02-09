import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import type {
  AppSettings,
  DictionaryEntry,
  DictionaryInput,
  Snippet,
  SnippetInput,
  ToneProfile,
  ToneProfileInput,
  UsageStats,
  RecordingStatus,
  PermissionStatus,
} from '../shared/types'

const api = {
  settings: {
    getAll: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_ALL),
    get: (key: string): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET, key),
    set: (key: string, value: string | number | boolean): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, String(value)),
  },

  recording: {
    start: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.RECORDING_START),
    stop: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.RECORDING_STOP),
  },

  transcription: {
    transcribe: (audioData: ArrayBuffer): Promise<any> =>
      ipcRenderer.invoke(IPC_CHANNELS.TRANSCRIBE_AUDIO, audioData),
    polish: (text: string, tone?: string): Promise<any> =>
      ipcRenderer.invoke(IPC_CHANNELS.POLISH_TEXT, text, tone),
    paste: (text: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.PASTE_TEXT, text),
  },

  dictionary: {
    getAll: (): Promise<DictionaryEntry[]> => ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_GET_ALL),
    add: (input: DictionaryInput): Promise<DictionaryEntry> =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_ADD, input),
    update: (id: number, input: Partial<DictionaryInput>): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_UPDATE, id, input),
    remove: (id: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.DICTIONARY_REMOVE, id),
  },

  snippets: {
    getAll: (): Promise<Snippet[]> => ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_GET_ALL),
    add: (input: SnippetInput): Promise<Snippet> =>
      ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_ADD, input),
    update: (id: number, input: Partial<SnippetInput>): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_UPDATE, id, input),
    remove: (id: number): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.SNIPPETS_REMOVE, id),
  },

  tone: {
    getAll: (): Promise<ToneProfile[]> => ipcRenderer.invoke(IPC_CHANNELS.TONE_GET_ALL),
    set: (input: ToneProfileInput): Promise<ToneProfile> =>
      ipcRenderer.invoke(IPC_CHANNELS.TONE_SET, input),
    remove: (appIdentifier: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.TONE_REMOVE, appIdentifier),
    detectApp: (): Promise<{ identifier: string; name: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.TONE_DETECT_APP),
  },

  usage: {
    getStats: (): Promise<UsageStats> => ipcRenderer.invoke(IPC_CHANNELS.USAGE_GET_STATS),
    getDaily: (days?: number): Promise<any[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.USAGE_GET_DAILY, days),
  },

  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),
    checkPermissions: (): Promise<PermissionStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_PERMISSIONS),
    requestPermission: (type: 'microphone' | 'accessibility'): Promise<boolean> =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_REQUEST_PERMISSION, type),
  },

  // Event listeners
  on: (channel: string, callback: (...args: any[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, listener)
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },

  onRecordingStatus: (callback: (status: RecordingStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: RecordingStatus) =>
      callback(status)
    ipcRenderer.on(IPC_CHANNELS.RECORDING_STATUS, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.RECORDING_STATUS, listener)
    }
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
