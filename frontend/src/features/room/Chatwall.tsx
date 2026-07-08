import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRoomStore } from '../../store/useRoomStore'
import { ChatMessage } from './ChatMessage'
import { Send } from 'lucide-react'

export function Chatwall() {
  const { t } = useTranslation()
  const messages = useRoomStore((state) => state.messages)
  const isConnected = useRoomStore((state) => state.isConnected)
  const sendMessage = useRoomStore((state) => state.sendMessage)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || !isConnected) return
    sendMessage(trimmed)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">{t('room.chatwall.empty')}</p>
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('room.chatwall.placeholder')}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            dataGramm="false"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
            disabled={!isConnected}
          />
          <button
            onClick={handleSubmit}
            disabled={!isConnected || !input.trim()}
            className="rounded-lg bg-indigo-600 p-3 text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            aria-label={t('room.chatwall.send')}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
