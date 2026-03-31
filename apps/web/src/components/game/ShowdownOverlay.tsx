import { useEffect, useState, useRef } from 'react'
import type { ShowdownResult } from '@wpc/shared'
import { TeamCardComponent } from './TeamCardComponent'

interface ShowdownOverlayProps {
  readonly results: readonly ShowdownResult[]
}

export function ShowdownOverlay({ results }: ShowdownOverlayProps) {
  const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore)
  const [revealedCount, setRevealedCount] = useState(0)
  const [scoreCounts, setScoreCounts] = useState<Record<string, number>>({})
  const [dismissed, setDismissed] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const timers: ReturnType<typeof setTimeout>[] = []

    sorted.forEach((result, i) => {
      timers.push(
        setTimeout(() => {
          if (!mountedRef.current) return
          setRevealedCount(i + 1)
        }, i * 1200),
      )

      timers.push(
        setTimeout(
          () => {
            if (!mountedRef.current) return
            animateScore(result.userId, result.totalScore)
          },
          i * 1200 + 400,
        ),
      )
    })

    timers.push(
      setTimeout(
        () => {
          if (!mountedRef.current) return
          setDismissed(true)
        },
        sorted.length * 1200 + 3000,
      ),
    )

    return () => {
      mountedRef.current = false
      timers.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function animateScore(userId: string, target: number) {
    if (target === 0) {
      setScoreCounts((prev) => ({ ...prev, [userId]: 0 }))
      return
    }
    const steps = Math.min(target, 12)
    const stepDuration = 600 / steps
    let current = 0
    const interval = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval(interval)
        return
      }
      current++
      const value = Math.round((current / steps) * target)
      setScoreCounts((prev) => ({ ...prev, [userId]: value }))
      if (current >= steps) clearInterval(interval)
    }, stepDuration)
  }

  if (dismissed) return null

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-amber-500/30 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="font-cinzel text-2xl font-bold text-amber-400 text-center mb-6 gold-glow">
          Showdown
        </h2>

        <div className="space-y-3">
          {sorted.map((result, index) => {
            if (index >= revealedCount) return null
            const isWinner = index === 0 && revealedCount === sorted.length
            const displayScore = scoreCounts[result.userId] ?? 0

            return (
              <div
                key={result.userId}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  isWinner
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
                style={{
                  animation: `card-flip 0.4s ease-out both${isWinner ? ', gold-burst 1.2s ease-out 0.5s' : ''}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white">
                    {isWinner && <span className="text-amber-400 mr-1">&#127942;</span>}#{index + 1}
                  </span>
                  <span
                    key={displayScore}
                    className="text-amber-400 font-bold text-lg"
                    style={
                      displayScore > 0 ? { animation: 'score-tick 0.15s ease-in-out' } : undefined
                    }
                  >
                    {displayScore} pts
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {result.hand.map((card) => (
                    <TeamCardComponent key={card.teamId} card={card} compact />
                  ))}
                </div>
                {result.cardScores.length > 0 && displayScore === result.totalScore && (
                  <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                    {result.cardScores.map((score) => (
                      <div key={score.teamId} className="flex justify-between">
                        <span>{score.teamId}</span>
                        <span>
                          Base: {score.baseScore} | Goals: +{score.goalBonus} | CS: +
                          {score.cleanSheetBonus} = {score.totalScore}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
