import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { getDatabase } from '../db/database'
import { SnippetsRepository } from '../db/repositories/snippets.repo'
import type { SnippetInput } from '../../shared/types'

export function registerSnippetsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SNIPPETS_GET_ALL, () => {
    const db = getDatabase()
    const repo = new SnippetsRepository(db)
    return repo.getAll()
  })

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_ADD, (_event, input: SnippetInput) => {
    const db = getDatabase()
    const repo = new SnippetsRepository(db)
    return repo.add(input)
  })

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_UPDATE, (_event, id: number, input: Partial<SnippetInput>) => {
    const db = getDatabase()
    const repo = new SnippetsRepository(db)
    repo.update(id, input)
    return true
  })

  ipcMain.handle(IPC_CHANNELS.SNIPPETS_REMOVE, (_event, id: number) => {
    const db = getDatabase()
    const repo = new SnippetsRepository(db)
    repo.remove(id)
    return true
  })
}
