import type { TeamCard } from '@wpc/shared'

interface TeamCardComponentProps {
  readonly card: TeamCard
  readonly compact?: boolean
}

const tierConfig: Record<string, { bg: string; border: string; badge: string; badgeText: string }> =
  {
    S: {
      bg: 'rgba(212,168,67,0.08)',
      border: 'var(--gold-dim)',
      badge: 'rgba(212,168,67,0.15)',
      badgeText: 'var(--gold)',
    },
    A: {
      bg: 'rgba(155,89,182,0.08)',
      border: 'rgba(155,89,182,0.3)',
      badge: 'rgba(155,89,182,0.15)',
      badgeText: 'var(--purple)',
    },
    B: {
      bg: 'rgba(52,152,219,0.08)',
      border: 'rgba(52,152,219,0.3)',
      badge: 'rgba(52,152,219,0.15)',
      badgeText: 'var(--blue)',
    },
    C: {
      bg: 'rgba(85,102,128,0.08)',
      border: 'rgba(85,102,128,0.3)',
      badge: 'rgba(85,102,128,0.15)',
      badgeText: 'var(--text-muted)',
    },
  }

export function TeamCardComponent({ card, compact = false }: TeamCardComponentProps) {
  const tier = tierConfig[card.team.tier] ?? tierConfig.C

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
        style={{ background: tier.bg, border: `1px solid ${tier.border}` }}
      >
        <span className="text-base">{card.team.flagUrl}</span>
        <span className="font-bold text-white">{card.team.code}</span>
      </div>
    )
  }

  return (
    <div
      className="w-32 rounded-2xl p-4 text-center relative overflow-hidden cursor-pointer"
      style={{
        background: `linear-gradient(160deg, var(--bg-card) 0%, var(--surface) 100%)`,
        border: `1px solid ${tier.border}`,
        transition: 'all 0.4s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) rotateX(5deg)'
        e.currentTarget.style.borderColor = 'var(--gold)'
        e.currentTarget.style.boxShadow =
          '0 20px 50px rgba(212,168,67,0.15), 0 0 30px rgba(212,168,67,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.borderColor = tier.border
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div
        className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-extrabold font-outfit"
        style={{ background: tier.badge, color: tier.badgeText }}
      >
        {card.team.tier}
      </div>
      <div className="text-4xl mb-2">{card.team.flagUrl}</div>
      <div className="font-outfit text-sm font-bold text-white truncate">{card.team.name}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {card.team.code}
      </div>
      <div className="mt-2 text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
        #{card.team.fifaRanking}
      </div>
    </div>
  )
}
