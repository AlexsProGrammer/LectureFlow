import { create } from 'zustand'
import { io, type Socket } from 'socket.io-client'
import type { ChatMessage, Poll } from '../features/room/types'
import { useAuthStore } from './useAuthStore'

interface RoomStore {
  socket: Socket | null
  isConnected: boolean
  messages: ChatMessage[]
  polls: Poll[]
  mySessionId: string | null
  roomCode: string | null
  votedPolls: string[]
  connectToRoom: (code: string) => void
  disconnect: () => void
  sendMessage: (content: string) => void
  deleteMessage: (messageId: string) => void
  markAnswered: (messageId: string) => void
  createPoll: (question: string, options: string[]) => void
  votePoll: (pollId: string, optionId: string) => void
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

export const useRoomStore = create<RoomStore>((set, get) => ({
  socket: null,
  isConnected: false,
  messages: [],
  polls: [],
  mySessionId: null,
  roomCode: null,
  votedPolls: getVotedPolls(),

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

    set({ socket })
  },

  disconnect: () => {
    const socket = get().socket
    if (socket) {
      socket.disconnect()
    }
    set({ socket: null, isConnected: false, messages: [], polls: [], roomCode: null, mySessionId: null })
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
}))
