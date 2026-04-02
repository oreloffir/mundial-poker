import { describe, it, expect } from 'vitest'
import { calculateBlindPositions, calculateNextActiveSeat } from './blinds.service.js'

function makePlayer(seatIndex: number, chipStack = 500) {
  return { seatIndex, chipStack, userId: `user-${seatIndex}` }
}

describe('calculateBlindPositions', () => {
  it('assigns SB and BB clockwise from dealer for 5 players', () => {
    const players = [0, 1, 2, 3, 4].map((s) => makePlayer(s))
    const result = calculateBlindPositions(0, players)
    expect(result.sbSeatIndex).toBe(1)
    expect(result.bbSeatIndex).toBe(2)
  })

  it('wraps around when dealer is at last seat', () => {
    const players = [0, 1, 2, 3, 4].map((s) => makePlayer(s))
    const result = calculateBlindPositions(4, players)
    expect(result.sbSeatIndex).toBe(0)
    expect(result.bbSeatIndex).toBe(1)
  })

  it('wraps around when dealer is second-to-last', () => {
    const players = [0, 1, 2, 3, 4].map((s) => makePlayer(s))
    const result = calculateBlindPositions(3, players)
    expect(result.sbSeatIndex).toBe(4)
    expect(result.bbSeatIndex).toBe(0)
  })

  it('handles heads-up: dealer is SB, opponent is BB', () => {
    const players = [makePlayer(0), makePlayer(3)]
    const result = calculateBlindPositions(0, players)
    expect(result.sbSeatIndex).toBe(0)
    expect(result.bbSeatIndex).toBe(3)
  })

  it('handles heads-up with dealer at higher seat', () => {
    const players = [makePlayer(1), makePlayer(4)]
    const result = calculateBlindPositions(4, players)
    expect(result.sbSeatIndex).toBe(4)
    expect(result.bbSeatIndex).toBe(1)
  })

  it('skips eliminated players (chipStack 0)', () => {
    const players = [makePlayer(0), makePlayer(1, 0), makePlayer(2), makePlayer(3)]
    const result = calculateBlindPositions(0, players)
    expect(result.sbSeatIndex).toBe(2)
    expect(result.bbSeatIndex).toBe(3)
  })

  it('skips multiple eliminated players', () => {
    const players = [
      makePlayer(0),
      makePlayer(1, 0),
      makePlayer(2, 0),
      makePlayer(3),
      makePlayer(4),
    ]
    const result = calculateBlindPositions(0, players)
    expect(result.sbSeatIndex).toBe(3)
    expect(result.bbSeatIndex).toBe(4)
  })

  it('works with 3 players', () => {
    const players = [makePlayer(0), makePlayer(2), makePlayer(4)]
    const result = calculateBlindPositions(0, players)
    expect(result.sbSeatIndex).toBe(2)
    expect(result.bbSeatIndex).toBe(4)
  })

  it('throws with fewer than 2 eligible players', () => {
    const players = [makePlayer(0)]
    expect(() => calculateBlindPositions(0, players)).toThrow()
  })

  it('throws when all but one are eliminated', () => {
    const players = [makePlayer(0), makePlayer(1, 0), makePlayer(2, 0)]
    expect(() => calculateBlindPositions(0, players)).toThrow()
  })
})

describe('calculateNextActiveSeat', () => {
  it('returns next seat clockwise', () => {
    const players = [0, 1, 2, 3, 4].map((s) => makePlayer(s))
    expect(calculateNextActiveSeat(2, players)).toBe(3)
  })

  it('wraps around from last seat', () => {
    const players = [0, 1, 2, 3, 4].map((s) => makePlayer(s))
    expect(calculateNextActiveSeat(4, players)).toBe(0)
  })

  it('skips eliminated players', () => {
    const players = [makePlayer(0), makePlayer(1, 0), makePlayer(2)]
    expect(calculateNextActiveSeat(0, players)).toBe(2)
  })
})
