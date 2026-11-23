import { Fingerprint } from 'lucide-react'

const victims = Array.from({ length: 18 }, (_, index) => index + 1)

const desktopThreads = victims.slice(0, -1).map((victim) => {
  const index = victim - 1
  const row = Math.floor(index / 6)
  const column = row % 2 === 0 ? index % 6 : 5 - (index % 6)
  const nextIndex = index + 1
  const nextRow = Math.floor(nextIndex / 6)
  const nextColumn = nextRow % 2 === 0 ? nextIndex % 6 : 5 - (nextIndex % 6)
  const x1 = column * 100 + 50
  const y1 = row * 100 + 50
  const x2 = nextColumn * 100 + 50
  const y2 = nextRow * 100 + 50

  return `${x1},${y1} ${x2},${y2}`
})

const mobileThreads = victims.slice(0, -1).map((victim) => {
  const index = victim - 1
  const row = Math.floor(index / 3)
  const column = row % 2 === 0 ? index % 3 : 2 - (index % 3)
  const nextIndex = index + 1
  const nextRow = Math.floor(nextIndex / 3)
  const nextColumn = nextRow % 2 === 0 ? nextIndex % 3 : 2 - (nextIndex % 3)
  const x1 = column * 200 + 100
  const y1 = row * 50 + 25
  const x2 = nextColumn * 200 + 100
  const y2 = nextRow * 50 + 25

  return `${x1},${y1} ${x2},${y2}`
})

export function EvidenceBoard() {
  return (
    <section id="evidence" className="investigation-section evidence-section" aria-labelledby="evidence-title">
      <div className="section-heading">
        <p className="eyebrow">CONFIDENTIAL INVESTIGATION RECORD</p>
        <h2 id="evidence-title">THE 18 VICTIMS</h2>
        <p>Every victim has a story. Every connection matters.</p>
      </div>

      <div className="evidence-board" aria-label="Investigation evidence board with 18 unidentified victim positions">
        <div className="board-grid-markings" aria-hidden="true" />

        <svg className="thread-layer thread-layer-desktop" viewBox="0 0 600 300" aria-hidden="true">
          {desktopThreads.map((points, index) => (
            <polyline key={index} points={points} />
          ))}
        </svg>

        <svg className="thread-layer thread-layer-mobile" viewBox="0 0 600 300" aria-hidden="true">
          {mobileThreads.map((points, index) => (
            <polyline key={index} points={points} />
          ))}
        </svg>

        <div className="victim-grid">
          {victims.map((victim) => (
            <article className="victim-card" key={victim}>
              <div className="evidence-pin" aria-hidden="true" />
              <div className="case-marker">CASE {String(victim).padStart(2, '0')}</div>
              <div className="victim-photograph" aria-label={`Victim ${String(victim).padStart(2, '0')} unidentified`}>
                <div className="silhouette-head" />
                <div className="silhouette-body" />
                <span>UNIDENTIFIED</span>
              </div>
              <div className="victim-record">
                <Fingerprint size={16} aria-hidden="true" />
                <span>VICTIM {String(victim).padStart(2, '0')}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="board-classified-stamp" aria-label="Case status: Unsolved">
          UNSOLVED
        </div>
      </div>
    </section>
  )
}
