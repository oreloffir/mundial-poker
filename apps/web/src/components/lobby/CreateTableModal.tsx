import { useState } from 'react'
import { api } from '@/lib/api'

interface CreateTableModalProps {
  readonly onClose: () => void
  readonly onCreated: (tableId: string) => void
}

export function CreateTableModal({ onClose, onCreated }: CreateTableModalProps) {
  const [name, setName] = useState('')
  const [startingChips, setStartingChips] = useState('500')
  const [smallBlind, setSmallBlind] = useState('5')
  const [bigBlind, setBigBlind] = useState('10')
  const [blindError, setBlindError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSmallBlindChange = (value: string) => {
    setSmallBlind(value)
    const sb = parseInt(value, 10)
    if (isNaN(sb) || sb < 1) {
      setBlindError('Small blind must be at least 1')
    } else {
      setBlindError(null)
      setBigBlind(String(sb * 2))
    }
  }

  const validateBlinds = (): string | null => {
    const sb = parseInt(smallBlind, 10)
    const chips = parseInt(startingChips, 10)
    if (!Number.isInteger(sb) || sb < 1) return 'Small blind must be a positive integer'
    if (sb * 2 >= chips) return 'Big blind must be less than starting chips'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validateBlinds()
    if (validationError) {
      setBlindError(validationError)
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await api.post('/tables', {
        name: name.trim(),
        startingChips: parseInt(startingChips, 10),
        smallBlind: parseInt(smallBlind, 10),
        bigBlind: parseInt(bigBlind, 10),
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

          <div className="flex gap-3">
            <div className="flex-1">
              <label
                htmlFor="smallBlind"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-dim)' }}
              >
                Small Blind
              </label>
              <input
                id="smallBlind"
                type="number"
                value={smallBlind}
                onChange={(e) => handleSmallBlindChange(e.target.value)}
                required
                min={1}
                className="w-full px-4 py-3 rounded-xl text-sm"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="bigBlind"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-dim)' }}
              >
                Big Blind
              </label>
              <input
                id="bigBlind"
                data-testid="big-blind-input"
                type="number"
                value={bigBlind}
                readOnly
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'var(--text-dim)',
                  cursor: 'default',
                }}
              />
            </div>
          </div>

          {blindError && (
            <p className="text-xs" style={{ color: 'var(--red)', marginTop: '-8px' }}>
              {blindError}
            </p>
          )}

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Always 2× the small blind
          </p>

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
