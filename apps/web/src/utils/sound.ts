// Preload all clips at module init so first playback has no latency
const sounds = {
  bet: new Audio('/sounds/chip-bet.mp3'),
  score: new Audio('/sounds/score-reveal.mp3'),
  winner: new Audio('/sounds/winner-cheer.mp3'),
} as const

// Set default volumes per spec
sounds.bet.volume = 0.6
sounds.score.volume = 0.5
sounds.winner.volume = 0.7

export type SoundName = keyof typeof sounds

export function playSound(name: SoundName): void {
  const audio = sounds[name]
  audio.currentTime = 0
  audio.play().catch(() => {})
}
