import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="titlebar-drag h-12" />
        <div className="px-8 pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
