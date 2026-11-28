import { useEffect, useState } from 'react'
import { Fingerprint, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Casefile = { victim_number: number; unlocked: boolean; full_name: string | null; photograph_path: string | null; description: string | null; investigation_clue: string | null; photo_url?: string | null }

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
  const [casefiles, setCasefiles] = useState<Casefile[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>(participantView ? 'loading' : 'idle')

  useEffect(() => {
    if (!participantView) return
    let active = true
    async function loadUnlocks() {
      setLoadState('loading')
      const { data, error } = await supabase.rpc('load_victim_casefiles')
      if (!active) return
      if (error || !Array.isArray(data)) { setLoadState('error'); return }
      const loaded = await Promise.all((data as Casefile[]).map(async profile => {
        if (!profile.unlocked || !profile.photograph_path) return { ...profile, photo_url: null }
        const { data: signed } = await supabase.storage.from('victim-photos').createSignedUrl(profile.photograph_path, 3600)
        return { ...profile, photo_url: signed?.signedUrl ?? null }
      }))
      if (!active) return
      setCasefiles(loaded)
      setLoadState('ready')
    }
    void loadUnlocks()
    return () => { active = false }
  }, [participantView])
  const profileByNumber = new Map(casefiles.map(profile => [profile.victim_number, profile]))
  const unlockedVictims = new Set(casefiles.filter(profile => profile.unlocked).map(profile => profile.victim_number))

  return (
    <section id="evidence" className="investigation-section evidence-section" aria-labelledby="evidence-title">
      <div className="section-heading">
        <p className="eyebrow">CONFIDENTIAL INVESTIGATION RECORD</p>
        <h2 id="evidence-title">THE 18 VICTIMS</h2>
        <p>{participantView ? 'Verified discoveries are retained for this team across sessions.' : 'Every victim has a story. Every connection matters.'}</p>
      </div>

      {participantView && loadState === 'loading' && <p className="round1-save-status" role="status"><LoaderCircle className="round1-spinner" size={15} /> RESTORING TEAM DISCOVERIES</p>}
      {participantView && loadState === 'error' && <p className="round1-feedback" role="alert">Team discoveries could not be restored. Retry after the secure evidence service is available.</p>}
      {participantView && loadState === 'ready' && <p className="round1-save-status" role="status">{unlockedVictims.size} / 18 VICTIM FILES UNLOCKED</p>}

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
              <div className="victim-photograph" aria-label={participantView && !unlockedVictims.has(victim) ? `Victim ${String(victim).padStart(2, '0')} file sealed` : `Victim ${String(victim).padStart(2, '0')} profile`} style={participantView && profileByNumber.get(victim)?.photo_url ? { backgroundImage: `url("${profileByNumber.get(victim)?.photo_url}")` } : undefined}>
                {!participantView || !unlockedVictims.has(victim) ? <><div className="silhouette-head" /><div className="silhouette-body" /><span>{participantView ? 'FILE SEALED' : 'RESTRICTED FILE'}</span></> : <span className="victim-photo-name">{profileByNumber.get(victim)?.full_name}</span>}
              </div>
              <div className="victim-record">
                <Fingerprint size={16} aria-hidden="true" />
                <span>{participantView && !unlockedVictims.has(victim) ? 'IDENTITY SEALED' : profileByNumber.get(victim)?.full_name ?? `VICTIM ${String(victim).padStart(2, '0')}`}</span>
              </div>
              {participantView && unlockedVictims.has(victim) && <div className="victim-casefile"><p>{profileByNumber.get(victim)?.description}</p><small>{profileByNumber.get(victim)?.investigation_clue}</small></div>}
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
