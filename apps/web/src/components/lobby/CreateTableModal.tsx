import { useState } from 'react'
import { api } from '@/lib/api'

interface CreateTableModalProps {
  readonly onClose: () => void
  readonly onCreated: (tableId: string) => void
}

export function CreateTableModal({ onClose, onCreated }: CreateTableModalProps) {
  const [name, setName] = useState('')
  const [startingChips, setStartingChips] = useState('500')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await api.post('/tables', {
        name: name.trim(),
        startingChips: parseInt(startingChips, 10),
      })
      const table = response.data?.data?.table
      if (!table?.id) {
        throw new Error('Invalid create table response')
      }
      onCreated(table.id)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response: { data: { message: string } } }).response?.data?.message ??
            'Failed to create table')
          : 'Failed to create table'
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(5,10,24,0.8)' }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md shadow-2xl rounded-2xl p-7"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="wpc-label mb-2">New Table</div>
        <h2 className="font-outfit text-2xl font-bold text-white mb-6">Create Table</h2>

        {error && (
          <div
            className="mb-4 p-3 rounded-lg text-sm"
            style={{
              background: 'rgba(231,76,60,0.1)',
              border: '1px solid rgba(231,76,60,0.3)',
              color: 'var(--red)',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="tableName"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-dim)' }}
            >
              Table Name
            </label>
            <input
              id="tableName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl text-sm"
              placeholder="My Poker Table"
            />
          </div>

          <div>
            <label
              htmlFor="chips"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--text-dim)' }}
            >
              Starting Chips
            </label>
            <input
              id="chips"
              type="number"
              value={startingChips}
              onChange={(e) => setStartingChips(e.target.value)}
              required
              min={100}
              max={10000}
              step={100}
              className="w-full px-4 py-3 rounded-xl text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="wpc-btn-ghost flex-1 justify-center py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="wpc-btn-primary flex-1 justify-center py-3"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
