import { useEffect, useState } from 'react'

export function useCountUp(target: number, duration: number): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (target === 0) { setCount(0); return }
    setCount(0)
    const steps = Math.min(target, 30)
    const stepMs = duration / steps
    let step = 0
    const id = setInterval(() => {
      step++
      if (step >= steps) {
        setCount(target)
        clearInterval(id)
      } else {
        setCount(Math.round((target / steps) * step))
      }
    }, stepMs)
    return () => clearInterval(id)
  }, [target, duration])
  return count
}
