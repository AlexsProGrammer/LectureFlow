import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function PublicLayout() {
  const { i18n, t } = useTranslation()
  const [langOpen, setLangOpen] = useState(false)

  const toggleLang = () => {
    const next = i18n.language === 'de' ? 'en' : 'de'
    i18n.changeLanguage(next)
    setLangOpen(false)
  }

  return (
    <div className="relative min-h-screen">
      <header className="fixed right-4 top-4 z-50">
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow transition hover:bg-gray-50"
            aria-label={t('common.language')}
          >
            {i18n.language === 'de' ? 'DE' : 'EN'}
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg bg-white py-1 shadow-lg">
              <button
                onClick={() => { i18n.changeLanguage('de'); setLangOpen(false) }}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${i18n.language === 'de' ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}
              >
                Deutsch
              </button>
              <button
                onClick={() => { i18n.changeLanguage('en'); setLangOpen(false) }}
                className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${i18n.language === 'en' ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}
              >
                English
              </button>
            </div>
          )}
        </div>
      </header>

      <Outlet />
    </div>
  )
}
