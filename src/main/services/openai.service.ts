import OpenAI, { toFile } from 'openai'
import { getDatabase } from '../db/database'
import { SettingsRepository } from '../db/repositories/settings.repo'
import { DictionaryRepository } from '../db/repositories/dictionary.repo'

let openaiClient: OpenAI | null = null
let groqClient: OpenAI | null = null

function getClient(): OpenAI {
  const db = getDatabase()
  const settings = new SettingsRepository(db)
  const apiKey = settings.get('openai_api_key')

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in Settings.')
  }

  if (!openaiClient || (openaiClient as any).apiKey !== apiKey) {
    openaiClient = new OpenAI({ apiKey })
  }

  return openaiClient
}

function getGroqClient(): OpenAI {
  const db = getDatabase()
  const settings = new SettingsRepository(db)
  const apiKey = settings.get('groq_api_key')

  if (!apiKey) {
    throw new Error('Groq API key not configured. Please add your Groq API key in Settings.')
  }

  if (!groqClient || (groqClient as any).apiKey !== apiKey) {
    groqClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })
  }

  return groqClient
}

export async function transcribe(
  audioBuffer: Buffer,
  language?: string
): Promise<{ text: string; language: string | null }> {
  const db = getDatabase()
  const settings = new SettingsRepository(db)
  const dictionary = new DictionaryRepository(db)

  const provider = settings.get('transcription_provider') || 'openai'
  const model = settings.get('openai_model_transcription') || 'gpt-4o-transcribe'
  const configuredLanguage = settings.get('language') || 'auto'

  // Language handling:
  // - If caller passes an explicit language, use it (direct override)
  // - If user set a preferred language (not 'auto'), use it to tell the model
  //   what language to OUTPUT — this prevents the model from translating
  //   English speech into Greek (or vice versa) based on accent/locale
  // - If 'auto', don't pass language — let the model auto-detect
  const effectiveLanguage = language || (configuredLanguage !== 'auto' ? configuredLanguage : undefined)

  // Include dictionary words in prompt for better recognition
  const dictionaryWords = dictionary.getWordsForPrompt()

  // Build a prompt that helps the model
  let promptParts: string[] = []
  if (dictionaryWords.length > 0) {
    promptParts.push(`Context words and names to recognize: ${dictionaryWords.join(', ')}`)
  }
  // NOTE: Whisper's `prompt` parameter is for style/vocabulary hints only.
  // Do NOT put instructions here — Whisper sometimes echoes the prompt text
  // back as part of the transcription output. Keep it minimal.
  const promptContext = promptParts.length > 0 ? promptParts.join('. ') : undefined

  // For very short recordings (< 1s), the WebM container may be malformed
  if (audioBuffer.length < 1000) {
    return { text: '', language: effectiveLanguage || null }
  }

  // Use OpenAI SDK's toFile() for proper multipart encoding (works with both OpenAI and Groq)
  const file = await toFile(audioBuffer, 'recording.webm', { type: 'audio/webm' })

  // Choose client based on provider
  const client = provider === 'groq' ? getGroqClient() : getClient()

  console.log(`[transcribe] provider=${provider}, model=${model}, language=${effectiveLanguage ?? 'auto-detect'}, bufferSize=${audioBuffer.length}`)

  let response: any
  try {
    response = await client.audio.transcriptions.create({
      model,
      file,
      ...(effectiveLanguage ? { language: effectiveLanguage } : {}),
      ...(promptContext ? { prompt: promptContext } : {}),
    })
  } catch (err: any) {
    // If Groq rejects the format, retry with OpenAI as fallback
    if (provider === 'groq' && err?.status === 400) {
      console.warn(`[transcribe] Groq rejected audio (${err.message}), falling back to OpenAI`)
      const openaiClient = getClient()
      const openaiModel = 'whisper-1'
      response = await openaiClient.audio.transcriptions.create({
        model: openaiModel,
        file,
        ...(effectiveLanguage ? { language: effectiveLanguage } : {}),
        ...(promptContext ? { prompt: promptContext } : {}),
      })
    } else {
      throw err
    }
  }

  console.log(`[transcribe] result: "${response.text.substring(0, 100)}..."`)

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

  const model = settings.get('openai_model_polish') || 'gpt-5.1'

  const toneInstructions: Record<string, string> = {
    neutral: 'Write in a clean, clear, and neutral tone.',
    casual: 'Write in a friendly, conversational, and casual tone. Use contractions and informal language where appropriate.',
    formal: 'Write in a professional, formal tone. Use proper grammar and avoid contractions or slang.',
    technical: 'Write in a precise, technical tone. Preserve technical terms, code references, and acronyms exactly as spoken.',
  }

  const systemPrompt = `You are a voice-to-text editor. Your job is to take raw speech transcription and produce clean, polished text.

Rules:
- CRITICAL: ALWAYS respond in the SAME language as the input text. If the input is in English, respond in English. If the input is in Greek, respond in Greek. Never translate.
- Remove filler words (um, uh, like, you know, basically, literally, so, I mean, and their equivalents in other languages)
- Fix grammar and punctuation
- Maintain the speaker's original meaning and intent exactly
- Do NOT add new information or change the meaning
- Do NOT translate to a different language — keep the original language
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

/**
 * Determine if the raw transcription is "clean enough" to skip the polish step.
 * This saves one GPT API call per request, drastically cutting costs.
 *
 * A text is considered clean if:
 * - It's short (≤ 8 words) — short messages rarely need polishing
 * - It contains no common filler words
 * - It already starts with a capital letter and ends with punctuation
 */
const FILLER_WORDS_EN = /\b(um|uh|uh+|uhm|er|hmm|like|you know|basically|literally|i mean|so yeah|anyway|well)\b/i
const FILLER_WORDS_GENERAL = /\b(εε|εμ|λοιπόν|δηλαδή|ας πούμε|κοίτα|bueno|pues|o sea|alors|euh|donc|voilà|also|halt|ähm|naja)\b/i

export function shouldSkipPolish(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed) return true

  const wordCount = trimmed.split(/\s+/).length

  // Very short text (≤ 8 words): skip polish if it looks clean
  if (wordCount <= 8) {
    const hasFillers = FILLER_WORDS_EN.test(trimmed) || FILLER_WORDS_GENERAL.test(trimmed)
    const startsCapitalized = /^[A-ZΑ-Ω\u00C0-\u024F]/.test(trimmed)
    const hasEndPunctuation = /[.!?;:]$/.test(trimmed)

    // If clean short text: capitalize first letter, ensure period, skip polish
    if (!hasFillers && startsCapitalized && hasEndPunctuation) {
      return true
    }
  }

  return false
}

/**
 * Light cleanup when skipping the full polish — just basic fixes without an API call
 */
export function quickCleanup(text: string): string {
  let cleaned = text.trim()
  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }
  // Ensure ends with punctuation
  if (!/[.!?;:]$/.test(cleaned)) {
    cleaned += '.'
  }
  return cleaned
}

// API pricing per model (in cents)
// Prices are approximate and should be updated as providers change pricing
const PRICING: Record<string, { per_minute?: number; per_1k_input?: number; per_1k_output?: number }> = {
  // OpenAI Transcription — per minute of audio
  'gpt-4o-transcribe': { per_minute: 0.6 },       // $0.006/min = 0.6 cents/min
  'whisper-1': { per_minute: 0.6 },                // $0.006/min = 0.6 cents/min
  // Groq Transcription — effectively free tier, very cheap
  'whisper-large-v3-turbo': { per_minute: 0.04 },  // $0.04/hr ≈ 0.067 cents/min
  'whisper-large-v3': { per_minute: 0.111 },       // $0.111/hr
  'distil-whisper-large-v3-en': { per_minute: 0.02 },
  // OpenAI Polish (chat) — per 1K tokens
  'gpt-5.1': { per_1k_input: 0.125, per_1k_output: 1.0 },          // $1.25/$10 per 1M tokens
  'gpt-5.1-instant': { per_1k_input: 0.05, per_1k_output: 0.2 },   // $0.50/$2 per 1M tokens (estimated)
}

/**
 * Estimate cost in cents for a transcription + polish operation
 */
export function estimateCost(params: {
  transcriptionModel: string
  polishModel: string
  recordingDurationMs: number
  inputWordCount: number
  outputWordCount: number
}): number {
  let totalCents = 0

  // Transcription cost (per minute)
  const transcriptionPricing = PRICING[params.transcriptionModel]
  if (transcriptionPricing?.per_minute) {
    const minutes = params.recordingDurationMs / 60000
    totalCents += minutes * transcriptionPricing.per_minute
  }

  // Polish cost (per 1K tokens — rough estimate: 1 word ≈ 1.3 tokens)
  const polishPricing = PRICING[params.polishModel]
  if (polishPricing?.per_1k_input && polishPricing?.per_1k_output) {
    const inputTokens = params.inputWordCount * 1.3 + 200 // +200 for system prompt
    const outputTokens = params.outputWordCount * 1.3
    totalCents += (inputTokens / 1000) * polishPricing.per_1k_input
    totalCents += (outputTokens / 1000) * polishPricing.per_1k_output
  }

  return Math.round(totalCents * 1000) / 1000 // 3 decimal places
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

export async function validateGroqApiKey(apiKey: string): Promise<boolean> {
  try {
    const testClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    })
    await testClient.models.list()
    return true
  } catch {
    return false
  }
}
