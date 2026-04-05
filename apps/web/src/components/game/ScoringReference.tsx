import { useState } from 'react'

const SCORING_ROWS = [
  { label: 'Win', value: '+5', color: 'var(--green-glow)' },
  { label: 'Draw', value: '+3', color: 'var(--gold)' },
  { label: 'Loss', value: '0', color: 'var(--text-muted)' },
  { label: '3+ Goals', value: '+4', color: 'var(--green-glow)' },
  { label: 'Clean Sheet', value: '+2', color: 'var(--green-glow)' },
  { label: 'Penalties', value: '±1', color: 'var(--text-dim)' },
] as const

export function ScoringReference() {
  const [collapsed, setCollapsed] = useState(true)

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label="Show scoring reference"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(5,10,24,0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'var(--text-dim)',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        ?
      </button>
    )
  }

  return (
    <div
      data-testid="scoring-reference"
      style={{
        background: 'rgba(5,10,24,0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '6px 8px',
        minWidth: 88,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 5,
        }}
      >
        <span
          className="font-outfit font-bold uppercase"
          style={{ fontSize: 8, letterSpacing: '0.12em', color: 'var(--text-dim)' }}
        >
          Scoring
        </span>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse scoring reference"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 10,
            cursor: 'pointer',
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 5 }} />

      {SCORING_ROWS.map(({ label, value, color }) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            marginBottom: 3,
          }}
        >
          <span className="font-outfit" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
            {label}
          </span>
          <span className="font-outfit font-bold" style={{ fontSize: 10, color }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}
