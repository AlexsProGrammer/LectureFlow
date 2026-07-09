import { useTranslation } from 'react-i18next'
import { useRoomStore } from '../../../store/useRoomStore'

export function OpenTextFeed() {
  const { t } = useTranslation()
  const openTextAnswers = useRoomStore((state) => state.quiz?.openTextAnswers ?? [])

  if (openTextAnswers.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('room.quiz.liveAnswers')}</h3>
        <p className="text-sm text-gray-400">{t('room.quiz.noAnswersYet')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('room.quiz.liveAnswers')}</h3>
      <div className="max-h-64 space-y-2 overflow-auto">
        {openTextAnswers.map((answer, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700"
          >
            {answer}
          </div>
        ))}
      </div>
    </div>
  )
}
