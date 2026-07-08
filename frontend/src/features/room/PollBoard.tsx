import { useRoomStore } from '../../store/useRoomStore'
import { useAuthStore } from '../../store/useAuthStore'
import type { Poll as PollType } from './types'

function PollCard({ poll }: { poll: PollType }) {
  const votePoll = useRoomStore((state) => state.votePoll)
  const votedPolls = useRoomStore((state) => state.votedPolls)
  const token = useAuthStore((state) => state.token)
  const hasVoted = votedPolls.includes(poll.id)
  const showResults = hasVoted || !!token

  const totalVotes = poll.results
    ? Object.values(poll.results).reduce((sum: number, v: string | number) => sum + Number(v), 0)
    : poll.totalVotes

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900 mb-3">{poll.question}</h3>
      <div className="space-y-2">
        {poll.options.map((option, idx) => {
          const optionId = `${poll.id}-${idx}`
          const votes = poll.results ? Number(poll.results[optionId] || 0) : 0
          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0

          return (
            <button
              key={optionId}
              onClick={() => {
                if (!hasVoted) {
                  votePoll(poll.id, optionId)
                }
              }}
              disabled={hasVoted}
              className={`relative w-full text-left rounded-lg border px-4 py-2.5 text-sm transition-all overflow-hidden ${
                hasVoted
                  ? 'border-gray-200 cursor-default'
                  : 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            >
              {showResults && (
                <div
                  className="absolute inset-0 bg-blue-100 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              )}
              <span className="relative z-10 flex items-center justify-between">
                <span>{option}</span>
                {showResults && (
                  <span className="text-xs text-gray-500 ml-2">
                    {votes} ({Math.round(percentage)}%)
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
      {showResults && (
        <p className="text-xs text-gray-400 mt-2">{totalVotes} votes</p>
      )}
    </div>
  )
}

export function PollBoard() {
  const polls = useRoomStore((state) => state.polls)

  if (polls.length === 0) return null

  return (
    <div className="px-4 py-3 space-y-3 bg-gray-50 border-b border-gray-200 shrink-0">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  )
}
