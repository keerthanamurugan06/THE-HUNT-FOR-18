import { useState } from 'react'
import { ArrowRight, LogOut, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTeamAuth } from '../context/team-auth-context'

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
      </section>
    </main>
  )
}
