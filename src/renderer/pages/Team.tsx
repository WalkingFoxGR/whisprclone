import { Users, Lock } from 'lucide-react'

export default function Team() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Team management and shared resources
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <Users className="w-6 h-6 text-gray-400" />
        </div>
        <h2 className="font-semibold mb-2">Team Features</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
          Connect to a team server to enable shared dictionaries, usage dashboards, and team-wide
          settings.
        </p>

        <div className="space-y-3 max-w-sm mx-auto">
          <input
            type="text"
            placeholder="Team server URL"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-center"
          />
          <input
            type="text"
            placeholder="Invite code"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-center"
          />
          <button className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            Connect to team
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          <span>Requires a team server deployment</span>
        </div>
      </div>

      {/* Features preview */}
      <div className="grid grid-cols-2 gap-4">
        <FeatureCard
          title="Shared Dictionary"
          description="Team-wide custom words and names that sync to all members."
        />
        <FeatureCard
          title="Shared Snippets"
          description="Common snippets available to the entire team."
        />
        <FeatureCard
          title="Usage Dashboard"
          description="See team-wide usage stats and adoption metrics."
        />
        <FeatureCard
          title="Admin Controls"
          description="Manage team members, roles, and settings."
        />
      </div>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  )
}
