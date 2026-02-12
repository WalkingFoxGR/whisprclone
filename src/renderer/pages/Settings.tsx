import { useEffect, useState } from 'react'
import { Key, Mic, Globe, Monitor, Cpu, Keyboard, Shield, Eye, EyeOff, Check, AlertCircle, ExternalLink, Zap, Download, RefreshCw, RotateCw } from 'lucide-react'
import { useSettingsStore } from '../stores/settings.store'
import { SUPPORTED_LANGUAGES, TRANSCRIPTION_MODELS, GROQ_TRANSCRIPTION_MODELS, POLISH_MODELS } from '../../shared/constants'
import { cn } from '../lib/cn'

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

// Legacy display: convert old Electron accelerator strings to readable format
function acceleratorToDisplay(accel: string): string {
  if (!accel) return ''
  return accel
    .replace(/CommandOrControl/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Command/g, '⌘')
    .replace(/Control/g, 'Ctrl')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Shift/g, isMac ? '⇧' : 'Shift')
    .replace(/\+/g, isMac ? '' : '+')
    .replace(/Space/g, isMac ? '␣' : 'Space')
    .replace(/Return/g, '↩')
    .replace(/Backspace/g, '⌫')
    .replace(/Delete/g, '⌦')
    .replace(/Escape/g, 'Esc')
    .replace(/Up/g, '↑').replace(/Down/g, '↓')
    .replace(/Left/g, '←').replace(/Right/g, '→')
}

