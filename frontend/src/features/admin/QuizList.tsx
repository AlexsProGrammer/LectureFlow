import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import api from '../../lib/api'

interface Quiz {
  id: string
  title: string
  admin_id: string
  created_at: string
}

export function QuizList() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      const res = await api.get('/quizzes')
      const data: Quiz[] = res.data
      setQuizzes(data)

      const counts: Record<string, number> = {}
      await Promise.all(
        data.map(async (quiz) => {
          try {
            const qRes = await api.get(`/quizzes/${quiz.id}/questions`)
            counts[quiz.id] = qRes.data.length
          } catch {
            counts[quiz.id] = 0
          }
        })
      )
      setQuestionCounts(counts)
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.quizzes.deleteConfirm'))) return
    try {
      await api.delete(`/quizzes/${id}`)
      setQuizzes((prev) => prev.filter((q) => q.id !== id))
    } catch {
      setError(t('admin.quizzes.deleteError'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.quizzes.title')}</h1>
        <button
          onClick={() => navigate('/admin/quizzes/new')}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          {t('admin.quizzes.create')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {quizzes.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">{t('admin.quizzes.noQuizzes')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-800">{quiz.title}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {questionCounts[quiz.id] ?? 0} {t('admin.quizzes.questions')}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {new Date(quiz.created_at).toLocaleDateString()}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => navigate(`/admin/quizzes/${quiz.id}/edit`)}
                  className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('admin.quizzes.edit')}
                </button>
                <button
                  onClick={() => handleDelete(quiz.id)}
                  className="flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('admin.quizzes.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
