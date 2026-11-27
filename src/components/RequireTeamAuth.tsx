import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useTeamAuth } from '../context/team-auth-context'

function AuthLoading() {
  return (
    <main className="auth-state-page" role="status" aria-live="polite">
      <div className="auth-state-card">
        <span className="auth-state-mark" aria-hidden="true" />
        <p className="eyebrow">SECURE CHANNEL</p>
        <h1>VERIFYING TEAM ACCESS</h1>
        <p>Restoring your secure investigation session...</p>
      </div>
    </main>
  )
}

export default function RequireTeamAuth() {
  const { session, team, sessionLoading, teamLoading, teamError, refreshTeam, signOut } = useTeamAuth()
  const location = useLocation()
  const [actionError, setActionError] = useState('')

  if (sessionLoading || (session && teamLoading)) return <AuthLoading />
  if (!session) {
    return <Navigate to="/team-login" replace state={{ from: location }} />
  }

  if (teamError) {
    return (
      <main className="auth-state-page">
        <div className="auth-state-card">
          <p className="eyebrow">SESSION CHECK INTERRUPTED</p>
          <h1>TEAM ACCESS COULD NOT BE VERIFIED</h1>
          <p>{teamError}</p>
          {actionError && <p className="auth-error" role="alert">{actionError}</p>}
          <button className="hunt-button modal-button" onClick={() => void refreshTeam()}>
            RETRY VERIFICATION
          </button>
          <button
            className="auth-secondary-button"
            onClick={() => void signOut().catch((error: Error) => setActionError(error.message))}
          >
            SIGN OUT
          </button>
        </div>
      </main>
    )
  }

  if (!team || !['approved', 'active'].includes(team.status)) {
    return (
      <main className="auth-state-page">
        <div className="auth-state-card">
          <p className="eyebrow">ACCESS RESTRICTED</p>
          <h1>TEAM CLEARANCE REQUIRED</h1>
          <p>This account is not linked to an approved team with event access.</p>
          {actionError && <p className="auth-error" role="alert">{actionError}</p>}
          <Link className="hunt-button modal-button" to="/">RETURN TO CASE FILES</Link>
          <button
            className="auth-secondary-button"
            onClick={() => void signOut().catch((error: Error) => setActionError(error.message))}
          >
            SIGN OUT
          </button>
        </div>
      </main>
    )
  }

  return <Outlet />
}
