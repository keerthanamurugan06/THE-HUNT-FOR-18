import { useEffect, useState } from 'react'
import { Fingerprint, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Unlock = { victim_number: number; puzzle_type: string; slot?: number }

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

export function EvidenceBoard({ participantView = false }: { participantView?: boolean }) {
  const [unlocks, setUnlocks] = useState<Unlock[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>(participantView ? 'loading' : 'idle')

  useEffect(() => {
    if (!participantView) return
    let active = true
    async function loadUnlocks() {
      setLoadState('loading')
      const { data, error } = await supabase
        .from('team_round1_evidence_unlocks')
        .select('victim_number,puzzle_type')
        .order('victim_number')
      if (!active) return
      if (error || !Array.isArray(data)) { setLoadState('error'); return }
      const round1 = data.filter((row): row is Unlock => Number.isInteger(row.victim_number)
        && row.victim_number >= 1 && row.victim_number <= 6
        && typeof row.puzzle_type === 'string')
      const { data: round2, error: round2Error } = await supabase.from('team_round2_evidence_unlocks').select('victim_number,slot').order('victim_number')
      if (!active) return
      const round2Rows: Unlock[] = !round2Error && Array.isArray(round2) ? round2.filter(row => Number.isInteger(row.victim_number) && row.victim_number >= 7 && row.victim_number <= 12 && Number.isInteger(row.slot)).map(row => ({ victim_number: row.victim_number, puzzle_type: `round2-slot-${row.slot}`, slot: row.slot })) : []
      const { data: round3, error: round3Error } = await supabase.from('team_round3_evidence_unlocks').select('victim_number,slot').order('victim_number')
      if (!active) return
      const round3Rows: Unlock[] = !round3Error && Array.isArray(round3) ? round3.filter(row => Number.isInteger(row.victim_number) && row.victim_number >= 13 && row.victim_number <= 18 && Number.isInteger(row.slot)).map(row => ({ victim_number: row.victim_number, puzzle_type: `round3-slot-${row.slot}`, slot: row.slot })) : []
      setUnlocks([...round1, ...round2Rows, ...round3Rows])
      setLoadState('ready')
    }
    void loadUnlocks()
    return () => { active = false }
  }, [participantView])
  const unlockedVictims = new Set(unlocks.map(unlock => unlock.victim_number))

  return (
    <section id="evidence" className="investigation-section evidence-section" aria-labelledby="evidence-title">
      <div className="section-heading">
        <p className="eyebrow">CONFIDENTIAL INVESTIGATION RECORD</p>
        <h2 id="evidence-title">THE 18 VICTIMS</h2>
        <p>{participantView ? 'Verified discoveries are retained for this team across sessions.' : 'Every victim has a story. Every connection matters.'}</p>
      </div>

      {participantView && loadState === 'loading' && <p className="round1-save-status" role="status"><LoaderCircle className="round1-spinner" size={15} /> RESTORING TEAM DISCOVERIES</p>}
      {participantView && loadState === 'error' && <p className="round1-feedback" role="alert">Team discoveries could not be restored. Retry after the secure evidence service is available.</p>}
      {participantView && loadState === 'ready' && <p className="round1-save-status" role="status">{unlockedVictims.size} / 18 DEMONSTRATION VICTIM FILES UNLOCKED</p>}

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
            <article className={`victim-card ${participantView && !unlockedVictims.has(victim) ? 'victim-card-sealed' : ''}`} key={victim}>
              <div className="evidence-pin" aria-hidden="true" />
              <div className="case-marker">CASE {String(victim).padStart(2, '0')}</div>
              <div className="victim-photograph" aria-label={participantView && !unlockedVictims.has(victim) ? `Victim ${String(victim).padStart(2, '0')} file sealed` : `Victim ${String(victim).padStart(2, '0')} temporary demonstration placeholder`}>
                <div className="silhouette-head" />
                <div className="silhouette-body" />
                <span>{participantView && !unlockedVictims.has(victim) ? 'FILE SEALED' : participantView ? 'DEMO PLACEHOLDER' : 'UNIDENTIFIED'}</span>
              </div>
              <div className="victim-record">
                <Fingerprint size={16} aria-hidden="true" />
                <span>{participantView && !unlockedVictims.has(victim) ? 'IDENTITY SEALED' : `VICTIM ${String(victim).padStart(2, '0')}`}</span>
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
