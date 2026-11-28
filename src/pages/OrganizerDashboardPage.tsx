import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Activity, AlertTriangle, Check, Clock3, KeyRound, LoaderCircle, Plus, RefreshCw, Shield, Trophy, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './OrganizerDashboardPage.css'

type EventOption = { id: string; name: string; status: string; event_date: string | null }
type RoundRow = { id: string; round_number: number; round_name: string; duration_minutes: number; status: string; starts_at: string | null; ends_at: string | null; remaining_seconds: number }
type Team = { id: string; event_id: string; team_code: string; team_name: string; status: string; created_at: string; team_members?: { participant_name: string; participant_email: string | null }[] }
type Mark = { round_number: number; challenge_key: string; maximum_marks: number }
type Ranking = { team_id: string; team_name: string; team_code: string; round_score: number; cumulative_score: number; last_scored_at: string | null; rank: number; tied: boolean }
type Snapshot = { event: EventOption; rounds: RoundRow[]; team_counts: { registered: number; active: number; eligible: number }; marks: Mark[]; team_progress: { team_id: string; round1: number; round2: number; round3: number }[]; qualifications: { team_id: string; rank: number; team_name: string }[]; published_rounds: number[]; result: { winner_team_id: string; round_four_skipped: boolean } | null }

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomCode(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, value => codeAlphabet[value % codeAlphabet.length]).join('')
}
function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

