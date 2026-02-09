import OpenAI from 'openai'
import { getDatabase } from '../db/database'
import { SettingsRepository } from '../db/repositories/settings.repo'
import { DictionaryRepository } from '../db/repositories/dictionary.repo'

let client: OpenAI | null = null

function getClient(): OpenAI {
  const db = getDatabase()
  const settings = new SettingsRepository(db)
  const apiKey = settings.get('openai_api_key')

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in Settings.')
  }

  if (!client || (client as any).apiKey !== apiKey) {
    client = new OpenAI({ apiKey })
  }

  return client
}

export async function transcribe(
  audioBuffer: Buffer,
  language?: string
): Promise<{ text: string; language: string | null }> {
  const openai = getClient()
  const db = getDatabase()
  const settings = new SettingsRepository(db)
  const dictionary = new DictionaryRepository(db)

  const model = settings.get('openai_model_transcription') || 'gpt-4o-transcribe'
  const configuredLanguage = settings.get('language') || 'auto'
  const effectiveLanguage = language || (configuredLanguage !== 'auto' ? configuredLanguage : undefined)

  // Include dictionary words in prompt for better recognition
  const dictionaryWords = dictionary.getWordsForPrompt()
  const promptContext = dictionaryWords.length > 0
    ? `Context words and names to recognize: ${dictionaryWords.join(', ')}`
    : undefined

  const file = new File([audioBuffer], 'recording.webm', { type: 'audio/webm' })

  const response = await openai.audio.transcriptions.create({
    model,
    file,
    ...(effectiveLanguage ? { language: effectiveLanguage } : {}),
    ...(promptContext ? { prompt: promptContext } : {}),
  })

  return {
    text: response.text,
    language: effectiveLanguage || null,
  }
}

export async function polish(
  text: string,
  tone: string = 'neutral',
  customInstructions?: string
): Promise<string> {
  const openai = getClient()
  const db = getDatabase()
  const settings = new SettingsRepository(db)

  const model = settings.get('openai_model_polish') || 'gpt-4o'

  const toneInstructions: Record<string, string> = {
    neutral: 'Write in a clean, clear, and neutral tone.',
    casual: 'Write in a friendly, conversational, and casual tone. Use contractions and informal language where appropriate.',
    formal: 'Write in a professional, formal tone. Use proper grammar and avoid contractions or slang.',
    technical: 'Write in a precise, technical tone. Preserve technical terms, code references, and acronyms exactly as spoken.',
  }

  const systemPrompt = `You are a voice-to-text editor. Your job is to take raw speech transcription and produce clean, polished text.

Rules:
- Remove filler words (um, uh, like, you know, basically, literally, so, I mean)
- Fix grammar and punctuation
- Maintain the speaker's original meaning and intent exactly
- Do NOT add new information or change the meaning
- Format lists, bullet points, and numbered items when the speaker clearly intends a list
- Capitalize proper nouns and sentence starts correctly
- Keep the text concise but complete
- If the text contains code or technical terms, preserve them exactly
- Output ONLY the polished text, no explanations or metadata

${toneInstructions[tone] || toneInstructions.neutral}
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ''}`

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  })

  return response.choices[0]?.message?.content?.trim() || text
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const testClient = new OpenAI({ apiKey })
    await testClient.models.list()
    return true
  } catch {
    return false
  }
}
