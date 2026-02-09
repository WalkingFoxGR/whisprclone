import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Settings,
  BookOpen,
  Zap,
  Palette,
  Mic,
  Users,
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

  return (
    <aside className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      {/* Title bar drag area */}
      <div className="titlebar-drag h-12 flex items-center px-5 pt-1">
        <div className="titlebar-no-drag flex items-center gap-2">
          <Mic className={cn(
            'w-5 h-5',
            state === 'recording' ? 'text-red-500 animate-pulse-recording' : 'text-indigo-600'
          )} />
          <span className="font-semibold text-sm tracking-tight">FlowCopy</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Recording status */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-800">
        <RecordingBadge state={state} />
      </div>
    </aside>
  )
}

function RecordingBadge({ state }: { state: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    idle: { text: 'Ready', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    recording: { text: 'Recording...', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    transcribing: { text: 'Transcribing...', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    polishing: { text: 'Polishing...', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    pasting: { text: 'Pasting...', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    error: { text: 'Error', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }

  const { text, color } = labels[state] || labels.idle

  return (
    <div className={cn('px-3 py-1.5 rounded-md text-xs font-medium text-center', color)}>
      {state === 'recording' && (
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" />
      )}
      {text}
    </div>
  )
}
