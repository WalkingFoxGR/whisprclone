import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getDatabase } from '../db/database'
import { UsageRepository } from '../db/repositories/usage.repo'

export function registerUsageHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.USAGE_GET_STATS, () => {
    const db = getDatabase()
    const repo = new UsageRepository(db)
    return repo.getStats()
  })

  ipcMain.handle(IPC_CHANNELS.USAGE_GET_DAILY, (_event, days: number = 30) => {
    const db = getDatabase()
    const repo = new UsageRepository(db)
    return repo.getRecentEntries(days)
  })
}
