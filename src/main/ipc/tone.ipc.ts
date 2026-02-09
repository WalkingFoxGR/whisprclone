import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getDatabase } from '../db/database'
import { ToneProfilesRepository } from '../db/repositories/tone-profiles.repo'
import { getActiveAppIdentifier } from '../services/tone.service'
import type { ToneProfileInput } from '../../shared/types'

export function registerToneHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.TONE_GET_ALL, () => {
    const db = getDatabase()
    const repo = new ToneProfilesRepository(db)
    return repo.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.TONE_SET, (_event, input: ToneProfileInput) => {
    const db = getDatabase()
    const repo = new ToneProfilesRepository(db)
    return repo.set(input)
  })

  ipcMain.handle(IPC_CHANNELS.TONE_REMOVE, (_event, appIdentifier: string) => {
    const db = getDatabase()
    const repo = new ToneProfilesRepository(db)
    repo.remove(appIdentifier)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.TONE_DETECT_APP, async () => {
    return getActiveAppIdentifier()
  })
}
