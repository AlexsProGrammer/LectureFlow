import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/useAuthStore'
import { LayoutDashboard, BookOpen } from 'lucide-react'

export function AdminLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin)

  if (!token) {
    return <Navigate to="/admin/login" replace />
  }

  const navItems = [
    { path: '/admin', label: t('admin.dashboard.title'), icon: LayoutDashboard },
    { path: '/admin/quizzes', label: t('admin.layout.quizzes'), icon: BookOpen },
  ]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-lg font-bold text-gray-900">LectureFlow</span>
          {isSuperAdmin && (
            <span className="ml-2 rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              Super
            </span>
          )}
        </div>

        <nav className="p-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t('admin.layout.sidebar')}
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
            return (
              <a
                key={item.path}
                href={item.path}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={logout}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {t('admin.layout.logout')}
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
