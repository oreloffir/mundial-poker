import { useNavigate } from 'react-router-dom'

export function Landing() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div
        className="absolute top-1/2 left-1/2 w-[800px] h-[800px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212,168,67,0.08) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          animation: 'hero-breathe 6s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          top: '60%',
          left: '30%',
          background: 'radial-gradient(circle, rgba(39,174,96,0.06) 0%, transparent 70%)',
          transform: 'translate(-50%, -50%)',
          animation: 'hero-breathe 8s ease-in-out infinite reverse',
        }}
      />

      <div
        className="relative z-10 text-center px-4"
        style={{ animation: 'fade-in-up 1s ease-out' }}
      >
        <div
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-widest mb-10"
          style={{
            color: 'var(--gold)',
            border: '1px solid var(--border)',
            background: 'rgba(212,168,67,0.04)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--green-glow)', animation: 'blink 2s ease-in-out infinite' }}
          />
          FIFA World Cup 2026
        </div>

        <div
          className="flex items-center justify-center gap-5 mb-8"
          style={{ animation: 'fade-in-up 1s ease-out 0.2s both' }}
        >
          {['&#9917;', '&#127183;', '&#127942;'].map((icon, i) => (
            <div
              key={i}
              className="w-20 h-28 rounded-xl flex items-center justify-center text-4xl"
              style={{
                background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
                border: i === 1 ? '1px solid var(--gold-dim)' : '1px solid var(--border)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                transform:
                  i === 0
                    ? 'rotate(-12deg) translateY(10px)'
                    : i === 2
                      ? 'rotate(12deg) translateY(10px)'
                      : 'scale(1.1)',
                zIndex: i === 1 ? 2 : 1,
              }}
              dangerouslySetInnerHTML={{ __html: icon }}
            />
          ))}
        </div>

        <h1
          className="font-outfit font-black tracking-tight mb-6"
          style={{
            fontSize: 'clamp(3.5rem, 8vw, 7rem)',
            lineHeight: 1,
            animation: 'fade-in-up 1s ease-out 0.4s both',
          }}
        >
          <span style={{ color: 'var(--gold)' }}>MUNDIAL</span>
          <br />
          <span className="text-white">POKER</span>
        </h1>

        <p
          className="text-lg md:text-xl font-light tracking-wide mb-12 max-w-xl mx-auto"
          style={{ color: 'var(--text-dim)', animation: 'fade-in-up 1s ease-out 0.6s both' }}
        >
          Where the Beautiful Game Meets the High-Stakes Table
        </p>

        <div
          className="flex gap-4 justify-center"
          style={{ animation: 'fade-in-up 1s ease-out 0.8s both' }}
        >
          <button onClick={() => navigate('/lobby')} className="wpc-btn-primary text-base">
            Play Now &#8594;
          </button>
          <button onClick={() => navigate('/lobby')} className="wpc-btn-ghost">
            View Tables &#8594;
          </button>
        </div>

        <div
          className="mt-16 flex items-center justify-center gap-8 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--green-glow)',
                animation: 'blink 2s ease-in-out infinite',
              }}
            />
            Live Tables
          </div>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span>Real Football Fixtures</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span>Strategic Betting</span>
        </div>
      </div>
    </div>
  )
}
