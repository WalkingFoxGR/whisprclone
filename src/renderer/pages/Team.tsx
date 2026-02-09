import { Users, Lock, BookOpen, Zap, BarChart3, Shield } from 'lucide-react'

export default function Team() {
  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Team management and shared resources</p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-5">
          <Users className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Connect to a Team</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
          Link to your team server for shared dictionaries, usage dashboards, and centralized settings.
        </p>

        <div className="space-y-3 max-w-sm mx-auto">
          <input type="text" placeholder="Team server URL (e.g., https://your-server.up.railway.app)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <input type="text" placeholder="Invite code"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button className="w-full px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl shadow-sm">
            Connect to team
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          <span>Requires a team server deployment</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FeatureCard icon={BookOpen} title="Shared Dictionary" description="Team-wide custom words that sync to all members" />
        <FeatureCard icon={Zap} title="Shared Snippets" description="Common snippets available to the entire team" />
        <FeatureCard icon={BarChart3} title="Usage Dashboard" description="Team-wide usage stats and adoption metrics" />
        <FeatureCard icon={Shield} title="Admin Controls" description="Manage team members, roles, and settings" />
      </div>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  )
}