export default function OrganizerDashboardPage() {
  const location = useLocation()
  const section = location.pathname.split('/')[2] || 'overview'
  const roundPage = section.startsWith('round-') ? Number(section.slice(-1)) : null
  const [events, setEvents] = useState<EventOption[]>([])
  const [eventId, setEventId] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedRound, setSelectedRound] = useState(roundPage ?? 1)
  const [extendMinutes, setExtendMinutes] = useState(5)
  const [markKey, setMarkKey] = useState('')
  const [markValue, setMarkValue] = useState('')
  const [ranking, setRanking] = useState<Ranking[]>([])
  const [qualifiers, setQualifiers] = useState<string[]>([])
  const [qualificationResolution, setQualificationResolution] = useState('')
  const [winnerId, setWinnerId] = useState('')
  const [resolutionNote, setResolutionNote] = useState('')
  const [credentials, setCredentials] = useState<{ teamId: string; accessCode: string; action: string } | null>(null)
  const [teamName, setTeamName] = useState('')
  const [participantNames, setParticipantNames] = useState(['', ''])
  const [participantEmails, setParticipantEmails] = useState(['', ''])
  const [teamFilter, setTeamFilter] = useState('')
  const [competitionEventName, setCompetitionEventName] = useState('')
  const [competitionEventDate, setCompetitionEventDate] = useState('')

  const refresh = useCallback(async (activeEvent = eventId) => {
    if (!activeEvent) return
    const [{ data: dashboard, error: dashboardError }, { data: teamRows, error: teamError }] = await Promise.all([
      supabase.rpc('get_organizer_event_snapshot', { p_event_id: activeEvent }),
      supabase.from('teams').select('id,event_id,team_code,team_name,status,created_at,team_members(participant_name,participant_email)').eq('event_id', activeEvent).order('team_name'),
    ])
    if (dashboardError || teamError) { setError('Event management data could not be loaded.'); return }
    setSnapshot(dashboard as Snapshot)
    setTeams((teamRows ?? []) as Team[])
  }, [eventId])

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error: loadError } = await supabase.rpc('list_competition_events')
      if (!active) return
      if (loadError) { setError('Events could not be loaded for this organizer.'); setLoading(false); return }
      const list = (Array.isArray(data) ? data : []) as EventOption[]
      setEvents(list)
      if (list[0]) setEventId(list[0].id)
      else setLoading(false)
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!eventId) return
    let active = true
    void Promise.resolve().then(() => refresh(eventId)).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [eventId, refresh])

  useEffect(() => {
    if (!eventId || !snapshot?.rounds.some(round => round.status === 'running')) return
    const timer = window.setInterval(() => { void refresh() }, 5000)
    return () => window.clearInterval(timer)
  }, [eventId, refresh, snapshot?.rounds])

  const currentRound = snapshot?.rounds.find(round => round.status === 'running' || round.status === 'paused')
  const displayedTeams = useMemo(() => teams.filter(team => `${team.team_name} ${team.team_code} ${team.team_members?.map(member => member.participant_name).join(' ')}`.toLowerCase().includes(teamFilter.toLowerCase())), [teamFilter, teams])
  const challengeKeys = selectedRound === 1 ? ['classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal'] : selectedRound === 2 ? Array.from({ length: 6 }, (_, i) => `slot:${i + 1}`) : selectedRound === 3 ? ['slot:1', 'slot:2', 'slot:3'] : []

  const operateRound = async (action: string, minutes?: number, roundNumber = selectedRound) => {
    if (!eventId) return
    setBusy(true); setError(''); setNotice('')
    const { error: operationError } = await supabase.rpc('organizer_control_round', { p_event_id: eventId, p_round_number: roundNumber, p_action: action, p_extend_minutes: minutes ?? null })
    if (operationError) setError(operationError.message.includes('marks') ? 'Configure marks for every challenge before starting this round.' : 'The round operation was rejected. Confirm its current state and event readiness.')
    else { setNotice('Round control updated.'); await refresh() }
    setBusy(false)
  }

  const saveDuration = async (event: FormEvent<HTMLFormElement>, roundNumber = selectedRound) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true); setError(''); setNotice('')
    const { error: saveError } = await supabase.rpc('organizer_set_round_duration', { p_event_id: eventId, p_round_number: roundNumber, p_duration_minutes: Number(form.get('duration')) })
    if (saveError) setError('Round duration could not be saved. Durations freeze when a round starts.')
    else { setNotice('Round duration saved.'); await refresh() }
    setBusy(false)
  }

  const saveMark = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!markKey || markValue === '') return
    setBusy(true); setError(''); setNotice('')
    const { error: saveError } = await supabase.rpc('organizer_set_challenge_marks', { p_event_id: eventId, p_round_number: selectedRound, p_challenge_key: markKey, p_maximum_marks: Number(markValue) })
    if (saveError) setError('Challenge marks could not be saved. Marks are frozen after a round starts.')
    else { setNotice('Challenge marks saved and audited.'); await refresh() }
    setBusy(false)
  }

  const createTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const teamCode = `H18-${randomCode(8)}`
    const accessCode = `${randomCode(5)}-${randomCode(5)}-${randomCode(5)}`
    const participants = participantNames.map((participant_name, index) => ({ participant_name: participant_name.trim(), participant_email: participantEmails[index].trim() || null }))
    setBusy(true); setError(''); setNotice('')
    const { data, error: provisioningError } = await supabase.functions.invoke('provision-team', { body: { event_id: eventId, team_code: teamCode, team_name: teamName.trim(), access_code: accessCode, participants } })
    if (provisioningError || !data?.team) setError(data?.error ?? 'Team provisioning did not complete. Verify authorization and retry.')
    else { setCredentials({ teamId: data.team.team_code, accessCode, action: 'created' }); setTeamName(''); setParticipantNames(['', '']); setParticipantEmails(['', '']); setNotice('Team created. Copy the access code now; it is shown only once.'); await refresh() }
    setBusy(false)
  }

  const createCompetitionEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true); setError(''); setNotice('')
    const { data, error: createError } = await supabase.rpc('organizer_create_competition_event', {
      p_name: competitionEventName.trim(), p_event_date: competitionEventDate || null,
      p_round2_minutes: Number(form.get('round2Duration')), p_round3_minutes: Number(form.get('round3Duration')),
    })
    if (createError || typeof data !== 'string') setError('A clean competition event could not be created. Check its name and round durations.')
    else {
      const { data: rows } = await supabase.rpc('list_competition_events')
      setEvents((Array.isArray(rows) ? rows : []) as EventOption[]); setEventId(data); setCompetitionEventName(''); setCompetitionEventDate('')
      setNotice('Clean competition setup created with no teams and blank Round 2/3 question slots. Configure questions, marks and durations before authorizing a round.')
    }
    setBusy(false)
  }

  const changeTeamStatus = async (team: Team, status: string) => {
    setBusy(true); setError(''); setNotice('')
    const { error: updateError } = await supabase.rpc('organizer_set_team_status', { p_team_id: team.id, p_status: status })
    if (updateError) setError('Team status could not be changed.')
    else { setNotice(`Team ${team.team_code} status updated.`); await refresh() }
    setBusy(false)
  }

  const resetAccessCode = async (team: Team) => {
    const accessCode = `${randomCode(5)}-${randomCode(5)}-${randomCode(5)}`
    setBusy(true); setError(''); setNotice('')
    const { error: resetError } = await supabase.functions.invoke('reset-team-access-code', { body: { team_id: team.id, access_code: accessCode } })
    if (resetError) setError('Access code reset failed. The previous access code remains in effect.')
    else { setCredentials({ teamId: team.team_code, accessCode, action: 'reset' }); setNotice('Access code reset and audited. Copy it now; it is shown only once.') }
    setBusy(false)
  }

  const loadRanking = async () => {
    setBusy(true); setError('')
    const { data, error: rankError } = await supabase.rpc('organizer_preview_leaderboard', { p_event_id: eventId, p_round_number: selectedRound })
    if (rankError) setError('Organizer result preview could not be loaded.')
    else setRanking((data ?? []) as Ranking[])
    setBusy(false)
  }

  const publishRanking = async () => {
    setBusy(true); setError('')
    const { error: publishError } = await supabase.rpc('organizer_publish_leaderboard', { p_event_id: eventId, p_round_number: selectedRound })
    if (publishError) setError('Publish is available only after the selected round has ended.')
    else { setNotice('Leaderboard published to participants.'); await refresh() }
    setBusy(false)
  }

  const confirmFinalists = async () => {
    setBusy(true); setError('')
    const { error: qualifyError } = await supabase.rpc('organizer_confirm_finalists', { p_event_id: eventId, p_team_ids: qualifiers, p_resolution_note: qualificationResolution })
    if (qualifyError) setError('Finalist confirmation failed. Select exactly six teams from the top-six cutoff group, including ties.')
    else { setNotice('Six finalists confirmed.'); await refresh() }
    setBusy(false)
  }

  const finishEvent = async () => {
    if (!winnerId) return
    setBusy(true); setError('')
    const { error: finishError } = await supabase.rpc('organizer_declare_winner', { p_event_id: eventId, p_team_id: winnerId, p_resolution_note: resolutionNote })
    if (finishError) setError('Winner declaration failed. A tied winner requires a recorded organizer resolution.')
    else { setNotice('Event completed and winner recorded.'); await refresh() }
    setBusy(false)
  }

  if (loading) return <main className="organizer-dashboard"><p className="dashboard-loading"><LoaderCircle className="dashboard-spin"/> RESTORING EVENT CONTROL</p></main>
  return <main className="organizer-dashboard">
    <header className="dashboard-header"><Link to="/" className="wordmark">THE HUNT <span>FOR 18</span></Link><div><p className="eyebrow">CENTRAL EVENT CONTROL</p><h1>ORGANIZER <span>CONSOLE</span></h1></div><Link to="/organizer/teams">TEAM REGISTRATION</Link><Link to="/organizer/scoreboard">SCOREBOARD</Link><Link to="/organizer/victims">VICTIM FILES</Link></header>
    <section className="dashboard-overview"><div className="dashboard-event"><label>EVENT<select value={eventId} onChange={event => { setEventId(event.target.value); setRanking([]); setQualifiers([]); setQualificationResolution('') }}>{events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label><span className={`event-state ${snapshot?.event.status}`}>{snapshot?.event.status?.toUpperCase()}</span></div><div className="dashboard-metrics"><article><Users/><strong>{snapshot?.team_counts.registered ?? 0} / 25</strong><span>REGISTERED TEAMS</span></article><article><Activity/><strong>{snapshot?.team_counts.active ?? 0}</strong><span>ACTIVE TEAMS</span></article><article><Clock3/><strong>{currentRound ? `ROUND 0${currentRound.round_number}` : 'NO ACTIVE ROUND'}</strong><span>{currentRound ? `${currentRound.status.toUpperCase()} · ${formatTime(currentRound.remaining_seconds)}` : 'ORGANIZER CONTROLLED'}</span></article><article><Shield/><strong>{snapshot?.team_counts.eligible ?? 0}</strong><span>ELIGIBLE TEAMS</span></article></div></section>
    {section === 'overview' && events.length === 0 && <section className="dashboard-panel clean-event-setup"><div className="dashboard-title"><div><p className="eyebrow">NEW EVENT // EMPTY COMPETITION DATA</p><h2>CLEAN COMPETITION SETUP</h2></div><span>Round 2/3 slots start blank; choose their durations before creation.</span></div><form onSubmit={event => void createCompetitionEvent(event)}><label>EVENT NAME<input required maxLength={200} value={competitionEventName} onChange={event => setCompetitionEventName(event.target.value)} placeholder="Competition event name"/></label><label>EVENT DATE<input type="date" value={competitionEventDate} onChange={event => setCompetitionEventDate(event.target.value)}/></label><label>ROUND 2 DURATION (MINUTES)<input required name="round2Duration" type="number" min="1" max="240"/></label><label>ROUND 3 DURATION (MINUTES)<input required name="round3Duration" type="number" min="1" max="240"/></label><button className="hunt-button" disabled={busy}>CREATE CLEAN EVENT</button></form></section>}
    {(error || notice) && <p className={error ? 'dashboard-alert' : 'dashboard-notice'} role={error ? 'alert' : 'status'}>{error || notice}</p>}
    <nav className="dashboard-tabs" aria-label="Organizer controls"><Link to="/organizer/teams">TEAM REGISTRATION</Link><Link to="/organizer/scoreboard">SCOREBOARD</Link><Link to="/organizer/victims">VICTIM FILES</Link><Link to="/organizer/round-1">ROUND 1</Link><Link to="/organizer/round-2">ROUND 2</Link><Link to="/organizer/round-3">ROUND 3</Link></nav>

    <section id="teams" hidden={section !== 'teams'} className="dashboard-panel"><div className="dashboard-title"><div><p className="eyebrow">REGISTRATION // SECURE ACCESS</p><h2>TEAM MANAGEMENT</h2></div><span>Capacity: 25 teams · 2 participants each</span></div>
      <form className="dashboard-team-form" onSubmit={event => void createTeam(event)}><label>TEAM NAME<input required maxLength={200} value={teamName} onChange={event => setTeamName(event.target.value)} placeholder="Enter the registered team name"/></label>{participantNames.map((name, index) => <fieldset key={index}><legend>PARTICIPANT {index + 1}</legend><label>NAME<input required maxLength={200} value={name} onChange={event => setParticipantNames(current => current.map((item, i) => i === index ? event.target.value : item))}/></label><label>EMAIL (OPTIONAL)<input type="email" value={participantEmails[index]} onChange={event => setParticipantEmails(current => current.map((item, i) => i === index ? event.target.value : item))}/></label></fieldset>)}<button className="hunt-button" disabled={busy}><Plus size={16}/> {busy ? 'PROVISIONING' : 'CREATE TEAM & ACCESS'}</button></form>
      {credentials && <div className="team-credential-reveal" role="status"><strong>{credentials.action === 'created' ? 'TEAM ACCESS CREATED' : 'ACCESS CODE RESET'}</strong><p>Team ID: <code>{credentials.teamId}</code></p><p>Access code: <code>{credentials.accessCode}</code></p><small>This access code is shown once. Store it securely and share it directly with the team.</small><button type="button" onClick={() => setCredentials(null)}>CLOSE</button></div>}
      <div className="team-table-tools"><h3>REGISTERED TEAMS <span>{displayedTeams.length}</span></h3><input value={teamFilter} onChange={event => setTeamFilter(event.target.value)} placeholder="Search team or participant" aria-label="Search teams"/></div>
      <div className="team-table-wrap"><table className="team-table"><thead><tr><th>TEAM ID</th><th>TEAM</th><th>PARTICIPANTS</th><th>ACCESS</th><th>ROUND PROGRESS</th><th>CONTROLS</th></tr></thead><tbody>{displayedTeams.map(team => { const progress = snapshot?.team_progress.find(row => row.team_id === team.id); return <tr key={team.id}><td><code>{team.team_code}</code></td><td>{team.team_name}</td><td>{team.team_members?.map(member => member.participant_name).join(' · ') || 'Not recorded'}</td><td><span className={`team-status ${team.status}`}>{team.status}</span></td><td>R1 {progress?.round1 ?? 0}/6 · R2 {progress?.round2 ?? 0}/6 · R3 {progress?.round3 ?? 0}/3</td><td className="team-controls"><button disabled={busy} onClick={() => void resetAccessCode(team)}><KeyRound size={14}/> RESET CODE</button><button disabled={busy} onClick={() => void changeTeamStatus(team, team.status === 'suspended' ? 'approved' : 'suspended')}>{team.status === 'suspended' ? 'REACTIVATE' : 'SUSPEND'}</button></td></tr> })}{displayedTeams.length === 0 && <tr><td colSpan={6}>No registered teams match this search.</td></tr>}</tbody></table></div>
    </section>

    <section id="rounds" hidden={!roundPage} className="dashboard-panel"><div className="dashboard-title"><div><p className="eyebrow">ORGANIZER CONTROLLED // SERVER CLOCK</p><h2>{roundPage ? `ROUND ${roundPage} MANAGEMENT` : 'ROUND MANAGEMENT'}</h2></div><span>Only one preliminary round can run at a time.</span></div>
      <div className="round-cards">{snapshot?.rounds.filter(round => !roundPage || round.round_number === roundPage).map(round => <article className={`round-control-card ${round.status}`} key={round.id}><div><span className="round-number">ROUND {String(round.round_number).padStart(2, '0')}</span><span className={`round-state ${round.status}`}>{round.status.toUpperCase()}</span></div><h3>{round.round_name}</h3><form onSubmit={event => void saveDuration(event, round.round_number)}><label>DURATION <input name="duration" type="number" min="1" max="240" defaultValue={round.duration_minutes} disabled={round.status !== 'locked' && round.status !== 'draft' && round.status !== 'ready'}/><small>minutes</small></label><button disabled={busy || !['locked','draft','ready'].includes(round.status)}>SAVE DURATION</button></form><strong className="round-time">{formatTime(round.remaining_seconds)}</strong><div className="round-actions">{round.status === 'locked' || round.status === 'draft' ? <button disabled={busy} onClick={() => { setSelectedRound(round.round_number); void supabase.rpc('organizer_control_round', { p_event_id: eventId, p_round_number: round.round_number, p_action: 'authorize' }).then(({ error: e }) => e ? setError('Round authorization failed. Confirm Round 3 finalist requirements.') : refresh()) }}>AUTHORIZE ACCESS</button> : null}{round.status === 'ready' && round.round_number !== 4 && <button disabled={busy} onClick={() => { setSelectedRound(round.round_number); void operateRound('start', undefined, round.round_number) }}>START ROUND</button>}{round.status === 'running' && <><button disabled={busy} onClick={() => { setSelectedRound(round.round_number); void operateRound('pause', undefined, round.round_number) }}>PAUSE</button><button disabled={busy} onClick={() => { setSelectedRound(round.round_number); void operateRound('extend', extendMinutes, round.round_number) }}>EXTEND</button><button disabled={busy} onClick={() => { setSelectedRound(round.round_number); void operateRound('end', undefined, round.round_number) }}>END ROUND</button></>}{round.status === 'paused' && <><button disabled={busy} onClick={() => { setSelectedRound(round.round_number); void operateRound('resume', undefined, round.round_number) }}>RESUME</button><button disabled={busy} onClick={() => { setSelectedRound(round.round_number); void operateRound('extend', extendMinutes, round.round_number) }}>EXTEND</button><button disabled={busy} onClick={() => { setSelectedRound(round.round_number); void operateRound('end', undefined, round.round_number) }}>END ROUND</button></>}{round.round_number === 4 && ['locked','ready'].includes(round.status) && <button disabled={busy} onClick={() => void operateRound('skip_round_4', undefined, 4)}>SKIP OPTIONAL ROUND</button>}</div></article>)}</div><label className="extend-setting">EXTENSION LENGTH <input type="number" min="1" max="120" value={extendMinutes} onChange={event => setExtendMinutes(Number(event.target.value))}/> minutes</label>
    </section>

    <section id="scoring" hidden={!roundPage} className="dashboard-panel"><div className="dashboard-title"><div><p className="eyebrow">CONFIGURE BEFORE ROUND START // AUDITED</p><h2>CHALLENGE MARKS</h2></div><span>Incomplete work scores zero; wrong submissions carry no penalty.</span></div><div className="scoring-editor"><label>ROUND<select value={selectedRound} onChange={event => { setSelectedRound(Number(event.target.value)); setMarkKey(''); setMarkValue('') }}><option value="1">Round 1</option><option value="2">Round 2</option><option value="3">Round 3</option></select></label><label>CHALLENGE<select value={markKey} onChange={event => { const key = event.target.value; setMarkKey(key); const value = snapshot?.marks.find(mark => mark.round_number === selectedRound && mark.challenge_key === key); setMarkValue(value ? String(value.maximum_marks) : '') }}><option value="">Select challenge</option>{challengeKeys.map(key => <option key={key} value={key}>{key.replace('slot:', 'Challenge ')}</option>)}</select></label><form onSubmit={event => void saveMark(event)}><label>MAXIMUM MARKS<input type="number" min="0" step="0.01" required value={markValue} onChange={event => setMarkValue(event.target.value)} disabled={!markKey || snapshot?.rounds.find(row => row.round_number === selectedRound)?.status !== 'locked' && snapshot?.rounds.find(row => row.round_number === selectedRound)?.status !== 'ready'}/></label><button className="hunt-button" disabled={busy || !markKey}>SAVE MARKS</button></form></div><p className="dashboard-note"><AlertTriangle size={15}/> Round 3 hint deductions are taken from the completed challenge score and cannot reduce it below zero. Phrase and final-code submissions do not add marks.</p></section>

    <section id="results" hidden={section !== 'scoreboard'} className="dashboard-panel"><div className="dashboard-title"><div><p className="eyebrow">RELEASED ONLY AFTER ROUND CLOSE</p><h2>LEADERBOARD & FINALISTS</h2></div><Trophy/></div><div className="results-controls"><label>ROUND RESULTS<select value={selectedRound} onChange={event => setSelectedRound(Number(event.target.value))}><option value="1">Round 1</option><option value="2">Round 2</option><option value="3">Round 3</option></select></label><button disabled={busy} onClick={() => void loadRanking()}>PREVIEW RESULTS</button><button className="hunt-button" disabled={busy || snapshot?.published_rounds.includes(selectedRound) || snapshot?.rounds.find(round => round.round_number === selectedRound)?.status !== 'ended'} onClick={() => void publishRanking()}>{snapshot?.published_rounds.includes(selectedRound) ? 'RESULTS PUBLISHED' : 'PUBLISH RESULTS'}</button></div>{ranking.length > 0 && <div className="leaderboard-wrap"><p className="organizer-preview-label">ORGANIZER PREVIEW · NOT VISIBLE TO TEAMS UNTIL PUBLISHED</p><table className="team-table"><thead><tr><th>RANK</th><th>TEAM</th><th>ROUND SCORE</th><th>CUMULATIVE</th><th>LAST COMPLETION</th></tr></thead><tbody>{ranking.map(row => <tr key={row.team_id}><td>{row.rank}{row.tied ? ' · TIE' : ''}</td><td>{row.team_name}</td><td>{row.round_score}</td><td>{row.cumulative_score}</td><td>{row.last_scored_at ? new Date(row.last_scored_at).toLocaleTimeString() : '—'}</td></tr>)}</tbody></table></div>}
      {selectedRound === 3 && ranking.length > 0 && <div className="qualifier-picker"><h3>CONFIRM SIX FINALISTS</h3><p>Ties crossing the sixth rank remain eligible for organizer review; select exactly six teams.</p><div>{ranking.filter(row => row.rank <= 6).map(row => <label key={row.team_id}><input type="checkbox" checked={qualifiers.includes(row.team_id)} onChange={event => setQualifiers(current => event.target.checked ? [...current, row.team_id] : current.filter(id => id !== row.team_id))}/>{row.team_name} · rank {row.rank}{row.tied ? ' · tied' : ''} · {row.cumulative_score} marks</label>)}</div>{ranking.filter(row => row.rank <= 6).length > 6 && <label>REQUIRED TIE RESOLUTION NOTE<textarea value={qualificationResolution} onChange={event => setQualificationResolution(event.target.value)} minLength={10} maxLength={2000}/></label>}<button className="hunt-button" disabled={busy || qualifiers.length !== 6 || (ranking.filter(row => row.rank <= 6).length > 6 && qualificationResolution.trim().length < 10)} onClick={() => void confirmFinalists()}>CONFIRM SIX FINALISTS</button></div>}
      {snapshot?.qualifications?.length === 6 && <div className="winner-controls"><h3>ROUND 4 OPTIONAL — DECLARE WINNER</h3><p>Skip the locked optional round and use cumulative Rounds 1–3 results.</p><label>WINNER<select value={winnerId} onChange={event => setWinnerId(event.target.value)}><option value="">Select confirmed finalist</option>{snapshot.qualifications.map(team => <option value={team.team_id} key={team.team_id}>{team.team_name}</option>)}</select></label><label>ORGANIZER TIE RESOLUTION NOTE (IF NEEDED)<textarea value={resolutionNote} onChange={event => setResolutionNote(event.target.value)} maxLength={2000}/></label><button className="hunt-button" disabled={busy || !winnerId} onClick={() => void finishEvent()}>DECLARE WINNER</button></div>}{snapshot?.result && <p className="dashboard-notice"><Check size={16}/> Event completed. Winner declared. Round 4 was skipped.</p>}
    </section>
    <footer className="dashboard-footer"><button onClick={() => void refresh()}><RefreshCw size={14}/> REFRESH CONTROL ROOM</button><span>Operations and mark changes are server-authorized and audited.</span></footer>
  </main>
}
