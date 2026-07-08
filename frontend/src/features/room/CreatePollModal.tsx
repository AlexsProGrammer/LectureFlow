import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/useAuthStore'
import { useRoomStore } from '../../store/useRoomStore'
import { Plus, X, Send } from 'lucide-react'

export function CreatePollModal() {
  const { t } = useTranslation()
  const token = useAuthStore((state) => state.token)
  const createPoll = useRoomStore((state) => state.createPoll)
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])

  if (!token) return null

  const addOption = () => setOptions([...options, ''])

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...options]
    updated[index] = value
    setOptions(updated)
  }

  const handleSubmit = () => {
    const trimmedQuestion = question.trim()
    const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0)

    if (!trimmedQuestion || trimmedOptions.length < 2) return

    createPoll(trimmedQuestion, trimmedOptions)
    setQuestion('')
    setOptions(['', ''])
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
      >
        <Plus size={16} />
        <span>{t('room.poll.create')}</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">{t('room.poll.create')}</h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('room.poll.question')}
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="What do you want to ask?"
            />
          </div>

          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder={`Option ${index + 1}`}
                />
                {options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-50"
                    title={t('room.poll.removeOption')}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={addOption}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
          >
            <Plus size={16} />
            <span>{t('room.poll.addOption')}</span>
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {t('room.poll.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            <span>{t('room.poll.submit')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
