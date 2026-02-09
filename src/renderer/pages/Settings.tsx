import { useEffect, useState, useCallback } from 'react'
import { Key, Mic, Globe, Monitor, Cpu, Keyboard, Shield, Eye, EyeOff, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { useSettingsStore } from '../stores/settings.store'
import { SUPPORTED_LANGUAGES, TRANSCRIPTION_MODELS, POLISH_MODELS } from '../../shared/constants'
import { cn } from '../lib/cn'

export default function Settings() {
  const { settings, loading, fetchSettings, updateSetting } = useSettingsStore()
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<any>(null)
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false)
  const [hotkeyDisplay, setHotkeyDisplay] = useState('')

  useEffect(() => {
    fetchSettings()
    window.api.app.checkPermissions().then(setPermissionStatus)
  }, [fetchSettings])

  useEffect(() => {
    setApiKeyInput(settings.openai_api_key)
    setHotkeyDisplay(settings.hotkey)
  }, [settings.openai_api_key, settings.hotkey])

  const saveApiKey = async () => {
    await updateSetting('openai_api_key', apiKeyInput)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  // Hotkey recorder: listen for key combos when recording
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecordingHotkey) return
    e.preventDefault()
    e.stopPropagation()

    if (e.key === 'Escape') {
      setHotkeyDisplay(settings.hotkey)
      setIsRecordingHotkey(false)
      return
    }

    const parts: string[] = []
    if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')

    const key = e.key
    if (!['Meta', 'Control', 'Alt', 'Shift'].includes(key)) {
      parts.push(key.length === 1 ? key.toUpperCase() : key)
      const hotkey = parts.join('+')
      setHotkeyDisplay(hotkey)
      updateSetting('hotkey', hotkey)
      setIsRecordingHotkey(false)
    }
  }, [isRecordingHotkey, updateSetting, settings.hotkey])

  useEffect(() => {
    if (isRecordingHotkey) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRecordingHotkey, handleKeyDown])

  const refreshPermissions = async () => {
    const status = await window.api.app.checkPermissions()
    setPermissionStatus(status)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure FlowCopy to work the way you want</p>
      </div>

      {/* API Key */}
      <Card title="OpenAI API Key" icon={Key} description="Required for transcription and text polishing">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={apiKeyVisible ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              />
              <button
                onClick={() => setApiKeyVisible(!apiKeyVisible)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={saveApiKey}
              className={cn(
                'px-5 py-2.5 text-sm font-medium rounded-xl',
                apiKeySaved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
              )}
            >
              {apiKeySaved ? <Check className="w-4 h-4" /> : 'Save'}
            </button>
          </div>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Stored locally. Never sent anywhere except OpenAI.
          </p>
        </div>
      </Card>

      {/* AI Models */}
      <Card title="AI Models" icon={Cpu} description="Choose which models power transcription and polishing">
        <div className="space-y-4">
          <SelectField
            label="Transcription Model"
            value={settings.openai_model_transcription}
            options={TRANSCRIPTION_MODELS.map((m) => ({ value: m.value, label: m.label }))}
            onChange={(v) => updateSetting('openai_model_transcription', v)}
            hint={settings.openai_model_transcription === 'gpt-4o-transcribe'
              ? 'Best accuracy. Understands context, produces cleaner output.'
              : 'Legacy model. Cheaper but less accurate for complex audio.'}
          />
          <SelectField
            label="Polish Model"
            value={settings.openai_model_polish}
            options={POLISH_MODELS.map((m) => ({ value: m.value, label: m.label }))}
            onChange={(v) => updateSetting('openai_model_polish', v)}
            hint={settings.openai_model_polish === 'gpt-4o'
              ? 'Best quality polishing with nuance and formatting.'
              : 'Faster and cheaper. Good for simple text cleanup.'}
          />
        </div>
      </Card>

      {/* Hotkey */}
      <Card title="Recording Hotkey" icon={Keyboard} description="Set the keyboard shortcut to start/stop recording">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current shortcut</span>
            <button
              onClick={() => {
                if (isRecordingHotkey) {
                  setHotkeyDisplay(settings.hotkey)
                  setIsRecordingHotkey(false)
                } else {
                  setHotkeyDisplay('Press keys...')
                  setIsRecordingHotkey(true)
                }
              }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-mono font-medium border-2',
                isRecordingHotkey
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 animate-pulse'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
              )}
            >
              {hotkeyDisplay || settings.hotkey}
            </button>
          </div>
          {isRecordingHotkey && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Press a key combination (e.g., Cmd+Shift+Space). Press Escape to cancel.
            </p>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recording mode</span>
              <p className="text-xs text-gray-400 mt-0.5">Press hotkey to start, press again to stop and transcribe</p>
            </div>
            <select
              value={settings.recording_mode}
              onChange={(e) => updateSetting('recording_mode', e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="toggle">Toggle (press to start/stop)</option>
              <option value="push_to_talk">Push-to-talk</option>
            </select>
          </div>

          <ToggleField
            label="Auto-paste after transcription"
            description="Paste polished text directly into the active app"
            checked={settings.auto_paste}
            onChange={(v) => updateSetting('auto_paste', v)}
          />
        </div>
      </Card>

      {/* Audio */}
      <Card title="Audio" icon={Mic} description="Audio recording preferences">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Max recording duration</span>
            <p className="text-xs text-gray-400 mt-0.5">Recording auto-stops after this time</p>
          </div>
          <span className="text-sm font-mono font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg">
            {Math.floor(Number(settings.max_recording_seconds) / 60)}:{String(Number(settings.max_recording_seconds) % 60).padStart(2, '0')}
          </span>
        </div>
      </Card>

      {/* Language */}
      <Card title="Language" icon={Globe} description="Set the language for voice transcription">
        <SelectField
          label="Transcription language"
          value={settings.language}
          options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
          onChange={(v) => updateSetting('language', v)}
          hint={settings.language === 'auto' ? 'Whisper auto-detects the spoken language' : undefined}
        />
      </Card>

      {/* Appearance */}
      <Card title="Appearance" icon={Monitor} description="Customize the look of the app">
        <SelectField
          label="Theme"
          value={settings.theme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(v) => updateSetting('theme', v)}
        />
      </Card>

      {/* Permissions */}
      {permissionStatus && (
        <Card title="Permissions" icon={Shield} description="Required system permissions for FlowCopy">
          <div className="space-y-4">
            <PermissionRow
              label="Microphone"
              description="Record your voice for transcription"
              granted={permissionStatus.microphone === 'granted'}
              onRequest={() => window.api.app.requestPermission('microphone').then(refreshPermissions)}
            />
            <PermissionRow
              label="Accessibility"
              description="Simulate keyboard paste into active app"
              granted={permissionStatus.accessibility}
              onRequest={() => window.api.app.requestPermission('accessibility').then(refreshPermissions)}
            />
          </div>
        </Card>
      )}
    </div>
  )
}

function Card({ title, icon: Icon, description, children }: { title: string; icon: any; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="font-semibold text-[15px]">{title}</h2>
          {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function SelectField({ label, value, options, onChange, hint }: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; hint?: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1.5">{hint}</p>}
    </div>
  )
}

function ToggleField({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={cn('relative w-11 h-6 rounded-full flex-shrink-0', checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700')}>
        <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
      </button>
    </div>
  )
}

function PermissionRow({ label, description, granted, onRequest }: {
  label: string; description: string; granted: boolean; onRequest: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center',
          granted ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30')}>
          {granted ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        </div>
        <div>
          <span className="text-sm font-medium">{label}</span>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      {granted ? (
        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">Granted</span>
      ) : (
        <button onClick={onRequest}
          className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg flex items-center gap-1">
          Grant <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
