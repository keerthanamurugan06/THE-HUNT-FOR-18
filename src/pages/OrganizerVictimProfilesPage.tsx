import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './OrganizerVictimProfilesPage.css'

type EventRow = { id: string; name: string }
type Victim = { victim_number: number; challenge_key: string; full_name: string; photograph_path: string; description: string; investigation_clue: string; round_status: string; photo_url?: string }

export default function OrganizerVictimProfilesPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [eventId, setEventId] = useState('')
  const [victims, setVictims] = useState<Victim[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [draft, setDraft] = useState<Victim | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    void supabase.rpc('list_competition_events').then(({ data, error: loadError }) => {
      if (!active) return
      if (loadError) setError('Organizer events could not be loaded.')
      else { const rows = (Array.isArray(data) ? data : []) as EventRow[]; setEvents(rows); if (rows[0]) setEventId(rows[0].id) }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!eventId) return
    let active = true
    void (async () => {
      setError(''); setNotice('')
      const { data, error: loadError } = await supabase.rpc('organizer_get_victim_profiles', { p_event_id: eventId })
      if (!active) return
      if (loadError || !Array.isArray(data)) { setError('Victim profiles could not be loaded.'); return }
      const rows = await Promise.all((data as Victim[]).map(async row => {
        const { data: signed } = await supabase.storage.from('victim-photos').createSignedUrl(row.photograph_path, 3600)
        return { ...row, photo_url: signed?.signedUrl }
      }))
      if (active) { setVictims(rows); setSelected(rows[0]?.victim_number ?? null); setDraft(rows[0] ?? null); setPhoto(null) }
    })()
    return () => { active = false }
  }, [eventId])

  const choose = (victimNumber: number) => {
    const next = victims.find(row => row.victim_number === victimNumber) ?? null
    setSelected(victimNumber); setDraft(next); setPhoto(null)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft || !eventId) return
    setBusy(true); setError(''); setNotice('')
    let path = draft.photograph_path
    if (photo) {
      path = `custom/${eventId}/victim-${String(draft.victim_number).padStart(2, '0')}.png`
      const { error: uploadError } = await supabase.storage.from('victim-photos').upload(path, photo, { upsert: true, contentType: 'image/png' })
      if (uploadError) { setError('The fictional portrait could not be uploaded.'); setBusy(false); return }
    }
    const { error: saveError } = await supabase.rpc('organizer_save_victim_profile', {
      p_event_id: eventId, p_victim_number: draft.victim_number, p_full_name: draft.full_name,
      p_photograph_path: path, p_description: draft.description, p_investigation_clue: draft.investigation_clue,
    })
    if (saveError) { setError(saveError.message.includes('locked') ? 'This victim file is frozen because its round has started.' : 'Victim details could not be saved. Check each field and try again.'); setBusy(false); return }
    const { data: signed } = await supabase.storage.from('victim-photos').createSignedUrl(path, 3600)
    const updated = { ...draft, photograph_path: path, photo_url: signed?.signedUrl }
    setVictims(current => current.map(row => row.victim_number === updated.victim_number ? updated : row))
    setDraft(updated); setPhoto(null); setNotice('Victim case file saved. It remains sealed for participants until its challenge is completed.'); setBusy(false)
  }

  const active = draft && !['running', 'paused', 'ended'].includes(draft.round_status)
  return <main className="victim-manager">
    <header className="victim-manager-header"><Link to="/organizer" className="wordmark">THE HUNT <span>FOR 18</span></Link><div><p className="eyebrow">RESTRICTED EVIDENCE CONTROL</p><h1>VICTIM <span>CASE FILES</span></h1></div><Link to="/organizer/teams">TEAM REGISTRATION</Link></header>
    <p className="victim-manager-intro">Edit names, fictional portraits, descriptions and investigation clues before the associated round starts. Participant access is unlocked by verified challenge completion.</p>
    {error && <p className="dashboard-alert" role="alert">{error}</p>}{notice && <p className="dashboard-notice" role="status">{notice}</p>}
    <label className="victim-event-select">EVENT<select value={eventId} onChange={event => setEventId(event.target.value)}>{events.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
    {!victims.length ? <p className="victim-empty">No case files are initialized for this event. The approved setup migration creates all 18 profiles.</p> : <div className="victim-manager-layout">
      <nav className="victim-picker" aria-label="Victim profiles">{victims.map(row => <button type="button" key={row.victim_number} className={selected === row.victim_number ? 'selected' : ''} onClick={() => choose(row.victim_number)}>VICTIM {String(row.victim_number).padStart(2, '0')}<small>ROUND {row.victim_number <= 6 ? '1' : row.victim_number <= 12 ? '2' : '3'} · {row.round_status.toUpperCase()}</small></button>)}</nav>
      {draft && <form className="victim-editor" onSubmit={event => void save(event)}><h2>VICTIM {String(draft.victim_number).padStart(2, '0')} <small>· CHALLENGE {draft.challenge_key}</small></h2>
        {draft.photo_url && <img className="victim-preview" src={draft.photo_url} alt={`Fictional portrait for victim ${draft.victim_number}`} />}
        <label>FULL NAME<input value={draft.full_name} maxLength={100} required disabled={!active || busy} onChange={event => setDraft({ ...draft, full_name: event.target.value })}/></label>
        <label>FICTIONAL PORTRAIT (PNG, MAX 5 MB)<input type="file" accept="image/png" disabled={!active || busy} onChange={event => { const file = event.target.files?.[0] ?? null; setPhoto(file && file.type === 'image/png' && file.size <= 5 * 1024 * 1024 ? file : null); if (file && (file.type !== 'image/png' || file.size > 5 * 1024 * 1024)) setError('Choose a PNG image no larger than 5 MB.') }}/>{photo && <small>{photo.name}</small>}</label>
        <label>CASE DESCRIPTION<textarea value={draft.description} maxLength={1500} required disabled={!active || busy} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label>
        <label>INVESTIGATION CLUE<textarea value={draft.investigation_clue} maxLength={1000} required disabled={!active || busy} onChange={event => setDraft({ ...draft, investigation_clue: event.target.value })}/></label>
        <p className="victim-lock-note">{active ? 'This profile is editable until its round starts.' : 'Profile locked after round activation.'}</p>
        <button className="hunt-button" disabled={!active || busy}><Save size={15}/>{busy ? 'SAVING CASE FILE' : 'SAVE CASE FILE'}</button>
      </form>}
    </div>}
    <footer><Link to="/organizer/round-1">ROUND 1</Link><Link to="/organizer/round-2">ROUND 2</Link><Link to="/organizer/round-3">ROUND 3</Link></footer>
  </main>
}
