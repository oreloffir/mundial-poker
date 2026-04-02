interface ActivePlayer {
  readonly seatIndex: number
  readonly chipStack: number
  readonly userId: string
}

interface BlindPositions {
  readonly sbSeatIndex: number
  readonly bbSeatIndex: number
}

function getNextActiveSeat(afterSeat: number, players: readonly ActivePlayer[]): ActivePlayer {
  const sorted = [...players].sort((a, b) => a.seatIndex - b.seatIndex)
  const after = sorted.find((p) => p.seatIndex > afterSeat)
  return after ?? sorted[0]!
}

export function calculateBlindPositions(
  dealerSeatIndex: number,
  activePlayers: readonly ActivePlayer[],
): BlindPositions {
  const eligible = activePlayers.filter((p) => p.chipStack > 0)
  if (eligible.length < 2) {
    throw new Error('Not enough players with chips for blind positions')
  }

  if (eligible.length === 2) {
    const dealer = eligible.find((p) => p.seatIndex === dealerSeatIndex)
    const other = eligible.find((p) => p.seatIndex !== dealerSeatIndex)
    if (dealer && other) {
      return { sbSeatIndex: dealer.seatIndex, bbSeatIndex: other.seatIndex }
    }
    const sorted = [...eligible].sort((a, b) => a.seatIndex - b.seatIndex)
    return { sbSeatIndex: sorted[0]!.seatIndex, bbSeatIndex: sorted[1]!.seatIndex }
  }

  const sbPlayer = getNextActiveSeat(dealerSeatIndex, eligible)
  const bbPlayer = getNextActiveSeat(sbPlayer.seatIndex, eligible)

  return { sbSeatIndex: sbPlayer.seatIndex, bbSeatIndex: bbPlayer.seatIndex }
}

export function calculateNextActiveSeat(
  afterSeat: number,
  activePlayers: readonly ActivePlayer[],
): number {
  const eligible = activePlayers.filter((p) => p.chipStack > 0)
  if (eligible.length === 0) return afterSeat
  return getNextActiveSeat(afterSeat, eligible).seatIndex
}
