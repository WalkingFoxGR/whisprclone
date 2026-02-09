import { useEffect, useState } from 'react'
import { Plus, Trash2, Palette, RefreshCw } from 'lucide-react'
import { TONE_OPTIONS } from '../../shared/constants'
import type { ToneProfile, ToneProfileInput } from '../../shared/types'
import { cn } from '../lib/cn'

export default function ToneProfiles() {
  const [profiles, setProfiles] = useState<ToneProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [detectedApp, setDetectedApp] = useState<{ identifier: string; name: string } | null>(null)
  const [newTone, setNewTone] = useState<ToneProfile['tone']>('neutral')
  const [newInstructions, setNewInstructions] = useState('')

  const fetchProfiles = async () => {
    setLoading(true)
    const data = await window.api.tone.getAll()
    setProfiles(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  const detectCurrentApp = async () => {
    const app = await window.api.tone.detectApp()
    setDetectedApp(app)
  }

  const handleAdd = async () => {
    if (!detectedApp) return
    await window.api.tone.set({
      app_identifier: detectedApp.identifier,
      app_name: detectedApp.name,
      tone: newTone,
      custom_instructions: newInstructions.trim() || undefined,
    })
    setShowAddForm(false)
    setDetectedApp(null)
    setNewInstructions('')
    fetchProfiles()
  }

  const handleRemove = async (appIdentifier: string) => {
    await window.api.tone.remove(appIdentifier)
    setProfiles(profiles.filter((p) => p.app_identifier !== appIdentifier))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tone Profiles</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Set different writing tones per application
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            if (!showAddForm) detectCurrentApp()
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add profile
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Detected app:</span>
              <span className="ml-2 font-medium text-sm">
                {detectedApp ? detectedApp.name : 'Detecting...'}
              </span>
            </div>
            <button
              onClick={detectCurrentApp}
              className="p-1.5 text-gray-400 hover:text-gray-600"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div>
            <span className="text-sm font-medium block mb-2">Tone</span>
            <div className="grid grid-cols-4 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setNewTone(t.value as ToneProfile['tone'])}
                  className={cn(
                    'px-3 py-2 rounded-lg text-sm text-center border',
                    newTone === t.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium block mb-2">Custom instructions (optional)</span>
            <textarea
              value={newInstructions}
              onChange={(e) => setNewInstructions(e.target.value)}
              placeholder="e.g., Use bullet points, keep responses under 100 words..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 text-sm text-gray-500">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!detectedApp}
              className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Profiles list */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-8">Loading...</div>
        ) : profiles.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
            <Palette className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">
              No tone profiles yet. Open an app and add a profile to customize its tone!
            </p>
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{profile.app_name}</span>
                  <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs capitalize">
                    {profile.tone}
                  </span>
                </div>
                {profile.custom_instructions && (
                  <p className="text-xs text-gray-400 mt-1">{profile.custom_instructions}</p>
                )}
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1 font-mono">
                  {profile.app_identifier}
                </p>
              </div>
              <button
                onClick={() => handleRemove(profile.app_identifier)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
