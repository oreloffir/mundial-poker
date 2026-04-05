import type { PlayerScoredData, CardScoreData } from '@/stores/gameStore'

// Popup direction per seat position — extends INWARD toward the pitch center
// so it never clips outside the viewport.
const SEAT_DIRECTION = [
  // Seat 0 (bottom-center): extends UP
  { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 4 },
  // Seat 1 (left): extends RIGHT into pitch
  { top: '50%', left: '100%', transform: 'translateY(-50%)', marginLeft: 6 },
  // Seat 2 (top-left): extends DOWN into pitch
  { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 },
  // Seat 3 (top-right): extends DOWN into pitch
  { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4 },
  // Seat 4 (right): extends LEFT into pitch
  { top: '50%', right: '100%', transform: 'translateY(-50%)', marginRight: 6 },
] as const

function Caret({ seatIndex }: { readonly seatIndex: number }) {
  const shared = { position: 'absolute' as const, width: 0, height: 0 }
  const border4 = '4px solid transparent'
  const bg = 'rgba(5,10,24,0.92)'

  // Caret points TOWARD the seat (indicates which seat owns this popup)
  if (seatIndex === 0) {
    // Popup is above seat → caret points DOWN at the bottom of popup
    return (
      <div
        style={{
          ...shared,
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: border4,
          borderRight: border4,
          borderTop: `4px solid ${bg}`,
        }}
      />
    )
  }
  if (seatIndex === 1) {
    // Popup is to the right → caret points LEFT at the left side of popup
    return (
      <div
        style={{
          ...shared,
          left: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          borderTop: border4,
          borderBottom: border4,
          borderRight: `4px solid ${bg}`,
        }}
      />
    )
  }
  if (seatIndex === 2 || seatIndex === 3) {
    // Popup is below seat → caret points UP at the top of popup
    return (
      <div
        style={{
          ...shared,
          top: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          borderLeft: border4,
          borderRight: border4,
          borderBottom: `4px solid ${bg}`,
        }}
      />
    )
  }
  // Seat 4: popup is to the left → caret points RIGHT at the right side of popup
  return (
    <div
      style={{
        ...shared,
        right: -4,
        top: '50%',
        transform: 'translateY(-50%)',
        borderTop: border4,
        borderBottom: border4,
        borderLeft: `4px solid ${bg}`,
      }}
    />
  )
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

interface SeatScorePopupProps {
  readonly result: PlayerScoredData
  readonly isCurrent: boolean
  readonly seatIndex: number
}

export function SeatScorePopup({ result, isCurrent, seatIndex }: SeatScorePopupProps) {
  const positionStyle = SEAT_DIRECTION[seatIndex] ?? SEAT_DIRECTION[0]
  const isWinner = result.isWinner

  return (
    <div
      className="absolute pointer-events-none seat-score-popup"
      style={{
        ...positionStyle,
        zIndex: 30,
        animation: isCurrent ? 'score-pop 0.35s ease-out both' : undefined,
        opacity: isCurrent ? 1 : 0.75,
      }}
    >
      <div
        className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl whitespace-nowrap"
        style={{
          background: isWinner ? 'rgba(212,168,67,0.18)' : 'rgba(5,10,24,0.92)',
          border: isWinner
            ? '1px solid var(--gold)'
            : isCurrent
              ? '1px solid var(--gold)'
              : '1px solid rgba(212,168,67,0.2)',
          boxShadow: isWinner
            ? '0 0 18px rgba(212,168,67,0.5), 0 4px 16px rgba(0,0,0,0.6)'
            : isCurrent
              ? '0 0 12px rgba(212,168,67,0.3), 0 4px 12px rgba(0,0,0,0.5)'
              : '0 4px 12px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Caret seatIndex={seatIndex} />

        {/* Total score */}
        <div className="flex items-baseline gap-1">
          {isWinner && <span style={{ fontSize: 11 }}>🏆</span>}
          <span
            className="font-outfit font-black leading-none"
            style={{
              fontSize: 16,
              color: isWinner ? 'var(--gold-bright)' : 'var(--text)',
              textShadow: isWinner ? '0 0 10px rgba(212,168,67,0.5)' : undefined,
            }}
          >
            {result.totalScore}
          </span>
          <span
            style={{
              fontSize: 8,
              color: isWinner ? 'var(--gold)' : 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            pts
          </span>
        </div>

        {/* Compact per-card breakdown: "KOR W +5 | AUS L +0" */}
        <div className="flex items-center gap-1.5">
          {result.cardScores.map((card, i) => {
            const res = getResult(card)
            return (
              <span key={card.teamId} className="flex items-center" style={{ fontSize: 9 }}>
                {i > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.15)', marginRight: 4 }}>|</span>
                )}
                <span
                  style={{
                    color: isWinner ? 'var(--gold-dim)' : 'rgba(255,255,255,0.6)',
                    fontWeight: 700,
                  }}
                >
                  {card.team.code}
                </span>
                <span style={{ color: RESULT_COLOR[res], fontWeight: 700, marginLeft: 2 }}>
                  {res}
                </span>
                <span
                  style={{ color: isWinner ? 'var(--gold)' : 'var(--text-muted)', marginLeft: 1 }}
                >
                  +{card.totalScore}
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
