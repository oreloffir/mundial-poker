import type { TeamCard } from '@wpc/shared'
import { TeamCardComponent } from './TeamCardComponent'

interface BoardCardsProps {
  readonly cards: readonly TeamCard[]
}

export function BoardCards({ cards }: BoardCardsProps) {
  if (cards.length === 0) return null

  return (
    <div className="mt-4 text-center">
      <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Community Board</h3>
      <div className="flex gap-2 justify-center flex-wrap">
        {cards.map((card) => (
          <TeamCardComponent key={card.teamId} card={card} compact />
        ))}
      </div>
    </div>
  )
}
