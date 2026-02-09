import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings,
  BookOpen,
  Zap,
  Palette,
  Mic,
  Users,
  Square,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRecordingStore } from '../stores/recording.store'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/dictionary', icon: BookOpen, label: 'Dictionary' },
  { to: '/snippets', icon: Zap, label: 'Snippets' },
  { to: '/tone', icon: Palette, label: 'Tone Profiles' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const state = useRecordingStore((s) => s.state)
  const isRecording = state === 'recording'
  const isBusy = state === 'transcribing' || state === 'polishing' || state === 'pasting'

  const handleRecordToggle = async () => {
    if (isRecording) {
      await window.api.recording.stop()
    } else if (!isBusy) {
      await window.api.recording.start()
    }
  }

  return (
    <aside className="w-60 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
      {/* Title bar drag area */}
      <div className="titlebar-drag h-14 flex items-center px-5 pt-2">
        <div className="titlebar-no-drag flex items-center gap-2.5">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center',
            isRecording
              ? 'bg-red-500 animate-pulse-recording'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
          )}>
            <Mic className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">FlowCopy</span>
        </div>
      </div>

      {/* Record Button */}
      <div className="px-4 py-3">
        <button
          onClick={handleRecordToggle}
          disabled={isBusy}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer',
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white animate-glow-red'
              : isBusy
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-wait'
                : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
          )}
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 fill-current" />
              Stop Recording
            </>
          ) : isBusy ? (
            <>
              <div className="flex items-end gap-0.5 h-5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="wave-bar w-1 bg-gray-400 rounded-full" />
                ))}
              </div>
              {state === 'transcribing' ? 'Transcribing...' : state === 'polishing' ? 'Polishing...' : 'Pasting...'}
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" />
              Start Recording
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-800 dark:hover:text-gray-200'
              )
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Status footer */}
      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
        <RecordingStatus state={state} />
      </div>
    </aside>
  )
}

function RecordingStatus({ state }: { state: string }) {
  const configs: Record<string, { text: string; dotColor: string; bgColor: string }> = {
    idle: { text: 'Ready', dotColor: 'bg-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400' },
    recording: { text: 'Recording', dotColor: 'bg-red-400', bgColor: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' },
    transcribing: { text: 'Transcribing', dotColor: 'bg-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400' },
    polishing: { text: 'Polishing', dotColor: 'bg-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' },
    pasting: { text: 'Pasting', dotColor: 'bg-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400' },
    error: { text: 'Error', dotColor: 'bg-red-500', bgColor: 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400' },
  }

  const { text, dotColor, bgColor } = configs[state] || configs.idle

  return (
    <div className={cn('flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium', bgColor)}>
      <span className={cn('w-2 h-2 rounded-full', dotColor, state === 'recording' && 'animate-pulse')} />
      {text}
    </div>
  )
}
