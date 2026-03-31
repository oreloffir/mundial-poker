export function WaitingOverlay() {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      style={{ background: 'rgba(5,10,24,0.7)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="rounded-2xl p-8 text-center max-w-sm mx-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="text-4xl mb-4">&#9917;</div>
        <h2 className="font-outfit text-xl font-bold text-white mb-2">Matches in Progress</h2>
        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
          Waiting for real football results to determine card scores...
        </p>
        <div
          className="mt-4 inline-block w-6 h-6 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
        />
      </div>
    </div>
  )
}
