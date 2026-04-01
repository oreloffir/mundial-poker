import { useState, useEffect, useRef } from 'react'
import type { BetAction, TeamCard } from '@wpc/shared'

interface BetPrompt {
  readonly minimumBet: number
  readonly currentBet: number
  readonly pot: number
  readonly chips: number
  readonly allowedActions: readonly string[]
  readonly timeoutMs: number
}

interface BettingControlsProps {
  readonly prompt: BetPrompt
  readonly onAction: (action: BetAction, amount: number) => void
  readonly myHand?: readonly TeamCard[] | null
  readonly myChips?: number
}

const CHIP_DENOMS = [5, 10, 25, 50, 100, 200] as const

export function BettingControls({ prompt, onAction, myHand, myChips }: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(prompt.minimumBet)
  const [timeLeft, setTimeLeft] = useState(prompt.timeoutMs)
  const [pressedChip, setPressedChip] = useState<number | null>(null)
  const [raiseExpanded, setRaiseExpanded] = useState(false)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    setRaiseAmount(prompt.minimumBet)
    setRaiseExpanded(false)
    startTimeRef.current = Date.now()
    setTimeLeft(prompt.timeoutMs)
  }, [prompt.minimumBet, prompt.timeoutMs])

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, prompt.timeoutMs - elapsed)
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(interval)
    }, 100)
    return () => clearInterval(interval)
  }, [prompt.timeoutMs])

  const timePercent = (timeLeft / prompt.timeoutMs) * 100
  const timeSeconds = Math.ceil(timeLeft / 1000)
  const isAllowed = (action: string) => prompt.allowedActions.includes(action)
  const timerColor = timeLeft > 10000 ? 'var(--green-glow)' : timeLeft > 5000 ? 'var(--gold)' : 'var(--red)'
  const isUrgent = timeLeft > 0 && timeLeft <= 5000

  const handleChipPress = (denom: number) => {
    setRaiseAmount((prev) => Math.min(prev + denom, prompt.chips))
    setPressedChip(denom)
    setTimeout(() => setPressedChip(null), 100)
  }

  const presets = [
    { label: 'Min', value: prompt.minimumBet },
    { label: '½ Pot', value: Math.max(prompt.minimumBet, Math.floor(prompt.pot / 2)) },
    { label: 'Pot', value: Math.min(prompt.pot, prompt.chips) },
    { label: 'All In', value: prompt.chips },
  ]

  const raiseDisabled = raiseAmount < prompt.minimumBet
  const raiseIsAllIn = raiseAmount >= prompt.chips

  // Shared building blocks used by both desktop and mobile drawer
  const chipRow = (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {CHIP_DENOMS.map((denom) => {
        const wouldExceed = raiseAmount + denom > prompt.chips
        const isPressed = pressedChip === denom
        return (
          <button
            key={denom}
            onClick={() => handleChipPress(denom)}
            disabled={wouldExceed}
            className="rounded-full font-bold flex items-center justify-center transition-all duration-100"
            style={{
              width: 'var(--chip-btn-size)',
              height: 'var(--chip-btn-size)',
              fontSize: 'var(--chip-btn-font-size)',
              background: 'rgba(5,10,24,0.85)',
              border: wouldExceed ? '1px solid rgba(212,168,67,0.15)' : '1px solid rgba(212,168,67,0.5)',
              color: wouldExceed ? 'rgba(212,168,67,0.25)' : 'var(--gold-bright)',
              boxShadow: wouldExceed ? 'none' : '0 0 8px rgba(212,168,67,0.15)',
              transform: isPressed ? 'scale(0.88)' : undefined,
              cursor: wouldExceed ? 'not-allowed' : 'pointer',
            }}
          >
            {denom}
          </button>
        )
      })}
      <button
        onClick={() => setRaiseAmount(prompt.minimumBet)}
        style={{
          fontSize: 'var(--chip-btn-font-size)',
          color: 'var(--text-muted)',
          padding: '0 6px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        ↩ Clear
      </button>
    </div>
  )

  const presetRow = (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {presets.map(({ label, value }) => {
        const isActive = raiseAmount === value
        return (
          <button
            key={label}
            onClick={() => setRaiseAmount(value)}
            className="rounded-full transition-all duration-150 font-semibold"
            style={{
              padding: 'var(--preset-padding)',
              fontSize: 'var(--preset-font-size)',
              background: isActive ? 'rgba(212,168,67,0.12)' : 'rgba(255,255,255,0.05)',
              border: isActive ? '1px solid rgba(212,168,67,0.5)' : '1px solid rgba(255,255,255,0.1)',
              color: isActive ? 'var(--gold-bright)' : 'var(--text-dim)',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )

  return (
    <>
      {/* ── DESKTOP layout — hidden on mobile landscape via CSS ── */}
      <div className="betting-desktop-only space-y-2">
        {/* Timer bar */}
        <div className="flex items-center gap-3">
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-100"
              style={{
                width: `${timePercent}%`,
                background: timerColor,
                ...(isUrgent ? { animation: 'blink 0.7s ease-in-out infinite' } : {}),
              }}
            />
          </div>
          <span
            className="text-xs font-mono font-bold"
            style={{ color: timerColor, ...(isUrgent ? { animation: 'blink 0.7s ease-in-out infinite' } : {}) }}
          >
            {timeSeconds}s
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {isAllowed('FOLD') && (
            <button
              onClick={() => onAction('FOLD', 0)}
              className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px]"
              style={{ padding: 'var(--btn-padding)', fontSize: 'var(--btn-font-size)', background: 'rgba(231,76,60,0.1)', color: 'var(--red)', border: '1px solid rgba(231,76,60,0.3)' }}
            >
              Fold
            </button>
          )}
          {isAllowed('CHECK') && (
            <button
              onClick={() => onAction('CHECK', 0)}
              className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px]"
              style={{ padding: 'var(--btn-padding)', fontSize: 'var(--btn-font-size)', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Check
            </button>
          )}
          {isAllowed('CALL') && (
            <button
              onClick={() => onAction('CALL', prompt.currentBet)}
              className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px]"
              style={{ padding: 'var(--btn-padding)', fontSize: 'var(--btn-font-size)', background: 'rgba(52,152,219,0.1)', color: 'var(--blue)', border: '1px solid rgba(52,152,219,0.3)' }}
            >
              Call {prompt.currentBet}
            </button>
          )}
          {isAllowed('ALL_IN') && (
            <button
              onClick={() => onAction('ALL_IN', prompt.chips)}
              className="wpc-btn-primary"
              style={{ padding: 'var(--btn-padding)', fontSize: 'var(--btn-font-size)' }}
            >
              All In ({prompt.chips})
            </button>
          )}
        </div>

        {/* Chip stack + raise */}
        {isAllowed('RAISE') && (
          <div className="space-y-1.5 pt-0.5">
            {chipRow}
            {presetRow}
            <div className="flex items-center justify-center gap-3">
              <span style={{ fontSize: 'var(--preset-font-size)', color: 'var(--text-muted)' }}>
                Raise to:{' '}
                <span
                  className="font-outfit font-black"
                  style={{ fontSize: 'var(--btn-font-size)', color: raiseDisabled ? 'var(--red)' : 'var(--gold-bright)' }}
                >
                  {raiseIsAllIn ? 'All In' : raiseAmount}
                </span>
              </span>
              <button
                onClick={() => onAction('RAISE', raiseAmount)}
                disabled={raiseDisabled}
                className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                style={{ padding: 'var(--btn-padding)', fontSize: 'var(--btn-font-size)', background: raiseDisabled ? 'rgba(212,168,67,0.04)' : 'rgba(212,168,67,0.1)', color: 'var(--gold)', border: `1px solid ${raiseDisabled ? 'rgba(212,168,67,0.1)' : 'rgba(212,168,67,0.35)'}` }}
              >
                {raiseIsAllIn ? 'Raise (All In)' : `Raise ${raiseAmount}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE landscape layout — hidden on desktop via CSS ── */}
      <div className="betting-mobile-only flex-col">
        {/* Compact bar — single row, ~44px, always visible */}
        <div className="flex items-center gap-2 px-1" style={{ height: '44px' }}>
          {isAllowed('FOLD') && (
            <button
              onClick={() => onAction('FOLD', 0)}
              className="rounded-lg font-bold flex-shrink-0"
              style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'rgba(231,76,60,0.1)', color: 'var(--red)', border: '1px solid rgba(231,76,60,0.3)' }}
            >
              Fold
            </button>
          )}
          {isAllowed('CHECK') && (
            <button
              onClick={() => onAction('CHECK', 0)}
              className="rounded-lg font-bold flex-shrink-0"
              style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Check
            </button>
          )}
          {isAllowed('CALL') && (
            <button
              onClick={() => onAction('CALL', prompt.currentBet)}
              className="rounded-lg font-bold flex-shrink-0"
              style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'rgba(52,152,219,0.1)', color: 'var(--blue)', border: '1px solid rgba(52,152,219,0.3)' }}
            >
              Call {prompt.currentBet}
            </button>
          )}
          {isAllowed('ALL_IN') && !isAllowed('RAISE') && (
            <button
              onClick={() => onAction('ALL_IN', prompt.chips)}
              className="rounded-lg font-bold flex-shrink-0"
              style={{ padding: '6px 10px', fontSize: '0.75rem', background: 'linear-gradient(135deg, var(--gold), var(--gold-bright))', color: '#000', border: 'none' }}
            >
              All In
            </button>
          )}
          {isAllowed('RAISE') && (
            <button
              onClick={() => setRaiseExpanded((prev) => !prev)}
              className="rounded-lg font-bold flex-shrink-0 transition-all duration-150"
              style={{
                padding: '6px 10px',
                fontSize: '0.75rem',
                background: raiseExpanded ? 'rgba(212,168,67,0.18)' : 'rgba(212,168,67,0.08)',
                color: 'var(--gold)',
                border: `1px solid ${raiseExpanded ? 'rgba(212,168,67,0.5)' : 'rgba(212,168,67,0.25)'}`,
              }}
            >
              Raise {raiseExpanded ? '▼' : '▲'}
            </button>
          )}
          <div className="flex-1" />
          <span
            className="font-mono font-bold flex-shrink-0"
            style={{ fontSize: '0.75rem', color: timerColor, ...(isUrgent ? { animation: 'blink 0.7s ease-in-out infinite' } : {}) }}
          >
            {timeSeconds}s
          </span>
        </div>

        {/* Expandable drawer — slides up on Raise ▲ tap */}
        <div
          className="overflow-hidden"
          style={{
            maxHeight: raiseExpanded ? '320px' : '0px',
            opacity: raiseExpanded ? 1 : 0,
            transition: 'max-height 200ms ease-out, opacity 150ms ease-out',
          }}
        >
          <div
            className="space-y-2 pb-2 px-1"
            style={{ paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Hand preview — cards + chip count */}
            {myHand && myHand.length > 0 && (
              <div className="flex items-center gap-2 justify-center">
                {myHand.map((card) => (
                  <div
                    key={card.teamId}
                    className="rounded-lg flex flex-col items-center justify-center gap-0.5 overflow-hidden"
                    style={{
                      width: '36px',
                      height: '50px',
                      background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
                      border: '1px solid var(--border)',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>{card.team.flagUrl}</span>
                    <span style={{ fontSize: '6px', fontWeight: 'bold', color: 'white', lineHeight: 1, letterSpacing: '0.03em' }}>
                      {card.team.code}
                    </span>
                  </div>
                ))}
                {myChips !== undefined && (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-full ml-1"
                    style={{ background: 'rgba(5,10,24,0.85)', border: '1px solid rgba(212,168,67,0.25)' }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, var(--gold-bright), var(--gold-dim))', border: '1px solid var(--gold-bright)' }}
                    />
                    <span className="font-outfit font-black text-xs" style={{ color: 'var(--gold-bright)' }}>
                      {myChips}
                    </span>
                  </div>
                )}
              </div>
            )}

            {chipRow}
            {presetRow}

            {/* Confirm row */}
            <div className="flex items-center gap-2 justify-center flex-wrap">
              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                Raise to:{' '}
                <span
                  className="font-outfit font-black"
                  style={{ fontSize: '0.75rem', color: raiseDisabled ? 'var(--red)' : 'var(--gold-bright)' }}
                >
                  {raiseIsAllIn ? 'All In' : raiseAmount}
                </span>
              </span>
              <button
                onClick={() => { setRaiseExpanded(false); onAction('RAISE', raiseAmount) }}
                disabled={raiseDisabled}
                className="rounded-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.75rem',
                  background: raiseDisabled ? 'rgba(212,168,67,0.04)' : 'rgba(212,168,67,0.12)',
                  color: 'var(--gold)',
                  border: `1px solid ${raiseDisabled ? 'rgba(212,168,67,0.1)' : 'rgba(212,168,67,0.4)'}`,
                }}
              >
                {raiseIsAllIn ? 'All In' : `Raise ${raiseAmount}`}
              </button>
              <button
                onClick={() => { setRaiseExpanded(false); setRaiseAmount(prompt.minimumBet) }}
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px' }}
              >
                ✕ Cancel
              </button>
              <span
                className="font-mono font-bold flex-shrink-0"
                style={{ fontSize: '0.75rem', color: timerColor, ...(isUrgent ? { animation: 'blink 0.7s ease-in-out infinite' } : {}) }}
              >
                {timeSeconds}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
