import { ipcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { transcribe, polish, validateApiKey } from '../services/openai.service'
import { writeAndPaste } from '../services/clipboard.service'
import { getToneForActiveApp } from '../services/tone.service'
import { getDatabase } from '../db/database'
import { SnippetsRepository } from '../db/repositories/snippets.repo'
import { UsageRepository } from '../db/repositories/usage.repo'
import { SettingsRepository } from '../db/repositories/settings.repo'
import type { RecordingStatus } from '../../shared/types'

let audioChunks: Buffer[] = []
let recordingStartTime: number | null = null

export function registerTranscriptionHandlers(mainWindow: () => BrowserWindow | null): void {
  // Collect audio data from hidden recorder window
  ipcMain.on(IPC_CHANNELS.RECORDING_AUDIO_DATA, (_event, data: ArrayBuffer) => {
    audioChunks.push(Buffer.from(data))
  })

  // Handle recording start - reset audio buffer
  ipcMain.on(IPC_CHANNELS.RECORDING_START + ':main', () => {
    audioChunks = []
    recordingStartTime = Date.now()
  })

  // Handle complete recording (audio blob received)
  ipcMain.handle(IPC_CHANNELS.TRANSCRIBE_AUDIO, async (_event, audioData: ArrayBuffer) => {
    const win = mainWindow()
    const startTime = Date.now()
    const recordingDuration = recordingStartTime ? startTime - recordingStartTime : 0

    try {
      const sendStatus = (status: RecordingStatus) => {
        win?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, status)
      }

      sendStatus({ state: 'transcribing' })

      // Step 1: Transcribe
      const audioBuffer = Buffer.from(audioData)
      const { text: rawText, language } = await transcribe(audioBuffer)

      if (!rawText || rawText.trim().length === 0) {
        sendStatus({ state: 'idle' })
        return { success: false, error: 'No speech detected' }
      }

      // Step 2: Check for snippet triggers
      const db = getDatabase()
      const snippetsRepo = new SnippetsRepository(db)
      const matchedSnippet = snippetsRepo.findMatchingSnippet(rawText)

      let textToPolish = rawText
      let snippetUsed: string | null = null

      if (matchedSnippet) {
        textToPolish = rawText.replace(
          new RegExp(matchedSnippet.trigger_phrase, 'gi'),
          matchedSnippet.expansion
        )
        snippetsRepo.incrementUseCount(matchedSnippet.id)
        snippetUsed = matchedSnippet.trigger_phrase
      }

      // Step 3: Get tone for active app
      sendStatus({ state: 'polishing' })
      const { tone, customInstructions, appName } = await getToneForActiveApp()

      // Step 4: Polish text
      const polishedText = await polish(textToPolish, tone, customInstructions)
      const processingDuration = Date.now() - startTime
      const wordCount = polishedText.split(/\s+/).filter(Boolean).length

      // Step 5: Paste
      const settings = new SettingsRepository(db)
      const autoPaste = settings.get('auto_paste') === 'true'

      if (autoPaste) {
        sendStatus({ state: 'pasting' })
        writeAndPaste(polishedText)
      }

      // Step 6: Log usage
      const usageRepo = new UsageRepository(db)
      usageRepo.log({
        raw_text: rawText,
        polished_text: polishedText,
        word_count: wordCount,
        recording_duration_ms: recordingDuration,
        processing_duration_ms: processingDuration,
        target_app: appName,
        language_detected: language ?? undefined,
        tone_used: tone,
        snippet_used: snippetUsed ?? undefined,
      })

      sendStatus({
        state: 'idle',
        result: { raw_text: rawText, polished_text: polishedText, word_count: wordCount },
      })

      // Reset
      audioChunks = []
      recordingStartTime = null

      return { success: true, rawText, polishedText, wordCount }
    } catch (error: any) {
      const win2 = mainWindow()
      win2?.webContents.send(IPC_CHANNELS.RECORDING_STATUS, {
        state: 'error',
        error: error.message || 'Transcription failed',
      })

      audioChunks = []
      recordingStartTime = null

      return { success: false, error: error.message }
    }
  })

  // Polish text directly (for re-polish or manual input)
  ipcMain.handle(IPC_CHANNELS.POLISH_TEXT, async (_event, text: string, tone?: string) => {
    try {
      const polished = await polish(text, tone || 'neutral')
      return { success: true, text: polished }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Paste text
  ipcMain.handle(IPC_CHANNELS.PASTE_TEXT, (_event, text: string) => {
    writeAndPaste(text)
    return true
  })
}
