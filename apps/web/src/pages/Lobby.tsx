import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { CreateTableModal } from '@/components/lobby/CreateTableModal'
import { TableCard, type TableListItem } from '@/components/lobby/TableCard'

export function Lobby() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [tables, setTables] = useState<readonly TableListItem[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTables = useCallback(async () => {
    try {
      const response = await api.get('/tables')
      const tablesPayload = response.data?.data?.tables
      setTables(Array.isArray(tablesPayload) ? tablesPayload : [])
    } catch {
      // silently retry on next poll
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTables()
    const interval = setInterval(fetchTables, 5000)
    return () => clearInterval(interval)
  }, [fetchTables])

  const handleJoin = (tableId: string) => {
    navigate(`/table/${tableId}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleTableCreated = (tableId: string) => {
    setShowCreateModal(false)
    navigate(`/table/${tableId}`)
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
      <nav className="wpc-nav sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div
            className="font-cinzel font-black text-sm tracking-widest flex items-center gap-2.5"
            style={{ color: 'var(--gold)' }}
          >
            <span className="text-lg">&#9824;</span>
            MUNDIAL POKER
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
              {user?.username}
            </span>
            <button onClick={handleLogout} className="wpc-btn-ghost text-xs py-2 px-4">
              End session
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="wpc-label mb-3">Lobby</div>
            <h2 className="font-outfit text-3xl font-extrabold text-white">Available Tables</h2>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="wpc-btn-primary">
            Create Table
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div
              className="inline-block w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
            <p className="mt-4" style={{ color: 'var(--text-dim)' }}>
              Loading tables...
            </p>
          </div>
        ) : tables.length === 0 ? (
          <div
            className="text-center py-20 rounded-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-lg mb-2" style={{ color: 'var(--text-dim)' }}>
              No tables available
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Create one to start playing!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tables.map((table) => (
              <TableCard key={table.id} table={table} onJoin={handleJoin} />
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateTableModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTableCreated}
        />
      )}
    </div>
  )
}