export default function Settings() {
  const { settings, loading, fetchSettings, updateSetting } = useSettingsStore()
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(false)
  const [groqKeyVisible, setGroqKeyVisible] = useState(false)
  const [groqKeyInput, setGroqKeyInput] = useState('')
  const [groqKeySaved, setGroqKeySaved] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<any>(null)
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false)
  const [hotkeyDisplay, setHotkeyDisplay] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'up-to-date' | 'error'>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
    fetchSettings()
    window.api.app.checkPermissions().then(setPermissionStatus)
    window.api.app.getVersion().then(setAppVersion)
  }, [fetchSettings])

  // Auto-updater event listeners
  useEffect(() => {
    const unsubs = [
      window.api.updater.onUpdateAvailable((data) => {
        setUpdateState('available')
        setUpdateVersion(data.version)
      }),
      window.api.updater.onUpdateNotAvailable(() => {
        setUpdateState('up-to-date')
        setTimeout(() => setUpdateState('idle'), 3000)
      }),
      window.api.updater.onUpdateProgress((data) => {
        setUpdateState('downloading')
        setUpdateProgress(data.percent)
      }),
      window.api.updater.onUpdateDownloaded((data) => {
        setUpdateState('ready')
        setUpdateVersion(data.version)
      }),
      window.api.updater.onUpdateError((data) => {
        setUpdateState('error')
        setUpdateError(data.message)
        setTimeout(() => setUpdateState('idle'), 5000)
      }),
    ]
    return () => unsubs.forEach((unsub) => unsub())
  }, [])

  useEffect(() => {
    setApiKeyInput(settings.openai_api_key)
    setGroqKeyInput(settings.groq_api_key || '')
    // Show saved display name if available, otherwise fall back to accelerator
    window.api.settings.get('hotkey_display').then((display) => {
      if (display) {
        setHotkeyDisplay(display)
      } else {
        setHotkeyDisplay(acceleratorToDisplay(settings.hotkey))
      }
    })
  }, [settings.openai_api_key, settings.groq_api_key, settings.hotkey])

  const saveApiKey = async () => {
    await updateSetting('openai_api_key', apiKeyInput)
    setApiKeySaved(true)
    setTimeout(() => setApiKeySaved(false), 2000)
  }

  const saveGroqKey = async () => {
    await updateSetting('groq_api_key', groqKeyInput)
    setGroqKeySaved(true)
    setTimeout(() => setGroqKeySaved(false), 2000)
  }

  // Hotkey recorder: uses uiohook-napi in main process to capture ANY key
  const startHotkeyCapture = async () => {
    setIsRecordingHotkey(true)
    setHotkeyDisplay('Press any key...')
    try {
      const result = await window.api.app.captureHotkey()
      setHotkeyDisplay(result.displayName)
      setIsRecordingHotkey(false)
    } catch {
      // Cancelled or error
      window.api.settings.get('hotkey_display').then((display) => {
        setHotkeyDisplay(display || acceleratorToDisplay(settings.hotkey))
      })
      setIsRecordingHotkey(false)
    }
  }

  const cancelHotkeyCapture = () => {
    window.api.app.cancelCaptureHotkey()
    window.api.settings.get('hotkey_display').then((display) => {
      setHotkeyDisplay(display || acceleratorToDisplay(settings.hotkey))
    })
    setIsRecordingHotkey(false)
  }

  const refreshPermissions = async () => {
    const status = await window.api.app.checkPermissions()
    setPermissionStatus(status)
  }

  const handleCheckForUpdates = async () => {
    setUpdateState('checking')
    setUpdateError('')
    await window.api.updater.checkForUpdates()
  }

  const handleDownloadUpdate = async () => {
    setUpdateState('downloading')
    setUpdateProgress(0)
    await window.api.updater.downloadUpdate()
  }

  const handleInstallUpdate = () => {
    window.api.updater.installUpdate()
  }

  const provider = (settings as any).transcription_provider || 'openai'
  const currentModels = provider === 'groq' ? GROQ_TRANSCRIPTION_MODELS : TRANSCRIPTION_MODELS

  // When switching provider, auto-select the first model for that provider
  const handleProviderChange = async (newProvider: string) => {
    await updateSetting('transcription_provider', newProvider)
    const firstModel = newProvider === 'groq'
      ? GROQ_TRANSCRIPTION_MODELS[0].value
      : TRANSCRIPTION_MODELS[0].value
    await updateSetting('openai_model_transcription', firstModel)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl animate-fade-in pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure VoxPilot to work the way you want</p>
      </div>

      {/* API Keys */}
      <Card title="API Keys" icon={Key} description="Required for transcription and text polishing">
        <div className="space-y-5">
          {/* OpenAI API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">OpenAI API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  type={apiKeyVisible ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono pr-10"
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
                  'px-4 py-2 text-sm font-medium rounded-xl flex-shrink-0',
                  apiKeySaved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                )}
              >
                {apiKeySaved ? <Check className="w-4 h-4" /> : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Shield className="w-3 h-3 flex-shrink-0" />
              Required for polishing. Also used for transcription when OpenAI provider is selected.
            </p>
          </div>

          {/* Groq API Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              Groq API Key
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                Optional
              </span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <input
                  type={groqKeyVisible ? 'text' : 'password'}
                  value={groqKeyInput}
                  onChange={(e) => setGroqKeyInput(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono pr-10"
                />
                <button
                  onClick={() => setGroqKeyVisible(!groqKeyVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {groqKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={saveGroqKey}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-xl flex-shrink-0',
                  groqKeySaved
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                )}
              >
                {groqKeySaved ? <Check className="w-4 h-4" /> : 'Save'}
              </button>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3 flex-shrink-0" />
              For near-instant transcription. Free at groq.com/console
            </p>
          </div>
        </div>
      </Card>

      {/* AI Models */}
      <Card title="AI Models" icon={Cpu} description="Choose which models power transcription and polishing">
        <div className="space-y-4">
          {/* Transcription Provider */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">Transcription Provider</span>
              <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
                <button
                  onClick={() => handleProviderChange('openai')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors',
                    provider === 'openai'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  OpenAI
                </button>
                <button
                  onClick={() => handleProviderChange('groq')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors',
                    provider === 'groq'
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  Groq (Fast)
                </button>
              </div>
            </div>
            {provider === 'groq' && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3 flex-shrink-0" />
                Groq provides near-instant Whisper transcription. Requires Groq API key above.
              </p>
            )}
          </div>

          <SelectField
            label="Transcription Model"
            value={settings.openai_model_transcription}
            options={currentModels.map((m) => ({ value: m.value, label: m.label }))}
            onChange={(v) => updateSetting('openai_model_transcription', v)}
            hint={provider === 'groq'
              ? 'Groq runs Whisper at near real-time speed.'
              : settings.openai_model_transcription === 'gpt-4o-transcribe'
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

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <ToggleField
              label="Smart polish skip"
              description="Skip the polish API call for short, clean text to save cost and reduce latency"
              checked={settings.smart_polish_skip}
              onChange={(v) => updateSetting('smart_polish_skip', v)}
            />
          </div>
        </div>
      </Card>

      {/* Hotkey */}
      <Card title="Recording Hotkey" icon={Keyboard} description="Hold the shortcut to record, release to stop">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">Current shortcut</span>
            <button
              onClick={() => {
                if (isRecordingHotkey) {
                  cancelHotkeyCapture()
                } else {
                  startHotkeyCapture()
                }
              }}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-mono font-medium border-2 flex-shrink-0',
                isRecordingHotkey
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 animate-pulse'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
              )}
            >
              {hotkeyDisplay || acceleratorToDisplay(settings.hotkey)}
            </button>
          </div>
          {isRecordingHotkey && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              Press any key on your keyboard — captured at OS level so all keys work. Click button again to cancel.
            </p>
          )}

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
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Max recording duration</span>
            <p className="text-xs text-gray-400 mt-0.5">Recording auto-stops after this time</p>
          </div>
          <span className="text-sm font-mono font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg flex-shrink-0">
            {Math.floor(Number(settings.max_recording_seconds) / 60)}:{String(Number(settings.max_recording_seconds) % 60).padStart(2, '0')}
          </span>
        </div>
      </Card>

      {/* Language */}
      <Card title="Language" icon={Globe} description="Set the language you want transcriptions to appear in">
        <SelectField
          label="Transcription output language"
          value={settings.language}
          options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
          onChange={(v) => updateSetting('language', v)}
          hint={settings.language === 'auto'
            ? 'Auto-detect: the model will guess the language. If it guesses wrong, select your language explicitly.'
            : `Output will be in ${SUPPORTED_LANGUAGES.find(l => l.code === settings.language)?.name || settings.language}. Set to English if you speak English.`}
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

      {/* Updates */}
      <Card title="Updates" icon={Download} description="Keep VoxPilot up to date">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current version</span>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{appVersion || '...'}</p>
            </div>

            {updateState === 'idle' && (
              <button
                onClick={handleCheckForUpdates}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Check for Updates
              </button>
            )}

            {updateState === 'checking' && (
              <span className="px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center gap-2 flex-shrink-0">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking...
              </span>
            )}

            {updateState === 'up-to-date' && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 flex-shrink-0">
                <Check className="w-3.5 h-3.5" /> Up to date
              </span>
            )}

            {updateState === 'available' && (
              <button
                onClick={handleDownloadUpdate}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 flex-shrink-0"
              >
                <Download className="w-3.5 h-3.5" /> Download v{updateVersion}
              </button>
            )}

            {updateState === 'downloading' && (
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${updateProgress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-500 w-10 text-right">{updateProgress}%</span>
              </div>
            )}

            {updateState === 'ready' && (
              <button
                onClick={handleInstallUpdate}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 flex-shrink-0"
              >
                <RotateCw className="w-3.5 h-3.5" /> Restart & Update
              </button>
            )}

            {updateState === 'error' && (
              <button
                onClick={handleCheckForUpdates}
                className="px-4 py-2 text-sm font-medium rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 flex items-center gap-2 flex-shrink-0"
              >
                <AlertCircle className="w-3.5 h-3.5" /> Retry
              </button>
            )}
          </div>

          {updateState === 'error' && updateError && (
            <p className="text-xs text-red-500 dark:text-red-400">{updateError}</p>
          )}

          {updateState === 'ready' && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              v{updateVersion} is ready. Click "Restart & Update" to install it now.
            </p>
          )}
        </div>
      </Card>

      {/* Permissions */}
      {permissionStatus && (
        <Card title="Permissions" icon={Shield} description="Required system permissions for VoxPilot">
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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="min-w-0">
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
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0 max-w-[220px]">
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
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full flex-shrink-0 transition-colors duration-200',
          checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
        )}>
        <span className={cn(
          'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )} />
      </button>
    </div>
  )
}

function PermissionRow({ label, description, granted, onRequest }: {
  label: string; description: string; granted: boolean; onRequest: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          granted ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-amber-50 dark:bg-amber-950/30')}>
          {granted ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-medium">{label}</span>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      {granted ? (
        <span className="px-3 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 flex-shrink-0">Granted</span>
      ) : (
        <button onClick={onRequest}
          className="px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg flex items-center gap-1 flex-shrink-0">
          Grant <ExternalLink className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
