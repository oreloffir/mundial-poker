import { useGameStore } from '@/stores/gameStore'

export interface RawFixture {
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
  /** Used for old board:reveal stagger flow (revealedCount >= 0) or show all (-1) */
  readonly revealedCount: number
}

function getEventIcons(homeGoals: number, awayGoals: number, hasPenalties: boolean): string[] {
  const icons: string[] = []
  if (homeGoals >= 3 || awayGoals >= 3) icons.push('🔥')
  if (homeGoals === 0 || awayGoals === 0) icons.push('🧤')
  if (hasPenalties) icons.push('🥅')
  return icons
}

export function FixtureBoard({ fixtures, revealedCount }: FixtureBoardProps) {
  const fixtureResults = useGameStore((s) => s.fixtureResults)
  const showdownPhase = useGameStore((s) => s.showdownPhase)
  const myHand = useGameStore((s) => s.myHand)

  // Map fixtureId → my teamId for that fixture (to highlight only my team's row)
  const myTeamByFixture = new Map(myHand?.map((c) => [c.fixtureId, c.teamId]) ?? [])

  if (fixtures.length === 0) return null

  const showAll = revealedCount === -1

  // Build a lookup map from fixtureId → result for the showdown phase
  const resultMap = new Map(fixtureResults.map((r) => [r.fixtureId, r]))

  // Show all tiles from round start (idle=VS matchups, showdown=scores)
  const inShowdownPhase =
    showdownPhase === 'idle' ||
    showdownPhase === 'waiting' ||
    showdownPhase === 'fixtures' ||
    showdownPhase === 'calculating' ||
    showdownPhase === 'reveals' ||
    showdownPhase === 'winner'

  return (
    <div className="fixture-board-scroll">
      {fixtures.map((f, index) => {
        // During showdown phases, show all tiles
        const visible = inShowdownPhase || showAll || index < revealedCount
        if (!visible) return null

        // Use fixtureResult data if available (S6 progressive flow)
        const result = resultMap.get(f.id)
        const isNewResult =
          result !== undefined && fixtureResults[fixtureResults.length - 1]?.fixtureId === f.id

        const myTeamId = myTeamByFixture.get(f.id)
        const isMyHomeTeam = myTeamId !== undefined && myTeamId === f.homeTeamId
        const isMyAwayTeam = myTeamId !== undefined && myTeamId === f.awayTeamId

        const homeGoals = result?.homeGoals ?? f.homeGoals ?? null
        const awayGoals = result?.awayGoals ?? f.awayGoals ?? null
        const finished =
          homeGoals !== null &&
          awayGoals !== null &&
          (result !== undefined || f.status === 'FINISHED')

        const homeTeamFlag = result?.homeTeam?.flagUrl ?? f.homeFlag
        const awayTeamFlag = result?.awayTeam?.flagUrl ?? f.awayFlag
        const homeCode = result?.homeTeam?.code ?? f.homeTeamId
        const awayCode = result?.awayTeam?.code ?? f.awayTeamId

        const homeWin = finished && homeGoals! > awayGoals!
        const awayWin = finished && awayGoals! > homeGoals!
        const isDraw = finished && homeGoals === awayGoals

        const hasPenalties = result?.hasPenalties ?? false
        const events = finished ? getEventIcons(homeGoals!, awayGoals!, hasPenalties) : []

        const homeScoreColor = homeWin
          ? 'var(--green-glow)'
          : isDraw
            ? 'var(--gold)'
            : 'var(--text-muted)'
        const awayScoreColor = awayWin
          ? 'var(--green-glow)'
          : isDraw
            ? 'var(--gold)'
            : 'var(--text-muted)'

        return (
          <div key={f.id} className="flex flex-col items-center gap-0.5">
            <div
              data-testid={`fixture-card-${index}`}
              className="flex flex-col items-center rounded-xl overflow-hidden"
              style={{
                background: finished ? 'rgba(13, 20, 36, 0.55)' : 'rgba(13, 20, 36, 0.4)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: finished
                  ? '1px solid rgba(212, 168, 67, 0.45)'
                  : '1px solid rgba(255, 255, 255, 0.07)',
                width: 'var(--fixture-tile-w)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                animation: isNewResult
                  ? 'tile-reveal 0.4s ease-out both'
                  : !inShowdownPhase && !showAll
                    ? 'tile-reveal 0.3s ease-out both'
                    : undefined,
              }}
            >
              {/* Home team row */}
              <div
                className="flex items-center justify-between w-full px-1.5 pt-2 pb-1"
                style={{
                  background: isMyHomeTeam ? 'rgba(212,168,67,0.1)' : undefined,
                  borderLeft: isMyHomeTeam
                    ? '2px solid rgba(212,168,67,0.6)'
                    : '2px solid transparent',
                }}
              >
                <div className="flex flex-col items-center flex-1">
                  <span className="text-lg leading-none">{homeTeamFlag || '🏳️'}</span>
                  <span
                    className="text-[8px] font-bold mt-0.5"
                    style={{
                      color: finished
                        ? homeScoreColor
                        : isMyHomeTeam
                          ? 'var(--gold)'
                          : 'var(--text)',
                    }}
                  >
                    {homeCode}
                  </span>
                </div>
                {finished && (
                  <span
                    className="font-outfit font-black"
                    style={{ fontSize: 13, color: homeScoreColor }}
                  >
                    {homeGoals}
                  </span>
                )}
              </div>

              {/* VS divider — only when not finished */}
              {!finished && (
                <div
                  className="w-full py-1 flex items-center justify-center"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                >
                  <span
                    className="font-outfit font-black text-[10px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    VS
                  </span>
                </div>
              )}

              {/* Away team row */}
              <div
                className="flex items-center justify-between w-full px-1.5 pt-1 pb-2"
                style={{
                  background: isMyAwayTeam ? 'rgba(212,168,67,0.1)' : undefined,
                  borderLeft: isMyAwayTeam
                    ? '2px solid rgba(212,168,67,0.6)'
                    : '2px solid transparent',
                }}
              >
                <div className="flex flex-col items-center flex-1">
                  <span className="text-lg leading-none">{awayTeamFlag || '🏳️'}</span>
                  <span
                    className="text-[8px] font-bold mt-0.5"
                    style={{
                      color: finished
                        ? awayScoreColor
                        : isMyAwayTeam
                          ? 'var(--gold)'
                          : 'var(--text)',
                    }}
                  >
                    {awayCode}
                  </span>
                </div>
                {finished && (
                  <span
                    className="font-outfit font-black"
                    style={{ fontSize: 13, color: awayScoreColor }}
                  >
                    {awayGoals}
                  </span>
                )}
              </div>

              {/* Event icons */}
              {events.length > 0 && (
                <div className="mobile-landscape-hide flex gap-0.5 pb-1.5">
                  {events.map((e, i) => (
                    <span key={i} className="text-[9px]">
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
