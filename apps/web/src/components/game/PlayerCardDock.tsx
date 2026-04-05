import type { TeamCard } from '@wpc/shared'
import { PokerChip } from '@/components/shared/PokerChip'
import type { PlayerScoredData, CardScoreData } from '@/stores/gameStore'

interface PlayerCardDockProps {
  readonly cards: readonly TeamCard[] | null
  readonly chips: number
  readonly isInRound: boolean
  readonly scoreResult: PlayerScoredData | null
  readonly isCurrent: boolean
}

function getResult(card: CardScoreData): 'W' | 'D' | 'L' {
  const myGoals = card.fixture.side === 'home' ? card.fixture.homeGoals : card.fixture.awayGoals
  const oppGoals = card.fixture.side === 'home' ? card.fixture.awayGoals : card.fixture.homeGoals
  if (myGoals > oppGoals) return 'W'
  if (myGoals === oppGoals) return 'D'
  return 'L'
}

const RESULT_COLOR: Record<string, string> = {
  W: 'var(--green-glow)',
  D: 'var(--gold)',
  L: 'var(--red)',
}

function DockCard({
  card,
  scoreCard,
}: {
  readonly card: TeamCard
  readonly scoreCard?: CardScoreData
}) {
  const res = scoreCard ? getResult(scoreCard) : null
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg overflow-hidden relative"
      style={{
        width: 30,
        height: 42,
        background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
        border: res
          ? `1.5px solid ${RESULT_COLOR[res]}`
          : '1.5px solid rgba(212,168,67,0.3)',
        boxShadow: res ? `0 0 8px ${RESULT_COLOR[res]}44` : '0 2px 8px rgba(0,0,0,0.5)',
        flexShrink: 0,
        gap: 2,
        transition: 'border-color 0.3s ease',
      }}
    >
      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{card.team.flagUrl}</span>
      <span
        style={{
          fontSize: 7,
          fontWeight: 700,
          color: res ? RESULT_COLOR[res] : 'white',
          lineHeight: 1,
          letterSpacing: '0.05em',
          transition: 'color 0.3s ease',
        }}
      >
        {card.team.code}
      </span>
      {res && (
        <span
          style={{
            fontSize: 7,
            fontWeight: 800,
            color: RESULT_COLOR[res],
            lineHeight: 1,
          }}
        >
          {res}
        </span>
      )}
    </div>
  )
}

export function PlayerCardDock({
  cards,
  chips,
  isInRound,
  scoreResult,
  isCurrent,
}: PlayerCardDockProps) {
  if (!isInRound && !scoreResult) return null
  if (!cards && !scoreResult) return null

  const borderColor = scoreResult?.isWinner
    ? 'rgba(212,168,67,0.6)'
    : isCurrent
      ? 'rgba(212,168,67,0.35)'
      : 'rgba(212,168,67,0.18)'

  const boxShadow = scoreResult?.isWinner
    ? '0 0 20px rgba(212,168,67,0.3), 0 4px 20px rgba(0,0,0,0.5)'
    : '0 4px 20px rgba(0,0,0,0.5)'

  return (
    <div
      data-testid="player-card-dock"
      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl"
      style={{
        background: 'rgba(5,10,24,0.78)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${borderColor}`,
        boxShadow,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        animation: isCurrent && scoreResult ? 'score-pop 0.35s ease-out both' : undefined,
      }}
    >
      {/* Team card tiles */}
      {cards && cards.length > 0 && (
        <div
          className="flex gap-1.5"
          style={{ animation: 'card-deal 0.3s ease-out both' }}
        >
          {cards.map((card) => {
            const scoreCard = scoreResult?.cardScores.find((cs) => cs.teamId === card.teamId)
            return <DockCard key={card.teamId} card={card} scoreCard={scoreCard} />
          })}
        </div>
      )}

      {/* Vertical divider */}
      <div
        style={{
          width: 1,
          height: 32,
          background: 'rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      />

      {/* Chip count */}
      <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
        <PokerChip
          size={14}
          style={{ flexShrink: 0, filter: 'drop-shadow(0 0 4px rgba(212,168,67,0.4))' }}
        />
        <span
          className="font-outfit font-black text-xs leading-none"
          style={{ color: 'var(--gold-bright)', textShadow: '0 0 8px rgba(212,168,67,0.3)' }}
        >
          {chips}
        </span>
      </div>

      {/* Score section — visible during showdown */}
      {scoreResult && (
        <>
          <div
            style={{
              width: 1,
              height: 32,
              background: 'rgba(255,255,255,0.1)',
              flexShrink: 0,
            }}
          />
          <div className="flex flex-col items-center gap-0.5" style={{ minWidth: 44 }}>
            <div className="flex items-baseline gap-1">
              {scoreResult.isWinner && <span style={{ fontSize: 10 }}>🏆</span>}
              <span
                className="font-outfit font-black leading-none"
                style={{
                  fontSize: 15,
                  color: scoreResult.isWinner ? 'var(--gold-bright)' : 'var(--text)',
                  textShadow: scoreResult.isWinner
                    ? '0 0 10px rgba(212,168,67,0.5)'
                    : undefined,
                }}
              >
                {scoreResult.totalScore}
              </span>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600 }}>
                pts
              </span>
            </div>
            {/* Per-card compact breakdown */}
            <div className="flex items-center gap-1">
              {scoreResult.cardScores.map((card, i) => {
                const res = getResult(card)
                return (
                  <span
                    key={card.teamId}
                    className="flex items-center"
                    style={{ fontSize: 8 }}
                  >
                    {i > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.15)', marginRight: 3 }}>
                        |
                      </span>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                      {card.team.code}
                    </span>
                    <span
                      style={{ color: RESULT_COLOR[res], fontWeight: 800, marginLeft: 2 }}
                    >
                      {res}
                    </span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 1 }}>
                      +{card.totalScore}
                    </span>
                  </span>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
