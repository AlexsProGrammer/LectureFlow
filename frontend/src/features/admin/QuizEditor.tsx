import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Upload, Loader2, ArrowLeft } from 'lucide-react'
import api from '../../lib/api'

interface Question {
  id?: string
  type: 'multiple_choice' | 'open_text'
  content: string
  options: string[]
  correct_answer: string
  media?: { id: string; file_path: string; type: string } | null
}

export function QuizEditor() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { quizId } = useParams<{ quizId: string }>()
  const isEditMode = !!quizId

  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEditMode)

  const fetchQuiz = useCallback(async () => {
    if (!quizId) return
    try {
      setLoading(true)
      const [quizRes, questionsRes] = await Promise.all([
        api.get(`/quizzes/${quizId}`),
        api.get(`/quizzes/${quizId}/questions`),
      ])
      setTitle(quizRes.data.title)

      const fetchedQuestions: Question[] = await Promise.all(
        questionsRes.data.map(async (q: Question) => {
          let media = null
          try {
            const mediaRes = await api.get(`/quizzes/${quizId}/questions/${q.id}/media`)
            media = mediaRes.data?.[0] || null
          } catch {
            media = null
          }
          return {
            ...q,
            options: q.options ? (q.options as string[]) : [],
            media,
          }
        })
      )

      setQuestions(fetchedQuestions)
    } catch {
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [quizId, t])

  useEffect(() => {
    if (isEditMode) {
      fetchQuiz()
    }
  }, [isEditMode, fetchQuiz])

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        type: 'multiple_choice',
        content: '',
        options: ['', ''],
        correct_answer: '',
        media: null,
      },
    ])
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const updateQuestion = (index: number, field: keyof Question, value: unknown) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    )
  }

  const addOption = (index: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, options: [...q.options, ''] } : q
      )
    )
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === questionIndex
          ? { ...q, options: q.options.filter((_, oi) => oi !== optionIndex) }
          : q
      )
    )
  }

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q, qi) =>
        qi === questionIndex
          ? {
              ...q,
              options: q.options.map((opt, oi) => (oi === optionIndex ? value : opt)),
            }
          : q
      )
    )
  }

  const handleMediaUpload = async (questionIndex: number, file: File) => {
    const question = questions[questionIndex]
    if (!question.id) {
      setError('Please save the question first before uploading media')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('question_id', question.id)

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === questionIndex ? { ...q, media: res.data } : q
        )
      )
    } catch {
      setError(t('common.error'))
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Quiz title is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      let currentQuizId = quizId

      if (!currentQuizId) {
        const res = await api.post('/quizzes', { title: title.trim() })
        currentQuizId = res.data.id
      } else {
        await api.put(`/quizzes/${currentQuizId}`, { title: title.trim() })
      }

      for (const question of questions) {
        if (!question.content.trim()) continue

        const payload = {
          type: question.type,
          content: question.content.trim(),
          options: question.type === 'multiple_choice' ? question.options.filter((o) => o.trim()) : null,
          correct_answer: question.type === 'multiple_choice' ? question.correct_answer.trim() : null,
        }

        if (question.id) {
          await api.put(`/questions/${question.id}`, payload)
        } else {
          await api.post(`/quizzes/${currentQuizId}/questions`, payload)
        }
      }

      navigate('/admin/quizzes')
    } catch {
      setError(t('admin.quizEditor.saveError'))
    } finally {
      setSaving(false)
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
      <button
        onClick={() => navigate('/admin/quizzes')}
        className="mb-4 flex items-center gap-2 text-sm text-gray-600 transition hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('admin.quizzes.title')}
      </button>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {isEditMode ? t('admin.quizEditor.titleEdit') : t('admin.quizEditor.titleNew')}
      </h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {t('admin.quizEditor.quizTitle')}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Quiz title..."
        />
      </div>

      {questions.map((question, qi) => (
        <div key={qi} className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">
              {t('admin.quizEditor.questionContent')} #{qi + 1}
            </span>
            <button
              onClick={() => removeQuestion(qi)}
              className="text-red-500 transition hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {t('admin.quizEditor.questionType')}
            </label>
            <select
              value={question.type}
              onChange={(e) => updateQuestion(qi, 'type', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="multiple_choice">{t('admin.quizEditor.multipleChoice')}</option>
              <option value="open_text">{t('admin.quizEditor.openText')}</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {t('admin.quizEditor.questionContent')}
            </label>
            <textarea
              value={question.content}
              onChange={(e) => updateQuestion(qi, 'content', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={2}
              placeholder="Enter question..."
            />
          </div>

          {question.type === 'multiple_choice' && (
            <>
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {t('admin.quizEditor.options')}
                </label>
                {question.options.map((option, oi) => (
                  <div key={oi} className="mb-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder={`${t('admin.quizEditor.optionLabel')} ${oi + 1}`}
                    />
                    {question.options.length > 2 && (
                      <button
                        onClick={() => removeOption(qi, oi)}
                        className="text-red-500 transition hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addOption(qi)}
                  className="mt-1 flex items-center gap-1 text-xs text-indigo-600 transition hover:text-indigo-800"
                >
                  <Plus className="h-3 w-3" />
                  {t('admin.quizEditor.addOption')}
                </button>
              </div>

              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {t('admin.quizEditor.correctAnswer')}
                </label>
                <select
                  value={question.correct_answer}
                  onChange={(e) => updateQuestion(qi, 'correct_answer', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">-- {t('admin.quizEditor.correctAnswer')} --</option>
                  {question.options
                    .filter((o) => o.trim())
                    .map((opt, oi) => (
                      <option key={oi} value={opt.trim()}>
                        {opt.trim()}
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}

          {question.type === 'open_text' && (
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
              {t('admin.quizEditor.openText')}
            </div>
          )}

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              {t('admin.quizEditor.mediaUpload')}
            </label>
            {question.media?.file_path && (
              <div className="mb-2">
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}${question.media.file_path}`}
                  alt="Question media"
                  className="max-h-32 rounded-lg border border-gray-200"
                />
              </div>
            )}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-indigo-600 transition hover:text-indigo-800">
              <Upload className="h-4 w-4" />
              {t('admin.quizEditor.mediaUpload')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleMediaUpload(qi, file)
                }}
              />
            </label>
          </div>
        </div>
      ))}

      <button
        onClick={addQuestion}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 transition hover:border-indigo-400 hover:text-indigo-600"
      >
        <Plus className="h-4 w-4" />
        {t('admin.quizEditor.addQuestion')}
      </button>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? t('admin.quizEditor.saving') : t('admin.quizEditor.save')}
        </button>
        <button
          onClick={() => navigate('/admin/quizzes')}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
