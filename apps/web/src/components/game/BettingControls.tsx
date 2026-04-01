import { useState, useEffect, useRef } from 'react'
import type { BetAction } from '@wpc/shared'

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
}

const CHIP_DENOMS = [5, 10, 25, 50, 100, 200] as const

export function BettingControls({ prompt, onAction }: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(prompt.minimumBet)
  const [timeLeft, setTimeLeft] = useState(prompt.timeoutMs)
  const [pressedChip, setPressedChip] = useState<number | null>(null)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    setRaiseAmount(prompt.minimumBet)
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

  return (
    <div className="space-y-2">
      {/* Timer bar — unchanged */}
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
          style={{
            color: timerColor,
            ...(isUrgent ? { animation: 'blink 0.7s ease-in-out infinite' } : {}),
          }}
        >
          {timeSeconds}s
        </span>
      </div>

      {/* Action buttons row — Fold / Check / Call / All In unchanged */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {isAllowed('FOLD') && (
          <button
            onClick={() => onAction('FOLD', 0)}
            className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px]"
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
            className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px]"
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
            className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px]"
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

      {/* Chip stack + raise section — only when RAISE is allowed */}
      {isAllowed('RAISE') && (
        <div className="space-y-1.5 pt-0.5">
          {/* Chip denomination row */}
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
                    border: wouldExceed
                      ? '1px solid rgba(212,168,67,0.15)'
                      : '1px solid rgba(212,168,67,0.5)',
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
              className="transition-colors duration-150"
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

          {/* Preset row */}
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

          {/* Running total + Raise confirm */}
          <div className="flex items-center justify-center gap-3">
            <span style={{ fontSize: 'var(--preset-font-size)', color: 'var(--text-muted)' }}>
              Raise to:{' '}
              <span
                className="font-outfit font-black"
                style={{
                  fontSize: 'var(--btn-font-size)',
                  color: raiseDisabled ? 'var(--red)' : 'var(--gold-bright)',
                }}
              >
                {raiseIsAllIn ? 'All In' : raiseAmount}
              </span>
            </span>
            <button
              onClick={() => onAction('RAISE', raiseAmount)}
              disabled={raiseDisabled}
              className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{
                padding: 'var(--btn-padding)',
                fontSize: 'var(--btn-font-size)',
                background: raiseDisabled ? 'rgba(212,168,67,0.04)' : 'rgba(212,168,67,0.1)',
                color: 'var(--gold)',
                border: `1px solid ${raiseDisabled ? 'rgba(212,168,67,0.1)' : 'rgba(212,168,67,0.35)'}`,
              }}
            >
              {raiseIsAllIn ? 'Raise (All In)' : `Raise ${raiseAmount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
