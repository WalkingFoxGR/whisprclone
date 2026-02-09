import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getDatabase } from '../db/database'
import { DictionaryRepository } from '../db/repositories/dictionary.repo'
import type { DictionaryInput } from '../../shared/types'

export function registerDictionaryHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DICTIONARY_GET_ALL, () => {
    const db = getDatabase()
    const repo = new DictionaryRepository(db)
    return repo.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_ADD, (_event, input: DictionaryInput) => {
    const db = getDatabase()
    const repo = new DictionaryRepository(db)
    return repo.add(input)
  })

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_UPDATE, (_event, id: number, input: Partial<DictionaryInput>) => {
    const db = getDatabase()
    const repo = new DictionaryRepository(db)
    repo.update(id, input)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.DICTIONARY_REMOVE, (_event, id: number) => {
    const db = getDatabase()
    const repo = new DictionaryRepository(db)
    repo.remove(id)
    return true
  })
}
