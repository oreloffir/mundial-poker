import type { TeamCard } from '@wpc/shared'
import { PokerChip } from '@/components/shared/PokerChip'
import { getAvatarColor } from '@/utils/avatarColor'
import type { PlayerScoredData, CardScoreData } from '@/stores/gameStore'
import { useGameStore } from '@/stores/gameStore'

interface PlayerCardDockProps {
  readonly cards: readonly TeamCard[] | null
  readonly chips: number
  readonly isInRound: boolean
  readonly scoreResult: PlayerScoredData | null
  readonly isCurrent: boolean
  readonly username: string
  readonly isActive: boolean
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
  cardIndex,
  isFixtureRevealed,
  opponentCode,
}: {
  readonly card: TeamCard
  readonly scoreCard?: CardScoreData
  readonly cardIndex: number
  readonly isFixtureRevealed: boolean
  readonly opponentCode: string | undefined
}) {
  const res = scoreCard ? getResult(scoreCard) : null

  const tether =
    cardIndex === 0
      ? {
          color: 'var(--tether-a)',
          pulseAnim: 'tether-pulse-a 2.4s ease-in-out infinite',
          flashAnim: 'card-sync-flash-a 0.5s ease-out both',
        }
      : {
          color: 'var(--tether-b)',
          pulseAnim: 'tether-pulse-b 2.4s ease-in-out infinite',
          flashAnim: 'card-sync-flash-b 0.5s ease-out both',
        }

  const accentColor = res ? RESULT_COLOR[res] : tether.color

  return (
    <div
      style={{
        width: 38,
        height: 54,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRadius: 8,
        overflow: 'hidden',
        flexShrink: 0,
        borderLeft: `3px solid ${accentColor}`,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(160deg, rgba(13,20,36,0.95) 0%, rgba(5,10,24,0.92) 100%)',
        boxShadow: res ? `0 0 8px ${RESULT_COLOR[res]}44` : undefined,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        animation: res ? undefined : isFixtureRevealed ? tether.flashAnim : tether.pulseAnim,
      }}
    >
      {/* Tether / result header strip */}
      <div
        style={{
          width: '100%',
          height: 8,
          background: `linear-gradient(90deg, ${accentColor}66, ${accentColor}22)`,
          flexShrink: 0,
          transition: 'background 0.3s ease',
        }}
      />

      {/* Flag */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: 4,
        }}
      >
        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{card.team.flagUrl}</span>
      </div>

      {/* Team code */}
      <span
        style={{
          fontSize: 7,
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          color: accentColor,
          lineHeight: 1,
          letterSpacing: '0.06em',
          marginBottom: 3,
          transition: 'color 0.3s ease',
        }}
      >
        {card.team.code}
      </span>

      {/* Perforated divider */}
      <div
        style={{
          width: '80%',
          borderBottom: '1px dashed rgba(255,255,255,0.15)',
          marginBottom: 3,
          flexShrink: 0,
        }}
      />

      {/* Opponent or result stamp */}
      {!res ? (
        <div
          style={{
            fontSize: 6,
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
            color: 'var(--text-muted)',
            lineHeight: 1,
            paddingBottom: 4,
          }}
        >
          {opponentCode ? `vs ${opponentCode}` : '—'}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBottom: 4,
            gap: 1,
          }}
        >
          <span
            style={{
              fontSize: 7,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 800,
              color: RESULT_COLOR[res],
              lineHeight: 1,
              letterSpacing: '0.04em',
            }}
          >
            {res === 'W' ? 'WIN' : res === 'D' ? 'DRAW' : 'LOSS'}
          </span>
          {scoreCard && (
            <span
              style={{
                fontSize: 6,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 700,
                color: RESULT_COLOR[res],
                lineHeight: 1,
                opacity: 0.8,
              }}
            >
              +{scoreCard.totalScore}
            </span>
          )}
        </div>
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
  username,
  isActive,
}: PlayerCardDockProps) {
  const avatarColor = getAvatarColor(username)
  const fixtureResults = useGameStore((s) => s.fixtureResults)
  const fixtures = useGameStore((s) => s.fixtures)
  const isWinner = scoreResult?.isWinner ?? false

  const borderColor = isWinner
    ? 'rgba(212,168,67,0.6)'
    : isActive
      ? 'rgba(46,204,113,0.35)'
      : isCurrent
        ? 'rgba(212,168,67,0.35)'
        : 'rgba(212,168,67,0.18)'

  const boxShadow = isWinner
    ? '0 0 20px rgba(212,168,67,0.3), 0 4px 20px rgba(0,0,0,0.5)'
    : isActive
      ? '0 0 12px rgba(46,204,113,0.15), 0 4px 16px rgba(0,0,0,0.5)'
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
      {/* Avatar — replaces seat 0 on the pitch (J34) */}
      <div className="flex flex-col items-center gap-0.5" style={{ flexShrink: 0 }}>
        <div
          className="rounded-full flex items-center justify-center font-black font-outfit"
          style={{
            width: 32,
            height: 32,
            background: `linear-gradient(145deg, ${avatarColor}33, ${avatarColor}11)`,
            border: isActive
              ? '2px solid var(--green-glow)'
              : isWinner
                ? '2px solid var(--gold)'
                : `2px solid ${avatarColor}44`,
            boxShadow: isActive
              ? '0 0 8px rgba(46,204,113,0.3)'
              : isWinner
                ? '0 0 12px rgba(212,168,67,0.3)'
                : '0 2px 6px rgba(0,0,0,0.4)',
            color: avatarColor,
            fontSize: 11,
          }}
        >
          {username.substring(0, 2).toUpperCase()}
        </div>
        {/* YOU anchor label */}
        <span
          className="font-cinzel font-bold uppercase tracking-widest"
          style={{ fontSize: 6, color: 'var(--gold)', opacity: 0.55 }}
        >
          YOU
        </span>
      </div>

      {/* Vertical divider */}
      <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

      {/* Team card tiles — only during a round */}
      {isInRound && cards && cards.length > 0 && (
        <div className="flex gap-1.5" style={{ animation: 'card-deal 0.3s ease-out both' }}>
          {cards.map((card, cardIndex) => {
            const scoreCard = scoreResult?.cardScores.find((cs) => cs.teamId === card.teamId)
            const isFixtureRevealed = fixtureResults.some((r) => r.fixtureId === card.fixtureId)
            const fixture = fixtures.find((fx) => fx.id === card.fixtureId)
            const opponentCode =
              fixture?.homeTeamId === card.teamId
                ? fixture.awayTeam.code
                : fixture?.awayTeam.code
                    ? fixture.homeTeam.code
                    : undefined
            return (
              <DockCard
                key={card.teamId}
                card={card}
                scoreCard={scoreCard}
                cardIndex={cardIndex}
                isFixtureRevealed={isFixtureRevealed}
                opponentCode={opponentCode}
              />
            )
          })}
        </div>
      )}

      {/* Vertical divider before chip count */}
      {isInRound && cards && cards.length > 0 && (
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
      )}

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
            style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}
          />
          <div className="flex flex-col items-center gap-0.5" style={{ minWidth: 44 }}>
            <div className="flex items-baseline gap-1">
              {isWinner && <span style={{ fontSize: 10 }}>🏆</span>}
              <span
                className="font-outfit font-black leading-none"
                style={{
                  fontSize: 15,
                  color: isWinner ? 'var(--gold-bright)' : 'var(--text)',
                  textShadow: isWinner ? '0 0 10px rgba(212,168,67,0.5)' : undefined,
                }}
              >
                {scoreResult.totalScore}
              </span>
              <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 600 }}>pts</span>
            </div>
            {/* Per-card compact breakdown */}
            <div className="flex items-center gap-1">
              {scoreResult.cardScores.map((card, i) => {
                const res = getResult(card)
                return (
                  <span key={card.teamId} className="flex items-center" style={{ fontSize: 8 }}>
                    {i > 0 && (
                      <span style={{ color: 'rgba(255,255,255,0.15)', marginRight: 3 }}>|</span>
                    )}
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                      {card.team.code}
                    </span>
                    <span style={{ color: RESULT_COLOR[res], fontWeight: 800, marginLeft: 2 }}>
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
