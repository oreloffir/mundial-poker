import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { Landing } from '@/pages/Landing'
import { Lobby } from '@/pages/Lobby'
import { GameTable } from '@/pages/GameTable'
import { useAuthStore } from '@/stores/authStore'

function EnsureGuestSession({ children }: { readonly children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const signInAsGuest = useAuthStore((s) => s.signInAsGuest)
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'failed'>(() =>
    user ? 'ready' : 'idle',
  )

  useEffect(() => {
    if (user) {
      setPhase('ready')
      return
    }

    let cancelled = false
    setPhase('loading')
    signInAsGuest()
      .then(() => {
        if (!cancelled) setPhase('ready')
      })
      .catch(() => {
        if (!cancelled) setPhase('failed')
      })

    return () => {
      cancelled = true
    }
  }, [user, signInAsGuest])

  if (phase === 'loading' || (phase === 'idle' && !user)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 gap-4">
        <div className="inline-block w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Joining as guest…</p>
      </div>
    )
  }

  if (phase === 'failed' || !useAuthStore.getState().user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/lobby"
        element={
          <EnsureGuestSession>
            <Lobby />
          </EnsureGuestSession>
        }
      />
      <Route
        path="/table/:id"
        element={
          <EnsureGuestSession>
            <GameTable />
          </EnsureGuestSession>
        }
      />
    </Routes>
  )
}
