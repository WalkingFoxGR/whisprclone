import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'

const recorderApi = {
  onStartRecording: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.RECORDING_START, () => callback())
  },

  onStopRecording: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.RECORDING_STOP, () => callback())
  },

  sendAudioData: (data: ArrayBuffer) => {
    ipcRenderer.send(IPC_CHANNELS.RECORDING_AUDIO_DATA, data)
  },

  sendRecordingComplete: (audioData: ArrayBuffer) => {
    ipcRenderer.send('recording:complete', audioData)
  },

  sendAudioLevel: (level: number) => {
    ipcRenderer.send(IPC_CHANNELS.RECORDING_AUDIO_LEVEL, level)
  },
}

contextBridge.exposeInMainWorld('recorderApi', recorderApi)

export type RecorderAPI = typeof recorderApi
