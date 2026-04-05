import { useState, useEffect, useRef } from 'react'
import type { BetAction } from '@wpc/shared'
import { PokerChip } from '@/components/shared/PokerChip'

interface BetPrompt {
  readonly minimumBet: number
  readonly currentBet: number
  readonly pot: number
  readonly chips: number
  readonly allowedActions: readonly string[]
  readonly timeoutMs: number
  readonly promptedAt?: number
}

interface BettingControlsProps {
  readonly prompt: BetPrompt
  readonly onAction: (action: BetAction, amount: number) => void
}

// Chip denominations shown in the raise expansion panel (high → low)
const CHIP_DENOMS = [200, 100, 50, 25, 10, 5] as const

export function BettingControls({ prompt, onAction }: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(prompt.minimumBet)
  const [timeLeft, setTimeLeft] = useState(prompt.timeoutMs)
  const [raiseExpanded, setRaiseExpanded] = useState(false)
  const [pressedChip, setPressedChip] = useState<number | null>(null)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    setRaiseAmount(prompt.minimumBet)
    setRaiseExpanded(false)
    startTimeRef.current = prompt.promptedAt ?? Date.now()
    setTimeLeft(prompt.timeoutMs)
  }, [prompt.minimumBet, prompt.timeoutMs, prompt.promptedAt])

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, prompt.timeoutMs - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 100)
    return () => clearInterval(interval)
  }, [prompt.timeoutMs])

  const timeSeconds = Math.ceil(timeLeft / 1000)
  const isUrgent = timeLeft > 0 && timeLeft <= 5000
  const timerColor =
    timeLeft > 10000 ? 'var(--green-glow)' : timeLeft > 5000 ? 'var(--gold)' : 'var(--red)'
  const isAllowed = (action: string) => prompt.allowedActions.includes(action)
  const raiseIsAllIn = raiseAmount >= prompt.chips

  const handleChipPress = (denom: number) => {
    setRaiseAmount((prev) => Math.min(prev + denom, prompt.chips))
    setPressedChip(denom)
    setTimeout(() => setPressedChip(null), 100)
  }

  const handleRaiseClick = () => {
    if (!raiseExpanded) {
      setRaiseExpanded(true)
      return
    }
    setRaiseExpanded(false)
    onAction(raiseIsAllIn ? 'ALL_IN' : 'RAISE', raiseIsAllIn ? prompt.chips : raiseAmount)
  }

  const handleCancelRaise = () => {
    setRaiseExpanded(false)
    setRaiseAmount(prompt.minimumBet)
  }

  const btnSize = 'var(--action-btn-size)'

  const pillBtn = {
    height: 36,
    minWidth: 52,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 999,
    border: 'none',
    background: 'none',
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    fontSize: 11,
    cursor: 'pointer',
    transition: 'background 0.12s ease',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    flexShrink: 0,
  }

  // Thin vertical divider between pill segments
  const divider = (
    <div
      style={{
        width: 1,
        height: 20,
        background: 'rgba(255,255,255,0.1)',
        alignSelf: 'center',
        flexShrink: 0,
      }}
    />
  )

  const hasFold = isAllowed('FOLD')
  const hasCheck = isAllowed('CHECK')
  const hasCall = isAllowed('CALL')
  const hasRaise = isAllowed('RAISE')

  return (
    <div
      data-testid="betting-controls"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}
    >
      {/* Timer */}
      <span
        data-testid="bet-timer"
        className="font-mono font-bold tabular-nums"
        style={{
          fontSize: 11,
          color: timerColor,
          ...(isUrgent ? { animation: 'blink 0.7s ease-in-out infinite' } : {}),
        }}
      >
        {timeSeconds}s
      </span>

      {/* Pill bar */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(5,10,24,0.88)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 999,
          padding: '2px 2px',
          gap: 1,
          alignItems: 'center',
        }}
      >
        {/* FOLD */}
        {hasFold && (
          <button
            onClick={() => onAction('FOLD', 0)}
            style={{
              ...pillBtn,
              background: 'rgba(231,76,60,0.15)',
              color: 'var(--red)',
            }}
          >
            FOLD
          </button>
        )}

        {/* Divider after FOLD */}
        {hasFold && (hasCheck || hasCall || hasRaise) && divider}

        {/* CHECK */}
        {hasCheck && (
          <button
            onClick={() => onAction('CHECK', 0)}
            style={{
              ...pillBtn,
              background: 'rgba(52,152,219,0.12)',
              color: 'var(--blue)',
            }}
          >
            CHECK
          </button>
        )}

        {/* Divider after CHECK */}
        {hasCheck && (hasCall || hasRaise) && divider}

        {/* CALL */}
        {hasCall && (
          <button
            onClick={() => onAction('CALL', prompt.currentBet)}
            style={{
              ...pillBtn,
              background: 'rgba(52,152,219,0.12)',
              color: 'var(--blue)',
            }}
          >
            <span style={{ fontSize: 8, fontWeight: 600, opacity: 0.7 }}>CALL</span>
            <span>{prompt.currentBet}</span>
          </button>
        )}

        {/* Divider after CALL */}
        {hasCall && hasRaise && divider}

        {/* RAISE — relative container so chip panel pops above pill bar */}
        {hasRaise && (
          <div style={{ position: 'relative' }}>
            {/* Chip denomination panel — expands above the pill bar */}
            {raiseExpanded && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 6px)',
                  right: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(5,10,24,0.9)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(212,168,67,0.25)',
                  borderRadius: 10,
                  padding: '4px 6px 6px',
                }}
              >
                {/* Cancel */}
                <button
                  onClick={handleCancelRaise}
                  aria-label="Cancel raise"
                  style={{
                    alignSelf: 'flex-end',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 10,
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: '0 2px 3px',
                  }}
                >
                  ✕
                </button>

                {/* Chips high → low */}
                {CHIP_DENOMS.map((denom) => {
                  const wouldExceed = raiseAmount + denom > prompt.chips
                  const isPressed = pressedChip === denom
                  return (
                    <button
                      key={denom}
                      onClick={() => handleChipPress(denom)}
                      disabled={wouldExceed}
                      data-testid={`chip-denomination-${denom}`}
                      style={{
                        position: 'relative',
                        width: btnSize,
                        height: btnSize,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: wouldExceed ? 'not-allowed' : 'pointer',
                        opacity: wouldExceed ? 0.28 : 1,
                        transform: isPressed ? 'scale(0.88)' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <PokerChip
                        size={36}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          pointerEvents: 'none',
                        }}
                      />
                      <span
                        className="font-bold"
                        style={{
                          position: 'relative',
                          fontSize: 'var(--chip-btn-font-size)',
                          color: wouldExceed ? 'rgba(212,168,67,0.4)' : '#f0d060',
                          textShadow: wouldExceed ? 'none' : '0 1px 3px rgba(0,0,0,0.9)',
                          fontFamily: "'Outfit', sans-serif",
                        }}
                      >
                        {denom}
                      </span>
                    </button>
                  )
                })}

                {/* Reset to minimum */}
                <button
                  onClick={() => setRaiseAmount(prompt.minimumBet)}
                  aria-label="Reset raise amount"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 14,
                    cursor: 'pointer',
                    padding: '1px 4px',
                  }}
                >
                  ↩
                </button>
              </div>
            )}

            {/* RAISE segment of pill */}
            <button
              onClick={handleRaiseClick}
              style={{
                ...pillBtn,
                background: raiseExpanded ? 'rgba(212,168,67,0.22)' : 'rgba(212,168,67,0.12)',
                color: 'var(--gold)',
                borderRadius: 999,
                boxShadow: raiseExpanded ? '0 0 14px rgba(212,168,67,0.2)' : 'none',
              }}
            >
              {raiseExpanded ? (
                <>
                  <span style={{ fontSize: 7 }}>{raiseIsAllIn ? 'ALL IN' : 'RAISE'}</span>
                  <span style={{ fontSize: 9, color: 'var(--gold-bright)' }}>
                    {raiseIsAllIn ? prompt.chips : raiseAmount}
                  </span>
                </>
              ) : (
                'RAISE'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
