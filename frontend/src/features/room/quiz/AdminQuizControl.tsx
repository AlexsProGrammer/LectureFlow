import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRoomStore } from '../../../store/useRoomStore'
import { SkipForward, Eye, Square } from 'lucide-react'
import { StartQuizModal } from './StartQuizModal'
import { OpenTextFeed } from './OpenTextFeed'

export function AdminQuizControl() {
  const { t } = useTranslation()
  const quiz = useRoomStore((state) => state.quiz)
  const nextQuestion = useRoomStore((state) => state.nextQuestion)
  const revealSolution = useRoomStore((state) => state.revealSolution)
  const endQuiz = useRoomStore((state) => state.endQuiz)
  const [showModal, setShowModal] = useState(false)

  if (!quiz) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="mb-4 text-gray-500">{t('room.quiz.noActiveQuiz')}</p>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            {t('room.quiz.start')}
          </button>
          <StartQuizModal open={showModal} onClose={() => setShowModal(false)} />
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
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-lg font-medium text-gray-900">{question.content}</p>
            {question.media?.file_path && (
              <div className="mt-4">
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${question.media.file_path}`}
                  alt="Question media"
                  className="max-h-48 rounded-lg border border-gray-200 object-contain"
                />
              </div>
            )}

            {question.type === 'multiple_choice' && question.options && (
              <div className="mt-4 space-y-2">
                {question.options.map((option, i) => {
                  const isCorrect = option === question.correctAnswer
                  const voteCount = quiz.mcResults?.[option] ?? 0
                  const totalVotes = quiz.mcResults
                    ? Object.values(quiz.mcResults).reduce((sum, v) => sum + v, 0)
                    : 0
                  const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0

                  return (
                    <div key={i} className="relative">
                      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">{option}</span>
                        <div className="flex items-center gap-2">
                          {quiz.solutionRevealed && isCorrect && (
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              {t('room.quiz.result.correct')}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {voteCount} ({Math.round(percentage)}%)
                          </span>
                        </div>
                      </div>
                      {totalVotes > 0 && (
                        <div
                          className="absolute bottom-0 left-0 h-1 rounded-b-lg bg-indigo-400 opacity-30"
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                    </div>
                  )
                })}
                {quiz.mcResults && Object.keys(quiz.mcResults).length > 0 && (
                  <p className="mt-2 text-xs text-gray-400">
                    {t('room.quiz.totalVotes')}: {Object.values(quiz.mcResults).reduce((s, v) => s + v, 0)}
                  </p>
                )}
              </div>
            )}
          </div>

          {question.type === 'open_text' && <OpenTextFeed />}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={revealSolution}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              <Eye className="h-4 w-4" />
              {t('room.quiz.revealSolution')}
            </button>
            <button
              onClick={nextQuestion}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <SkipForward className="h-4 w-4" />
              {t('room.quiz.nextQuestion')}
            </button>
            <button
              onClick={endQuiz}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <Square className="h-4 w-4" />
              {t('room.quiz.endQuiz')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
