interface RawFixture {
  readonly id: string
  readonly homeTeamId: string
  readonly awayTeamId: string
  readonly homeTeamName?: string
  readonly awayTeamName?: string
  readonly homeFlag?: string
  readonly awayFlag?: string
  readonly status: string
  readonly homeGoals?: number | null
  readonly awayGoals?: number | null
  readonly homePenaltiesScored?: number | null
  readonly awayPenaltiesScored?: number | null
}

interface FixtureBoardProps {
  readonly fixtures: readonly RawFixture[]
  readonly revealedCount: number
}

function getEventIcons(f: RawFixture): string[] {
  if (f.status !== 'FINISHED' || f.homeGoals == null || f.awayGoals == null) return []
  const icons: string[] = []
  if (f.homeGoals >= 3 || f.awayGoals >= 3) icons.push('🔥')
  if (f.homeGoals === 0 || f.awayGoals === 0) icons.push('🧤')
  if ((f.homePenaltiesScored ?? 0) > 0 || (f.awayPenaltiesScored ?? 0) > 0) icons.push('🥅')
  return icons
}

export function FixtureBoard({ fixtures, revealedCount }: FixtureBoardProps) {
  if (fixtures.length === 0) return null

  const showAll = revealedCount === -1

  return (
    <div className="flex items-center justify-center gap-2">
      {fixtures.map((f, index) => {
        const visible = showAll || index < revealedCount
        if (!visible) return null

        const finished = f.status === 'FINISHED' && f.homeGoals != null && f.awayGoals != null
        const homeWin = finished && f.homeGoals! > f.awayGoals!
        const awayWin = finished && f.awayGoals! > f.homeGoals!
        const isDraw = finished && f.homeGoals === f.awayGoals
        const events = getEventIcons(f)

        return (
          <div
            key={f.id}
            className="flex flex-col items-center rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, var(--bg-card), var(--surface))',
              border: finished ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
              width: '72px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              animation: !showAll ? 'tile-reveal 0.3s ease-out both' : undefined,
            }}
          >
            {/* Home team */}
            <div className="flex flex-col items-center pt-2 pb-1 w-full">
              <span className="text-lg leading-none">{f.homeFlag || '🏳️'}</span>
              <span
                className="text-[8px] font-bold mt-0.5"
                style={{ color: homeWin ? 'var(--green-glow)' : 'var(--text)' }}
              >
                {f.homeTeamId}
              </span>
            </div>

            {/* Score / VS */}
            <div
              className="w-full py-1 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              {finished ? (
                <div className="flex items-center gap-1">
                  <span
                    className="font-outfit font-black text-sm"
                    style={{
                      color: homeWin
                        ? 'var(--green-glow)'
                        : isDraw
                          ? 'var(--gold)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {f.homeGoals}
                  </span>
                  <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                    -
                  </span>
                  <span
                    className="font-outfit font-black text-sm"
                    style={{
                      color: awayWin
                        ? 'var(--green-glow)'
                        : isDraw
                          ? 'var(--gold)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {f.awayGoals}
                  </span>
                </div>
              ) : (
                <span
                  className="font-outfit font-black text-[10px]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  VS
                </span>
              )}
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center pt-1 pb-2 w-full">
              <span className="text-lg leading-none">{f.awayFlag || '🏳️'}</span>
              <span
                className="text-[8px] font-bold mt-0.5"
                style={{ color: awayWin ? 'var(--green-glow)' : 'var(--text)' }}
              >
                {f.awayTeamId}
              </span>
            </div>

            {/* Event icons */}
            {events.length > 0 && (
              <div className="flex gap-0.5 pb-1.5">
                {events.map((e, i) => (
                  <span key={i} className="text-[9px]">
                    {e}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
