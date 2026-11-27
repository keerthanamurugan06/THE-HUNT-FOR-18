import { useState, type FormEvent } from 'react'
import { ArrowLeft, Fingerprint, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTeamAuth } from '../context/team-auth-context'

type LocationState = { from?: { pathname?: string } }

export default function TeamLoginPage() {
  const [teamCode, setTeamCode] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { session, team, sessionLoading, teamLoading, signInWithTeamCode } = useTeamAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const requestedPath = (location.state as LocationState | null)?.from?.pathname
  const safeReturnPath = requestedPath === '/round-1' || requestedPath === '/round-2' || requestedPath === '/team'
    ? requestedPath
    : '/team'

  if (sessionLoading || (session && teamLoading)) {
    return (
      <main className="auth-state-page" role="status" aria-live="polite">
        <div className="auth-state-card">
          <span className="auth-state-mark" aria-hidden="true" />
          <p className="eyebrow">SECURE CHANNEL</p>
          <h1>RESTORING TEAM SESSION</h1>
        </div>
      </main>
    )
  }

  if (session && team && ['approved', 'active'].includes(team.status)) {
    return <Navigate to="/team" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)

    try {
      await signInWithTeamCode(teamCode, accessCode)
      navigate(safeReturnPath, { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign-in failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="team-login-page">
      <div className="hazard-stripe" aria-hidden="true" />
      <div className="login-grid" aria-hidden="true" />

      <header className="login-header">
        <Link to="/" className="wordmark" aria-label="Back to THE HUNT FOR 18 home">
          THE HUNT <span>FOR 18</span>
        </Link>
        <span className="login-classification"><ShieldCheck size={15} /> TEAM CREDENTIALS ONLY</span>
      </header>

      <section className="team-login-card" aria-labelledby="login-heading">
        <div className="login-card-topline"><span>CASE 018</span><span>IDENTITY CHECK // 01</span></div>
        <div className="login-emblem"><Fingerprint size={28} aria-hidden="true" /></div>
        <p className="eyebrow">RESTRICTED INVESTIGATION ACCESS</p>
        <h1 id="login-heading">TEAM <span>LOGIN</span></h1>
        <p className="login-intro">Enter the credentials issued to your team to resume the investigation.</p>

        <form className="team-login-form" onSubmit={handleSubmit}>
          <label htmlFor="team-code">TEAM ID</label>
          <input
            id="team-code"
            name="teamCode"
            autoComplete="username"
            value={teamCode}
            onChange={(event) => setTeamCode(event.target.value)}
            placeholder="Enter your team ID"
            required
            maxLength={50}
            disabled={submitting}
          />

          <label htmlFor="access-code">ACCESS CODE</label>
          <input
            id="access-code"
            name="accessCode"
            type="password"
            autoComplete="current-password"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            placeholder="Enter your access code"
            required
            disabled={submitting}
          />

          {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}

          <button className="hunt-button login-submit" type="submit" disabled={submitting}>
            {submitting ? <><LoaderCircle className="login-spinner" size={17} /> VERIFYING CREDENTIALS</> : <>ENTER INVESTIGATION</>}
          </button>
        </form>

        <p className="login-security-note">Your session is protected. Team progress is restricted to the authenticated team.</p>
        <Link to="/" className="login-back-link"><ArrowLeft size={15} /> BACK TO CASE FILES</Link>
      </section>

      <footer className="login-footer">THE HUNT FOR 18 // AUTHORIZED TEAMS ONLY</footer>
    </main>
  )
}
