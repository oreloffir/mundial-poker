import type { CSSProperties } from 'react'

interface PokerChipProps {
  readonly size?: number
  readonly className?: string
  readonly style?: CSSProperties
}

/**
 * Mundial Poker chip — gold & navy with football panel pattern and MP monogram.
 * Scalable SVG: pass any size (default 24). Use 64 for large displays, 32 for
 * balances, 16 for small inline badges.
 */
export function PokerChip({ size = 24, className, style }: PokerChipProps) {
  const id = `chip-${size}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={style}
      aria-label="MP chip"
      role="img"
    >
      <defs>
        {/* Body gradient: subtle highlight top-left */}
        <radialGradient id={`${id}-body`} cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#1e2e54" />
          <stop offset="100%" stopColor="#050a18" />
        </radialGradient>

        {/* Gold rim gradient */}
        <radialGradient id={`${id}-rim`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#f5e080" />
          <stop offset="45%" stopColor="#d4a843" />
          <stop offset="100%" stopColor="#8a6210" />
        </radialGradient>

        {/* Subtle glow filter for MP text */}
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Drop shadow */}
        <filter id={`${id}-shadow`} x="-10%" y="-5%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.6" />
        </filter>

        {/* Clip to chip circle so edge notches stay within bounds */}
        <clipPath id={`${id}-clip`}>
          <circle cx="32" cy="32" r="30" />
        </clipPath>
      </defs>

      {/* === Drop shadow layer === */}
      <circle cx="32" cy="33.5" r="29" fill="rgba(0,0,0,0.35)" filter={`url(#${id}-shadow)`} />

      {/* === Gold outer rim === */}
      <circle cx="32" cy="32" r="30" fill={`url(#${id}-rim)`} />

      {/* === 8 navy edge notches (classic chip stripe pattern) ===
          Each is a 5×7 rect at the rim top, rotated every 45° around center.
          Clipped to stay inside the chip circle. */}
      <g clipPath={`url(#${id}-clip)`}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <rect
            key={deg}
            x="29.5"
            y="2"
            width="5"
            height="7"
            fill="#050a18"
            rx="0.5"
            transform={`rotate(${deg} 32 32)`}
          />
        ))}
      </g>

      {/* === Thin gold highlight just inside the rim === */}
      <circle
        cx="32"
        cy="32"
        r="28.5"
        fill="none"
        stroke="rgba(245,224,128,0.35)"
        strokeWidth="0.75"
      />

      {/* === Navy chip body === */}
      <circle cx="32" cy="32" r="23" fill={`url(#${id}-body)`} />

      {/* === Inner label ring (gold) === */}
      <circle cx="32" cy="32" r="19.5" fill="none" stroke="#d4a843" strokeWidth="1" />
      <circle
        cx="32"
        cy="32"
        r="18.5"
        fill="none"
        stroke="rgba(212,168,67,0.18)"
        strokeWidth="0.5"
      />

      {/* === Football panel pattern ===
          Six small hex-dot panels arranged hexagonally at r≈13 from center,
          plus a central pentagon — echoes the classic soccer ball look. */}
      {/* Outer 6 panels at 60° increments, r=13 */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const cx = 32 + 13 * Math.sin(rad)
        const cy = 32 - 13 * Math.cos(rad)
        return (
          <circle
            key={deg}
            cx={cx}
            cy={cy}
            r="2.2"
            fill="rgba(212,168,67,0.22)"
            stroke="rgba(212,168,67,0.45)"
            strokeWidth="0.4"
          />
        )
      })}
      {/* Center pentagon */}
      <polygon
        points="32,26.5 35.5,29 34.2,33 29.8,33 28.5,29"
        fill="rgba(212,168,67,0.1)"
        stroke="rgba(212,168,67,0.38)"
        strokeWidth="0.5"
      />

      {/* === MP monogram === */}
      <text
        x="32"
        y="36.5"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="13"
        letterSpacing="1.8"
        fill="#f0d060"
        filter={`url(#${id}-glow)`}
      >
        MP
      </text>
    </svg>
  )
}
