import { useEffect } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Dictionary from './pages/Dictionary'
import Snippets from './pages/Snippets'
import ToneProfiles from './pages/ToneProfiles'
import Team from './pages/Team'
import { useRecordingStore } from './stores/recording.store'
import { useSettingsStore } from './stores/settings.store'

// Declare the api types on window
declare global {
  interface Window {
    api: import('../preload/index').ElectronAPI
  }
}

export default function App() {
  const updateStatus = useRecordingStore((s) => s.updateStatus)
  const fetchSettings = useSettingsStore((s) => s.fetchSettings)

  useEffect(() => {
    // Load settings on app start
    fetchSettings()

    // Listen for recording status updates from main process
    const unsubscribe = window.api.onRecordingStatus((status) => {
      updateStatus(status)
    })

    return () => {
      unsubscribe()
    }
  }, [updateStatus, fetchSettings])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="dictionary" element={<Dictionary />} />
          <Route path="snippets" element={<Snippets />} />
          <Route path="tone" element={<ToneProfiles />} />
          <Route path="team" element={<Team />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
