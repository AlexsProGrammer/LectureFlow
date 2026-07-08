import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRoomStore } from '../../store/useRoomStore'
import { PollBoard } from './PollBoard'
import { Chatwall } from './Chatwall'
import { CreatePollModal } from './CreatePollModal'

export function LiveRoomPage() {
  const { code } = useParams<{ code: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const connectToRoom = useRoomStore((state) => state.connectToRoom)
  const disconnect = useRoomStore((state) => state.disconnect)
  const isConnected = useRoomStore((state) => state.isConnected)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true })
      return
    }

    connectToRoom(code)

    return () => {
      disconnect()
    }
  }, [code, connectToRoom, disconnect, navigate])

  useEffect(() => {
    if (code) {
      const socket = useRoomStore.getState().socket
      if (!socket) return

      const handleError = ({ message }: { message: string }) => {
        if (message === 'Room not found or expired') {
          setError(message)
        }
      }

      socket.on('error', handleError)

      return () => {
        socket.off('error', handleError)
      }
    }
  }, [code])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{t('room.notFound')}</h1>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">{t('room.connecting')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-gray-900">{t('room.title')} — {code?.toUpperCase()}</h1>
        <CreatePollModal />
      </header>

      <div className="flex-1 overflow-hidden flex flex-col">
        <PollBoard />
        <Chatwall />
      </div>
    </div>
  )
}
