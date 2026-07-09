import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, ExternalLink } from 'lucide-react'
import api from '../lib/api'

interface Room {
  code: string
  status: string
  createdAt: string
  adminId: string
  hasActiveQuiz: boolean
}

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState<Room[]>([])
  const [quizCount, setQuizCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [roomsRes, quizzesRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/quizzes'),
      ])
      setRooms(roomsRes.data)
      setQuizCount(quizzesRes.data.length)
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateRoom = async () => {
    try {
      setCreating(true)
      setError(null)
      const res = await api.post('/rooms')
      setCreatedCode(res.data.code)
      fetchData()
    } catch {
      setError(t('common.error'))
    } finally {
      setCreating(false)
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
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.dashboard.title')}</h1>
        <button
          onClick={handleCreateRoom}
          disabled={creating}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {creating ? t('common.loading') : t('admin.dashboard.createRoom')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      {createdCode && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {t('admin.dashboard.roomCreated')}: <strong>{createdCode.toUpperCase()}</strong>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">{t('admin.dashboard.rooms')}</h2>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{rooms.length}</p>
          <p className="text-sm text-gray-500">{t('admin.dashboard.active')}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800">{t('admin.dashboard.totalQuizzes')}</h2>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{quizCount}</p>
          <button
            onClick={() => navigate('/admin/quizzes')}
            className="mt-2 text-sm text-indigo-600 transition hover:text-indigo-800"
          >
            {t('admin.quizzes.title')} &rarr;
          </button>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-800">{t('admin.dashboard.rooms')}</h2>
      {rooms.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">{t('admin.dashboard.noRooms')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div
              key={room.code}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{room.code.toUpperCase()}</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    room.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {room.status}
                </span>
              </div>
              {room.hasActiveQuiz && (
                <span className="mt-1 inline-block rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  Quiz aktiv
                </span>
              )}
              <p className="mt-2 text-xs text-gray-400">
                {new Date(Number(room.createdAt)).toLocaleString()}
              </p>
              <a
                href={`/room/${room.code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {t('admin.dashboard.joinRoom')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
