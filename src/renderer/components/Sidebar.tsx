import { NavLink } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard,
  Settings,
  BookOpen,
  Zap,
  Palette,
  Mic,
  Users,
  Square,
  ClipboardList,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { useRecordingStore } from '../stores/recording.store'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: ClipboardList, label: 'History' },
  { to: '/dictionary', icon: BookOpen, label: 'Dictionary' },
  { to: '/snippets', icon: Zap, label: 'Snippets' },
  { to: '/tone', icon: Palette, label: 'Tone Profiles' },
  { to: '/team', icon: Users, label: 'Team' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function Sidebar() {
  const state = useRecordingStore((s) => s.state)
  const isRecording = state === 'recording'
  const isBusy = state === 'transcribing' || state === 'polishing' || state === 'pasting'

  // Timer
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRecording) {
      setElapsed(0)
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      if (!isBusy) setElapsed(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const handleRecordToggle = async () => {
    if (isRecording) {
      await window.api.recording.stop()
    } else if (!isBusy) {
      await window.api.recording.start()
    }
  }

  const BAR_COUNT = 28

  return (
    <aside className="w-52 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
      {/* Title bar drag area */}
      <div className="titlebar-drag h-14 flex items-center px-4 pt-2">
        <div className="titlebar-no-drag flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center',
            isRecording
              ? 'bg-red-500 animate-pulse-recording'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600'
          )}>
            <Mic className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">VoxPilot</span>
        </div>
      </div>

      {/* Animated Record Button */}
      <div className="px-3 py-2.5">
        <button
          onClick={handleRecordToggle}
          disabled={isBusy}
          className={cn(
            'w-full relative flex flex-col items-center gap-1.5 rounded-2xl cursor-pointer',
            'transition-all duration-300 overflow-hidden',
            isRecording
              ? 'bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 py-3 px-3'
              : isBusy
                ? 'bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 py-3 px-3 cursor-wait'
                : 'bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 py-3 px-3 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20'
          )}
        >
          {/* Top row: icon + timer/label */}
          <div className="flex items-center gap-2">
            {isRecording ? (
              <div className="animate-spin-slow">
                <Square className="w-4 h-4 text-red-500 fill-red-500 rounded-[2px]" />
              </div>
            ) : isBusy ? (
              <div className="flex items-end gap-0.5 h-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="wave-bar w-0.5 bg-amber-400 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/25">
                <Mic className="w-3.5 h-3.5 text-white" />
              </div>
            )}

            {isRecording ? (
              <span className="text-xs font-mono font-semibold text-red-600 dark:text-red-400 tabular-nums">
                {formatTime(elapsed)}
              </span>
            ) : isBusy ? (
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {state === 'transcribing' ? 'Transcribing…' : state === 'polishing' ? 'Polishing…' : 'Pasting…'}
              </span>
            ) : null}
          </div>

          {/* Visualizer bars — only when recording */}
          {isRecording && (
            <div className="flex items-center justify-center gap-[2px] h-6 w-full">
              {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <div
                  key={i}
                  className="visualizer-bar bg-red-400/80 dark:bg-red-400/70"
                />
              ))}
            </div>
          )}

          {/* Label text */}
          <span className={cn(
            'text-[11px] font-medium',
            isRecording
              ? 'text-red-500 dark:text-red-400'
              : isBusy
                ? 'text-gray-400 dark:text-gray-500'
                : 'text-gray-500 dark:text-gray-400'
          )}>
            {isRecording ? 'Listening…' : isBusy ? '' : 'Click to speak'}
          </span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-1 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-800 dark:hover:text-gray-200'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Status footer */}
      <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
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
    <div className={cn('flex items-center justify-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium', bgColor)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', dotColor, state === 'recording' && 'animate-pulse')} />
      {text}
    </div>
  )
}
