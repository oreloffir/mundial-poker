import type { TablePlayer } from '@wpc/shared'
import { useNavigate } from 'react-router-dom'

interface GameOverOverlayProps {
  readonly players: readonly TablePlayer[]
}

export function GameOverOverlay({ players }: GameOverOverlayProps) {
  const navigate = useNavigate()
  const sorted = [...players].sort((a, b) => b.chips - a.chips)
  const winner = sorted[0]

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: 'rgba(5,10,24,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="text-5xl mb-4">&#127942;</div>
        <h2 className="font-outfit text-3xl font-black text-white mb-1">Game Over</h2>
        <div className="w-12 h-0.5 mx-auto mb-4" style={{ background: 'var(--gold)' }} />

        {winner && (
          <p className="text-xl mb-6" style={{ color: 'var(--text-dim)' }}>
            <span className="font-bold" style={{ color: 'var(--gold)' }}>
              {winner.username}
            </span>{' '}
            wins!
          </p>
        )}

        <div className="space-y-2 mb-6">
          {sorted.map((player, index) => (
            <div
              key={player.userId}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: index === 0 ? 'rgba(212,168,67,0.08)' : 'rgba(255,255,255,0.02)',
                border: index === 0 ? '1px solid var(--gold-dim)' : '1px solid transparent',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-sm w-6 font-bold"
                  style={{ color: index === 0 ? 'var(--gold)' : 'var(--text-muted)' }}
                >
                  #{index + 1}
                </span>
                <span className="text-white font-medium">{player.username}</span>
              </div>
              <span className="font-mono font-bold" style={{ color: 'var(--green-glow)' }}>
                {player.chips}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/lobby')}
          className="wpc-btn-primary w-full justify-center"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  )
}
