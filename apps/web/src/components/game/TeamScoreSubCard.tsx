import { useEffect, useState } from 'react'
import type { CardScoreData } from '@wpc/shared'

export type { CardScoreData }

interface TeamScoreSubCardProps {
  readonly card: CardScoreData
  /** Stagger delay index — each row appears at index * 150ms after mount */
  readonly staggerBase: number
  /** Whether to start the count-up animation */
  readonly animate: boolean
}

function useCountUpLocal(target: number, duration: number, animate: boolean): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!animate || target === 0) {
      setCount(target)
      return
    }
    setCount(0)
    const steps = Math.min(target, 24)
    const stepMs = duration / steps
    let step = 0
    const id = setInterval(() => {
      step++
      if (step >= steps) {
        setCount(target)
        clearInterval(id)
      } else {
        setCount(Math.round((target / steps) * step))
      }
    }, stepMs)
    return () => clearInterval(id)
  }, [target, duration, animate])
  return count
}

function ScoreRow({
  label,
  value,
  color,
  delayMs,
  testId,
}: {
  readonly label: string
  readonly value: string
  readonly color: string
  readonly delayMs: number
  readonly testId?: string
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-center justify-between"
      style={{
        animation: `fade-in-up-sm 0.2s ease-out ${delayMs}ms both`,
        fontSize: 11,
      }}
    >
      <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>{label}</span>
      <span className="font-outfit" style={{ color, fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}

export function TeamScoreSubCard({ card, staggerBase, animate }: TeamScoreSubCardProps) {
  const { fixture, team } = card
  const isHome = fixture.side === 'home'
  const teamGoals = isHome ? fixture.homeGoals : fixture.awayGoals
  const oppGoals = isHome ? fixture.awayGoals : fixture.homeGoals
  const resultType = teamGoals > oppGoals ? 'win' : teamGoals === oppGoals ? 'draw' : 'loss'

  const resultColor =
    resultType === 'win'
      ? 'var(--green-glow)'
      : resultType === 'draw'
        ? 'var(--gold)'
        : 'var(--text-muted)'

  const scoreColor = (goals: number, isWinSide: boolean) =>
    isWinSide ? 'var(--green-glow)' : resultType === 'draw' ? 'var(--gold)' : 'var(--text-muted)'

  const subtotal = useCountUpLocal(card.totalScore, 500, animate)

  const baseLabel = resultType === 'win' ? 'Win' : resultType === 'draw' ? 'Draw' : 'Loss'
  const baseDelay = staggerBase
  const goalBonusDelay = staggerBase + 150
  const cleanSheetDelay = staggerBase + (card.goalBonus > 0 ? 300 : 150)
  const penaltyDelay =
    staggerBase + (card.goalBonus > 0 ? 300 : 150) + (card.cleanSheetBonus > 0 ? 150 : 0)

  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl"
      style={{
        background: 'rgba(5,10,24,0.5)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: 12,
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Match info */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{team.flagUrl || '🏳️'}</span>
          <span
            className="font-outfit truncate"
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}
          >
            {team.name}
          </span>
        </div>
        {fixture.opponentTeam && (
          <span
            className="font-outfit"
            style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}
          >
            vs {fixture.opponentTeam.flagUrl} {fixture.opponentTeam.name}
          </span>
        )}
        <div className="flex items-center gap-1 font-outfit font-black" style={{ fontSize: 15 }}>
          <span style={{ color: scoreColor(teamGoals, teamGoals > oppGoals) }}>{teamGoals}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>–</span>
          <span style={{ color: scoreColor(oppGoals, oppGoals > teamGoals) }}>{oppGoals}</span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

      {/* Score rows */}
      <div className="flex flex-col gap-1">
        <ScoreRow
          label={baseLabel}
          value={`+${card.baseScore}`}
          color={resultColor}
          delayMs={baseDelay}
          testId="score-base-points"
        />
        {card.goalBonus > 0 && (
          <ScoreRow
            label="High Scorer"
            value={`+${card.goalBonus}`}
            color="var(--green-glow)"
            delayMs={goalBonusDelay}
          />
        )}
        {card.cleanSheetBonus > 0 && (
          <ScoreRow
            label="Clean Sheet"
            value={`+${card.cleanSheetBonus}`}
            color="var(--green-glow)"
            delayMs={cleanSheetDelay}
          />
        )}
        {card.penaltyModifier !== 0 && (
          <ScoreRow
            label="Penalties"
            value={
              card.penaltyModifier > 0 ? `+${card.penaltyModifier}` : String(card.penaltyModifier)
            }
            color={card.penaltyModifier > 0 ? 'var(--green-glow)' : 'var(--red)'}
            delayMs={penaltyDelay}
          />
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

      {/* Sub-total */}
      <div className="flex items-center gap-1">
        <span style={{ color: 'var(--gold)', fontSize: 11 }}>★</span>
        <span
          className="font-outfit font-black"
          style={{
            fontSize: 13,
            color: 'var(--gold)',
            ...(animate ? { animation: 'score-tick 0.3s ease-out' } : {}),
          }}
        >
          {subtotal} pts
        </span>
      </div>
    </div>
  )
}
