import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function organizerSignInMessage(error: { status?: number; code?: string }) {
  if (error.code === 'invalid_credentials' || error.status === 400) {
    return 'Email or password was not recognized. Check the copied values and remove any extra spaces from the email.'
  }
  if (error.code === 'email_not_confirmed') {
    return 'This organizer account is not confirmed. Contact the event administrator.'
  }
  if (error.status === 429) return 'Too many sign-in attempts. Wait briefly before trying again.'
  if (!error.status || error.status >= 500) return 'The organizer sign-in service could not be reached. Check your connection and try again.'
  return 'Organizer sign-in could not be completed. Check the account status or contact the event administrator.'
}

export default function RequireOrganizerAuth() {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading')
  useEffect(() => {
    let active = true
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { if (active) setState('denied'); return }
      const { data, error } = await supabase.rpc('is_organizer')
      if (active) setState(!error && data === true ? 'allowed' : 'denied')
    })()
    return () => { active = false }
  }, [])
  if (state === 'loading') return <main className="auth-state-page"><div className="auth-state-card"><p className="eyebrow">SECURE CHANNEL</p><h1>VERIFYING ORGANIZER ACCESS</h1></div></main>
  if (state === 'denied') return <Navigate to="/organizer-login" replace />
  return <Outlet />
}

export function OrganizerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (signInError) { setError(organizerSignInMessage(signInError)); return }
      const { data, error: roleError } = await supabase.rpc('is_organizer')
      if (roleError || data !== true) {
        await supabase.auth.signOut({ scope: 'local' })
        setError('This account is not authorized for organizer access. Use an account provisioned with an organizer role.')
        return
      }
      window.location.assign('/organizer/round-2')
    } catch {
      setError('The organizer sign-in service could not be reached. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }
  return <main className="team-login-page"><div className="hazard-stripe" aria-hidden="true"/><section className="team-login-card"><p className="eyebrow">RESTRICTED ACCESS</p><h1>ORGANIZER <span>LOGIN</span></h1><form className="team-login-form" onSubmit={(e) => void submit(e)}><label htmlFor="org-email">ORGANIZER EMAIL</label><input id="org-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} disabled={busy}/><label htmlFor="org-password">PASSWORD</label><input id="org-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} disabled={busy}/>{error && <p className="auth-error" role="alert">{error}</p>}<button className="hunt-button login-submit" disabled={busy}>{busy ? 'VERIFYING ACCESS' : 'ENTER ORGANIZER CONSOLE'}</button></form><Link to="/" className="login-back-link">BACK TO CASE FILES</Link></section></main>
}
