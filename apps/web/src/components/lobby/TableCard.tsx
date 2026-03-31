import type { TableStatus } from '@wpc/shared'

const MAX_PLAYERS = 5

export interface TableListItem {
  readonly id: string
  readonly name: string
  readonly status: TableStatus
  readonly playerCount: number
  readonly smallBlind: number
  readonly bigBlind: number
}

interface TableCardProps {
  readonly table: TableListItem
  readonly onJoin: (id: string) => void
}

const statusConfig: Record<TableStatus, { label: string; dotColor: string; textColor: string }> = {
  WAITING: { label: 'Waiting', dotColor: 'var(--green-glow)', textColor: 'var(--green-glow)' },
  IN_PROGRESS: { label: 'In Progress', dotColor: 'var(--gold)', textColor: 'var(--gold)' },
  PAUSED_FOR_MATCHES: { label: 'Paused', dotColor: 'var(--blue)', textColor: 'var(--blue)' },
  COMPLETED: { label: 'Completed', dotColor: 'var(--text-muted)', textColor: 'var(--text-muted)' },
}

export function TableCard({ table, onJoin }: TableCardProps) {
  const status = statusConfig[table.status]
  const isFull = table.playerCount >= MAX_PLAYERS
  const canJoin = table.status === 'WAITING' && !isFull

  return (
    <div className="wpc-card p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-outfit text-lg font-bold text-white truncate mr-2">{table.name}</h3>
        <span
          className="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
          style={{ color: status.textColor }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: status.dotColor,
              animation: table.status === 'WAITING' ? 'blink 2s ease-in-out infinite' : undefined,
            }}
          />
          {status.label}
        </span>
      </div>

      <div className="space-y-2.5 mb-5">
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>Players</span>
          <span className="font-semibold text-white">
            {table.playerCount}/{MAX_PLAYERS}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--text-muted)' }}>Blinds</span>
          <span className="font-semibold text-white">
            {table.smallBlind}/{table.bigBlind}
          </span>
        </div>
      </div>

      <div className="flex gap-1 mb-5">
        {Array.from({ length: MAX_PLAYERS }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < table.playerCount ? 'var(--gold)' : 'rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>

      <button
        onClick={() => onJoin(table.id)}
        disabled={!canJoin}
        className={
          canJoin
            ? 'wpc-btn-primary w-full justify-center text-sm py-3'
            : 'wpc-btn-ghost w-full justify-center text-sm py-3 opacity-40 cursor-not-allowed'
        }
      >
        {isFull ? 'Full' : table.status !== 'WAITING' ? 'In Progress' : 'Join Table'}
      </button>
    </div>
  )
}
