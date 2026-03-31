import type { TeamCard } from '@wpc/shared'
import { TeamCardComponent } from './TeamCardComponent'

interface PlayerHandProps {
  readonly cards: readonly TeamCard[]
}

export function PlayerHand({ cards }: PlayerHandProps) {
  if (cards.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Hand</h3>
      <div className="flex gap-3 justify-center">
        {cards.map((card, i) => (
          <div key={card.teamId} style={{ animation: `card-deal 0.4s ease-out ${i * 150}ms both` }}>
            <TeamCardComponent card={card} />
          </div>
        ))}
      </div>
    </div>
  )
}
