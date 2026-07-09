import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRoomStore } from '../../../store/useRoomStore'
import { X, Search, Loader2 } from 'lucide-react'
import api from '../../../lib/api'

interface Quiz {
  id: string
  title: string
  created_at: string
}

interface StartQuizModalProps {
  open: boolean
  onClose: () => void
}

export function StartQuizModal({ open, onClose }: StartQuizModalProps) {
  const { t } = useTranslation()
  const startQuiz = useRoomStore((state) => state.startQuiz)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchQuizzes()
    }
  }, [open])

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      const res = await api.get('/quizzes')
      setQuizzes(res.data)
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (quizId: string) => {
    startQuiz(quizId)
    onClose()
  }

  const filtered = quizzes.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t('room.quiz.selectQuiz')}</h2>
          <button onClick={onClose} className="text-gray-400 transition hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('room.quiz.searchQuiz')}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">{t('admin.quizzes.noQuizzes')}</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-auto">
            {filtered.map((quiz) => (
              <button
                key={quiz.id}
                onClick={() => handleSelect(quiz.id)}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:border-indigo-400 hover:bg-indigo-50"
              >
                <span>{quiz.title}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {new Date(quiz.created_at).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
