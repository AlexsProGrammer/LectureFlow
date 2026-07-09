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

export interface QuizMedia {
  id: string
  file_path: string
  type: string
}

export interface QuizQuestion {
  id: string
  type: 'multiple_choice' | 'open_text'
  content: string
  options: string[] | null
  correctAnswer: string | null
  media?: QuizMedia | null
}

export interface QuizState {
  quizId: string
  title: string
  currentQuestion: QuizQuestion | null
  currentQuestionIndex: number
  totalQuestions: number
  myAnswer: string | null
  solutionRevealed: boolean
  quizEnded: boolean
  isAdmin: boolean
  mcResults: Record<string, number> | null
  openTextAnswers: string[]
}
