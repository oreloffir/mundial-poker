import { useState, useEffect, useRef } from 'react'
import type { BetAction, TeamCard } from '@wpc/shared'
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

  const timePercent = (timeLeft / prompt.timeoutMs) * 100
  const timeSeconds = Math.ceil(timeLeft / 1000)
  const isAllowed = (action: string) => prompt.allowedActions.includes(action)
  const timerColor = timeLeft > 10000 ? 'var(--green-glow)' : timeLeft > 5000 ? 'var(--gold)' : 'var(--red)'
  const isUrgent = timeLeft > 0 && timeLeft <= 5000

  const raiseDisabled = raiseAmount < prompt.minimumBet
  const raiseIsAllIn = raiseAmount >= prompt.chips

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

  // ─── Sub-components ──────────────────────────────────────────────────────

  const handPreview = myHand && myHand.length > 0 && (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {myHand.map((card) => (
        <div
          key={card.teamId}
          className="rounded-md flex flex-col items-center justify-center gap-0.5 overflow-hidden flex-shrink-0"
          style={{
            width: 28,
            height: 38,
            background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
            border: '1px solid rgba(212,168,67,0.3)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontSize: '0.8rem', lineHeight: 1 }}>{card.team.flagUrl}</span>
          <span style={{ fontSize: '5px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', lineHeight: 1, letterSpacing: '0.02em' }}>
            {card.team.code}
          </span>
        </div>
      ))}
    </div>
  )

  const chipBadge = myChips !== undefined && (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-full flex-shrink-0"
      style={{
        background: 'rgba(5,10,24,0.85)',
        border: '1px solid rgba(212,168,67,0.25)',
      }}
    >
      <PokerChip size={12} style={{ flexShrink: 0 }} />
      <span className="font-outfit font-black text-xs" style={{ color: 'var(--gold-bright)' }}>
        {myChips}
      </span>
    </div>
  )

  const timerBar = (
    <div data-testid="bet-timer" className="flex items-center gap-2 flex-1 min-w-0">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
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
        className="text-xs font-mono font-bold flex-shrink-0 tabular-nums"
        style={{ color: timerColor, minWidth: '2.5ch', ...(isUrgent ? { animation: 'blink 0.7s ease-in-out infinite' } : {}) }}
      >
        {timeSeconds}s
      </span>
    </div>
  )

  const chipRow = (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {CHIP_DENOMS.map((denom) => {
        const wouldExceed = raiseAmount + denom > prompt.chips
        const isPressed = pressedChip === denom
        return (
          <button
            key={denom}
            data-testid={`chip-denomination-${denom}`}
            onClick={() => handleChipPress(denom)}
            disabled={wouldExceed}
            className="relative flex items-center justify-center transition-all duration-100"
            style={{
              width: 'var(--chip-btn-size)',
              height: 'var(--chip-btn-size)',
              background: 'none',
              border: 'none',
              padding: 0,
              opacity: wouldExceed ? 0.28 : 1,
              transform: isPressed ? 'scale(0.88) translateY(1px)' : undefined,
              cursor: wouldExceed ? 'not-allowed' : 'pointer',
              filter: wouldExceed ? 'none' : isPressed ? 'drop-shadow(0 0 6px rgba(212,168,67,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
            }}
          >
            <PokerChip size={36} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
            <span
              className="relative font-bold"
              style={{
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
      <button
        onClick={() => setRaiseAmount(prompt.minimumBet)}
        style={{ fontSize: 'var(--chip-btn-font-size)', color: 'var(--text-muted)', padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        ↩
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

  // ─── Unified layout (replaces separate desktop/mobile) ───────────────────
  return (
    <div className="space-y-1.5">

      {/* ── Raise drawer — slides up from above the action bar ── */}
      {isAllowed('RAISE') && (
        <div
          className="overflow-hidden"
          style={{
            maxHeight: raiseExpanded ? '200px' : '0px',
            opacity: raiseExpanded ? 1 : 0,
            transition: 'max-height 220ms ease-out, opacity 180ms ease-out',
          }}
        >
          <div
            className="space-y-1.5 pb-2"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              paddingBottom: '10px',
              marginBottom: '4px',
            }}
          >
            {chipRow}
            {presetRow}
            {/* Confirm row */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
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
                onClick={() => { setRaiseExpanded(false); onAction('RAISE', raiseAmount) }}
                disabled={raiseDisabled}
                className="rounded-xl font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  padding: 'var(--btn-padding)',
                  fontSize: 'var(--btn-font-size)',
                  background: raiseDisabled ? 'rgba(212,168,67,0.04)' : 'rgba(212,168,67,0.12)',
                  color: 'var(--gold)',
                  border: `1px solid ${raiseDisabled ? 'rgba(212,168,67,0.1)' : 'rgba(212,168,67,0.4)'}`,
                }}
              >
                {raiseIsAllIn ? 'All In' : `Raise ${raiseAmount}`}
              </button>
              <button
                onClick={() => { setRaiseExpanded(false); setRaiseAmount(prompt.minimumBet) }}
                style={{ fontSize: 'var(--preset-font-size)', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Info row: your hand · chip count · timer ── */}
      <div className="flex items-center gap-2">
        {handPreview}
        {chipBadge}
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        {timerBar}
      </div>

      {/* ── Action row: Fold · Call/Check · Raise ▲ · All In ── */}
      <div className="flex items-center gap-2">
        {isAllowed('FOLD') && (
          <button
            onClick={() => onAction('FOLD', 0)}
            className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-1px] flex-shrink-0"
            style={{
              padding: 'var(--btn-padding)',
              fontSize: 'var(--btn-font-size)',
              background: 'rgba(231,76,60,0.1)',
              color: 'var(--red)',
              border: '1px solid rgba(231,76,60,0.3)',
            }}
          >
            Fold
          </button>
        )}

        {isAllowed('CHECK') && (
          <button
            onClick={() => onAction('CHECK', 0)}
            className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-1px] flex-1"
            style={{
              padding: 'var(--btn-padding)',
              fontSize: 'var(--btn-font-size)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            Check
          </button>
        )}

        {isAllowed('CALL') && (
          <button
            onClick={() => onAction('CALL', prompt.currentBet)}
            className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-1px] flex-1"
            style={{
              padding: 'var(--btn-padding)',
              fontSize: 'var(--btn-font-size)',
              background: 'rgba(52,152,219,0.1)',
              color: 'var(--blue)',
              border: '1px solid rgba(52,152,219,0.3)',
            }}
          >
            Call {prompt.currentBet}
          </button>
        )}

        {isAllowed('RAISE') && (
          <button
            onClick={() => setRaiseExpanded((prev) => !prev)}
            className="rounded-xl font-bold transition-all duration-150 flex-shrink-0"
            style={{
              padding: 'var(--btn-padding)',
              fontSize: 'var(--btn-font-size)',
              background: raiseExpanded ? 'rgba(212,168,67,0.18)' : 'rgba(212,168,67,0.08)',
              color: raiseExpanded ? 'var(--gold-bright)' : 'var(--gold)',
              border: `1px solid ${raiseExpanded ? 'rgba(212,168,67,0.55)' : 'rgba(212,168,67,0.25)'}`,
              boxShadow: raiseExpanded ? '0 0 12px rgba(212,168,67,0.15)' : 'none',
            }}
          >
            Raise {raiseExpanded ? '▼' : '▲'}
          </button>
        )}

        {isAllowed('ALL_IN') && (
          <button
            onClick={() => onAction('ALL_IN', prompt.chips)}
            className="wpc-btn-primary flex-shrink-0"
            style={{ padding: 'var(--btn-padding)', fontSize: 'var(--btn-font-size)' }}
          >
            All In
          </button>
        )}
      </div>
    </div>
  )
}
