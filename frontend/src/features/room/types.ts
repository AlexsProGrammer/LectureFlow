export interface ChatMessage {
  id: string
  sessionId: string
  content: string
  isAnswered: boolean
  timestamp: number
}

export interface Poll {
  id: string
  question: string
  options: string[]
  totalVotes: number
  results?: Record<string, number>
}
