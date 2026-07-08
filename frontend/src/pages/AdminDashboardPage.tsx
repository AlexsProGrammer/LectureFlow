import { useTranslation } from 'react-i18next'

export function AdminDashboardPage() {
  const { t } = useTranslation()

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>
      <p className="text-gray-600">{t('admin.dashboard.welcome')}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">{t('admin.dashboard.rooms')}</h2>
          <p className="mt-2 text-3xl font-bold text-indigo-600">0</p>
          <p className="text-sm text-gray-500">{t('admin.dashboard.active')}</p>
        </div>
      </div>
    </div>
  )
}
