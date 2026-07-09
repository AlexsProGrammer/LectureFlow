import { useTranslation } from 'react-i18next'
import { useRoomStore } from '../../../store/useRoomStore'
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react'

export function StudentQuizView() {
  const { t } = useTranslation()
  const quiz = useRoomStore((state) => state.quiz)
  const submitAnswer = useRoomStore((state) => state.submitAnswer)

  if (!quiz) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-lg font-medium text-gray-600">{t('room.quiz.waiting')}</p>
        </div>
      </div>
    )
  }

  if (quiz.quizEnded) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-green-700">{t('room.quiz.quizEnded')}</h2>
          <p className="mt-2 text-gray-600">{t('room.quiz.finished')}</p>
        </div>
      </div>
    )
  }

  if (!quiz.currentQuestion) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    )
  }

  const question = quiz.currentQuestion
  const isAnswered = quiz.myAnswer !== null

  const getResultBadge = () => {
    if (!quiz.solutionRevealed) return null
    if (!quiz.myAnswer) {
      return (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600">
          <MinusCircle className="h-5 w-5" />
          {t('room.quiz.result.noAnswer')}
        </div>
      )
    }
    if (quiz.myAnswer === question.correctAnswer) {
      return (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
          <CheckCircle className="h-5 w-5" />
          {t('room.quiz.result.correct')}
        </div>
      )
    }
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700">
        <XCircle className="h-5 w-5" />
        {t('room.quiz.result.incorrect')}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{quiz.title}</h2>
          <span className="text-sm text-gray-500">
            {t('room.quiz.question')} {quiz.currentQuestionIndex + 1} {t('room.quiz.of')} {quiz.totalQuestions}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-lg font-medium text-gray-900">{question.content}</p>

            {question.media?.file_path && (
              <div className="mt-4">
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${question.media.file_path}`}
                  alt="Question media"
                  className="max-h-64 rounded-lg border border-gray-200 object-contain"
                />
              </div>
            )}

            {question.type === 'multiple_choice' && question.options && (
              <div className="mt-6 space-y-3">
                {question.options.map((option, i) => {
                  const isSelected = quiz.myAnswer === option
                  const isDisabled = isAnswered
                  return (
                    <button
                      key={i}
                      onClick={() => submitAnswer(question.id, option)}
                      disabled={isDisabled}
                      className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                      } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      {option}
                    </button>
                  )
                })}
              </div>
            )}

            {question.type === 'open_text' && (
              <div className="mt-6">
                <textarea
                  value={quiz.myAnswer || ''}
                  onChange={(e) => {
                    if (!isAnswered) {
                      useRoomStore.setState({ quiz: { ...quiz, myAnswer: e.target.value } })
                    }
                  }}
                  placeholder={t('room.quiz.openTextPlaceholder')}
                  disabled={isAnswered}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                  rows={4}
                />
                {!isAnswered && quiz.myAnswer && (
                  <button
                    onClick={() => submitAnswer(question.id, quiz.myAnswer!)}
                    className="mt-3 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    {t('room.quiz.submitAnswer')}
                  </button>
                )}
              </div>
            )}

            {isAnswered && question.type === 'multiple_choice' && (
              <p className="mt-3 text-sm text-gray-500">{t('room.quiz.answerSent')}</p>
            )}

            {getResultBadge()}
          </div>
        </div>
      </div>
    </div>
  )
}
