import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getDatabase } from '../db/database'
import { SettingsRepository } from '../db/repositories/settings.repo'

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, () => {
    const db = getDatabase()
    const repo = new SettingsRepository(db)
    return repo.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_event, key: string) => {
    const db = getDatabase()
    const repo = new SettingsRepository(db)
    return repo.get(key)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, key: string, value: string) => {
    const db = getDatabase()
    const repo = new SettingsRepository(db)
    repo.set(key, String(value))
    return true
  })
}
