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

export function BettingControls({ prompt, onAction }: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState(prompt.minimumBet)
  const [timeLeft, setTimeLeft] = useState(prompt.timeoutMs)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    setRaiseAmount(Math.max(prompt.minimumBet + 1, prompt.minimumBet))
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

  return (
    <div className="space-y-3">
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

      <div className="flex items-center gap-2.5 flex-wrap justify-center">
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

        {isAllowed('RAISE') && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={prompt.currentBet + 1}
              max={prompt.chips}
              step={Math.max(1, Math.floor(prompt.minimumBet / 2))}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(parseInt(e.target.value, 10))}
              style={{ width: 'var(--slider-w)', accentColor: 'var(--gold)' }}
            />
            <button
              onClick={() => onAction('RAISE', raiseAmount)}
              className="rounded-xl font-bold transition-all duration-200 hover:translate-y-[-2px]"
              style={{
                padding: 'var(--btn-padding)',
                fontSize: 'var(--btn-font-size)',
                background: 'rgba(212,168,67,0.1)',
                color: 'var(--gold)',
                border: '1px solid rgba(212,168,67,0.3)',
              }}
            >
              Raise {raiseAmount}
            </button>
          </div>
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
    </div>
  )
}
