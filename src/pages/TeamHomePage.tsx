import { useEffect, useState } from 'react'
import { ArrowRight, LogOut, ShieldCheck, Trophy } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTeamAuth } from '../context/team-auth-context'
import { EvidenceBoard } from '../components/EvidenceBoard'
import { supabase } from '../lib/supabase'

type Result = { team_id: string; team_name: string; round_score: number; cumulative_score: number; rank: number; tied: boolean }

function PublishedResults() {
  const [boards, setBoards] = useState<{ round: number; rows: Result[] }[]>([])
  useEffect(() => {
    let active = true
    void Promise.all([1, 2, 3].map(async round => {
      const { data } = await supabase.rpc('load_published_leaderboard', { p_round_number: round })
      return data ? { round, rows: data as Result[] } : null
    })).then(results => { if (active) setBoards(results.filter((value): value is { round: number; rows: Result[] } => value !== null)) })
    return () => { active = false }
  }, [])
  if (!boards.length) return null
  return <section className="published-results"><p className="eyebrow"><Trophy size={14}/> RELEASED RESULTS</p>{boards.map(board => <article key={board.round}><h2>ROUND {String(board.round).padStart(2, '0')} LEADERBOARD</h2><ol>{board.rows.map(team => <li key={team.team_id}><span>{team.rank}{team.tied ? ' · TIE' : ''}</span><strong>{team.team_name}</strong><small>{team.round_score} round · {team.cumulative_score} cumulative</small></li>)}</ol></article>)}</section>
}

export default function TeamHomePage() {
  const { team, signOut } = useTeamAuth()
  const [error, setError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()

  const handleSignOut = async () => {
    setSigningOut(true)
    setError('')
    try {
      await signOut()
      navigate('/', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Sign-out failed. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <main className="team-home-page">
      <div className="hazard-stripe" aria-hidden="true" />
      <header className="team-home-header">
        <Link to="/" className="wordmark">THE HUNT <span>FOR 18</span></Link>
        <button className="team-logout" onClick={() => void handleSignOut()} disabled={signingOut}>
          <LogOut size={16} /> {signingOut ? 'SIGNING OUT' : 'SIGN OUT'}
        </button>
      </header>

      <section className="team-home-content">
        <p className="eyebrow"><ShieldCheck size={15} /> SECURE TEAM SESSION</p>
        <h1>WELCOME, <span>{team?.team_name ?? 'INVESTIGATORS'}</span></h1>
        <p className="team-home-id">TEAM ID // {team?.team_code}</p>
        <p className="team-home-copy">Your team identity has been verified. Continue to the active investigation files.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}

        <Link to="/round-1" className="hunt-button team-round-link">
          OPEN ROUND 01 <ArrowRight size={18} />
        </Link>
        <Link to="/round-2" className="hunt-button team-round-link">
          OPEN ROUND 02 <ArrowRight size={18} />
        </Link>
        <Link to="/round-3" className="hunt-button team-round-link">
          OPEN ROUND 03 <ArrowRight size={18} />
        </Link>
      </section>
      <EvidenceBoard participantView />
      <PublishedResults />
    </main>
  )
}
