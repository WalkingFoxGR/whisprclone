import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="titlebar-drag h-12" />
        <div className="px-6 pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
