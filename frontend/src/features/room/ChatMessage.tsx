import { useRoomStore } from '../../store/useRoomStore'
import { useAuthStore } from '../../store/useAuthStore'
import { Trash2, CheckCheck } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from './types'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const mySessionId = useRoomStore((state) => state.mySessionId)
  const deleteMessage = useRoomStore((state) => state.deleteMessage)
  const markAnswered = useRoomStore((state) => state.markAnswered)
  const token = useAuthStore((state) => state.token)
  const isOwner = mySessionId === message.sessionId
  const isAdmin = !!token

  const handleDelete = () => {
    if (isOwner) {
      deleteMessage(message.id)
    }
  }

  const handleMarkAnswered = () => {
    if (isAdmin) {
      markAnswered(message.id)
    }
  }

  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-all ${
        message.isAnswered
          ? 'bg-gray-50 border-gray-200 opacity-50'
          : 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm text-gray-800 flex-1 ${message.isAnswered ? 'line-through' : ''}`}>
          {message.content}
        </p>

        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <button
              onClick={handleMarkAnswered}
              className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition"
              title="Mark as answered"
            >
              <CheckCheck size={16} />
            </button>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition"
              title="Delete message"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
