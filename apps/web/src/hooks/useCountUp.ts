import { useEffect, useState } from 'react'

export function useCountUp(target: number, duration: number, animate = true): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!animate || target === 0) {
      setCount(target)
      return
    }
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
  }, [target, duration, animate])
  return count
}
