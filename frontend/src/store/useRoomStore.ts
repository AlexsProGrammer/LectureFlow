import { create } from 'zustand'
import { io, type Socket } from 'socket.io-client'
import type { ChatMessage, Poll, QuizState, QuizQuestion } from '../features/room/types'
import { useAuthStore } from './useAuthStore'

interface RoomStore {
  socket: Socket | null
  isConnected: boolean
  messages: ChatMessage[]
  polls: Poll[]
  mySessionId: string | null
  roomCode: string | null
  votedPolls: string[]
  quiz: QuizState | null
  connectToRoom: (code: string) => void
  disconnect: () => void
  sendMessage: (content: string) => void
  deleteMessage: (messageId: string) => void
  markAnswered: (messageId: string) => void
  createPoll: (question: string, options: string[]) => void
  votePoll: (pollId: string, optionId: string) => void
  startQuiz: (quizId: string) => void
  submitAnswer: (questionId: string, answer: string) => void
  nextQuestion: () => void
  revealSolution: () => void
  endQuiz: () => void
}

function getVotedPolls(): string[] {
  try {
    const stored = sessionStorage.getItem('lectureflow-voted-polls')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function setVotedPolls(polls: string[]) {
  sessionStorage.setItem('lectureflow-voted-polls', JSON.stringify(polls))
}

function getSessionId(): string | undefined {
  try {
    return sessionStorage.getItem('lectureflow-session-id') || undefined
  } catch {
    return undefined
  }
}

function saveSessionId(id: string) {
  sessionStorage.setItem('lectureflow-session-id', id)
}

function scrubCorrectAnswer(question: QuizQuestion): QuizQuestion {
  return { ...question, correctAnswer: null }
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  socket: null,
  isConnected: false,
  messages: [],
  polls: [],
  mySessionId: null,
  roomCode: null,
  votedPolls: getVotedPolls(),
  quiz: null,

  connectToRoom: (code: string) => {
    const existing = get().socket
    if (existing) existing.disconnect()

    const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'
    const token = useAuthStore.getState().token
    const sessionId = getSessionId()

    const socket = io(baseUrl, {
      autoConnect: true,
      auth: {
        sessionId,
        token,
      },
    })

    socket.on('connect', () => {
      set({ isConnected: true })
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
    })

    socket.on('session', ({ sessionId: sid }: { sessionId: string }) => {
      set({ mySessionId: sid })
      saveSessionId(sid)
    })

    socket.on('joined', () => {
      set({ isConnected: true, roomCode: code })
    })

    socket.on('room_state', ({ chat, polls }: { chat: ChatMessage[]; polls: Poll[] }) => {
      set({ messages: chat, polls })
    })

    socket.on('new_message', (message: ChatMessage) => {
      set((state) => ({ messages: [...state.messages, message] }))
    })

    socket.on('message_deleted', ({ messageId }: { messageId: string }) => {
      set((state) => ({ messages: state.messages.filter((m) => m.id !== messageId) }))
    })

    socket.on('message_answered', ({ messageId }: { messageId: string }) => {
      set((state) => ({
        messages: state.messages.map((m) =>
          m.id === messageId ? { ...m, isAnswered: true } : m
        ),
      }))
    })

    socket.on('poll_created', (poll: Poll) => {
      set((state) => ({ polls: [...state.polls, poll] }))
    })

    socket.on('poll_update', ({ questionId, results }: { questionId: string; results: Record<string, number> }) => {
      set((state) => ({
        polls: state.polls.map((p) =>
          p.id === questionId
            ? {
                ...p,
                results,
                totalVotes: Object.values(results).reduce((sum, v) => sum + Number(v), 0),
              }
            : p
        ),
      }))
    })

    socket.on('quiz_started', ({
      quizId,
      title,
      question,
      totalQuestions,
      currentQuestionIndex,
    }: {
      quizId: string
      title: string
      question: QuizQuestion
      totalQuestions: number
      currentQuestionIndex: number
    }) => {
      set({
        quiz: {
          quizId,
          title,
          currentQuestion: question,
          currentQuestionIndex,
          totalQuestions,
          myAnswer: null,
          solutionRevealed: false,
          quizEnded: false,
          isAdmin: false,
          mcResults: null,
          openTextAnswers: [],
        },
      })
    })

    socket.on('quiz_question_changed', ({
      question,
      currentQuestionIndex,
      totalQuestions,
      finished,
    }: {
      question?: QuizQuestion
      currentQuestionIndex?: number
      totalQuestions?: number
      finished?: boolean
    }) => {
      set((state) => {
        if (!state.quiz) return state
        if (finished) {
          return {
            quiz: {
              ...state.quiz,
              currentQuestion: null,
              quizEnded: true,
            },
          }
        }
        return {
          quiz: {
            ...state.quiz,
            currentQuestion: question ? scrubCorrectAnswer(question) : null,
            currentQuestionIndex: currentQuestionIndex ?? state.quiz.currentQuestionIndex,
            totalQuestions: totalQuestions ?? state.quiz.totalQuestions,
            myAnswer: null,
            solutionRevealed: false,
            mcResults: null,
            openTextAnswers: [],
          },
        }
      })
    })

    socket.on('quiz_solution_revealed', ({
      correctAnswer,
      type,
      results,
    }: {
      correctAnswer: string
      type: string
      results: Record<string, number> | string[]
    }) => {
      set((state) => {
        if (!state.quiz) return state
        return {
          quiz: {
            ...state.quiz,
            solutionRevealed: true,
            currentQuestion: state.quiz.currentQuestion
              ? { ...state.quiz.currentQuestion, correctAnswer }
              : null,
            mcResults: type === 'multiple_choice' ? (results as Record<string, number>) : null,
            openTextAnswers: type === 'open_text' ? (results as string[]) : [],
          },
        }
      })
    })

    socket.on('quiz_answer_update', ({
      type,
      results,
      answers,
    }: {
      type: string
      results?: Record<string, number>
      answers?: string[]
    }) => {
      set((state) => {
        if (!state.quiz) return state
        return {
          quiz: {
            ...state.quiz,
            mcResults: type === 'multiple_choice' ? results ?? null : state.quiz.mcResults,
            openTextAnswers: type === 'open_text' ? answers ?? [] : state.quiz.openTextAnswers,
          },
        }
      })
    })

    socket.on('quiz_ended', () => {
      set({ quiz: null })
    })

    set({ socket })
  },

  disconnect: () => {
    const socket = get().socket
    if (socket) {
      socket.disconnect()
    }
    set({ socket: null, isConnected: false, messages: [], polls: [], roomCode: null, mySessionId: null, quiz: null })
  },

  sendMessage: (content: string) => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('send_chat', { roomId: roomCode, content })
    }
  },

  deleteMessage: (messageId: string) => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('delete_chat', { roomId: roomCode, messageId })
    }
  },

  markAnswered: (messageId: string) => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('mark_answered', { roomId: roomCode, messageId })
    }
  },

  createPoll: (question: string, options: string[]) => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('create_poll', { roomId: roomCode, question, options })
    }
  },

  votePoll: (pollId: string, optionId: string) => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('submit_poll', { roomId: roomCode, questionId: pollId, optionId })
      const current = get().votedPolls
      if (!current.includes(pollId)) {
        const updated = [...current, pollId]
        set({ votedPolls: updated })
        setVotedPolls(updated)
      }
    }
  },

  startQuiz: (quizId: string) => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('start_quiz', { roomCode, quizId })
    }
  },

  submitAnswer: (questionId: string, answer: string) => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('submit_answer', { roomCode, questionId, answer })
      set((state) => ({
        quiz: state.quiz ? { ...state.quiz, myAnswer: answer } : state.quiz,
      }))
    }
  },

  nextQuestion: () => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('next_question', { roomCode })
    }
  },

  revealSolution: () => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('reveal_solution', { roomCode })
    }
  },

  endQuiz: () => {
    const { socket, roomCode } = get()
    if (socket && roomCode) {
      socket.emit('end_quiz', { roomCode })
    }
  },
}))
