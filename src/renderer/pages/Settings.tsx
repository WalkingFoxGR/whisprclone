import { useEffect, useState } from 'react'
import { Key, Mic, Globe, Monitor, Cpu, Keyboard } from 'lucide-react'
import { useSettingsStore } from '../stores/settings.store'
import { SUPPORTED_LANGUAGES, TRANSCRIPTION_MODELS, POLISH_MODELS } from '../../shared/constants'
import { cn } from '../lib/cn'

export default function Settings() {
  const { settings, loading, fetchSettings, updateSetting } = useSettingsStore()
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [permissionStatus, setPermissionStatus] = useState<any>(null)

  useEffect(() => {
    fetchSettings()
    window.api.app.checkPermissions().then(setPermissionStatus)
  }, [fetchSettings])

  useEffect(() => {
    setApiKeyInput(settings.openai_api_key)
  }, [settings.openai_api_key])

  const saveApiKey = async () => {
    await updateSetting('openai_api_key', apiKeyInput)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure FlowCopy</p>
      </div>

      {/* API Key */}
      <Section title="OpenAI API Key" icon={Key}>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type={apiKeyVisible ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => setApiKeyVisible(!apiKeyVisible)}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {apiKeyVisible ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={saveApiKey}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Your API key is stored locally and never sent to any server other than OpenAI.
          </p>
        </div>
      </Section>

      {/* AI Models */}
      <Section title="AI Models" icon={Cpu}>
        <div className="space-y-4">
          <SelectField
            label="Transcription Model"
            value={settings.openai_model_transcription}
            options={TRANSCRIPTION_MODELS.map((m) => ({ value: m.value, label: m.label }))}
            onChange={(v) => updateSetting('openai_model_transcription', v)}
          />
          <SelectField
            label="Polish Model"
            value={settings.openai_model_polish}
            options={POLISH_MODELS.map((m) => ({ value: m.value, label: m.label }))}
            onChange={(v) => updateSetting('openai_model_polish', v)}
          />
        </div>
      </Section>

      {/* Hotkey */}
      <Section title="Hotkey" icon={Keyboard}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Recording hotkey</span>
            <code className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-md text-sm font-mono">
              {settings.hotkey}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Recording mode</span>
            <select
              value={settings.recording_mode}
              onChange={(e) => updateSetting('recording_mode', e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="toggle">Toggle (press to start/stop)</option>
              <option value="push_to_talk">Push-to-talk (hold to record)</option>
            </select>
          </div>
          <ToggleField
            label="Auto-paste after transcription"
            checked={settings.auto_paste}
            onChange={(v) => updateSetting('auto_paste', v)}
          />
        </div>
      </Section>

      {/* Audio */}
      <Section title="Audio" icon={Mic}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Max recording duration</span>
            <span className="text-sm text-gray-500">{settings.max_recording_seconds}s</span>
          </div>
        </div>
      </Section>

      {/* Language */}
      <Section title="Language" icon={Globe}>
        <SelectField
          label="Transcription language"
          value={settings.language}
          options={SUPPORTED_LANGUAGES.map((l) => ({ value: l.code, label: l.name }))}
          onChange={(v) => updateSetting('language', v)}
        />
      </Section>

      {/* Appearance */}
      <Section title="Appearance" icon={Monitor}>
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
      </Section>

      {/* Permissions */}
      {permissionStatus && (
        <Section title="Permissions" icon={Key}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Microphone</span>
              <StatusBadge status={permissionStatus.microphone === 'granted'} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Accessibility (for paste)</span>
              <StatusBadge status={permissionStatus.accessibility} />
            </div>
            {(!permissionStatus.accessibility || permissionStatus.microphone !== 'granted') && (
              <button
                onClick={() => window.api.app.requestPermission('microphone')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Request permissions
              </button>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-6 rounded-full transition-colors',
          checked ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: boolean }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded text-xs font-medium',
        status
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {status ? 'Granted' : 'Required'}
    </span>
  )
}
