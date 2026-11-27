import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
  type Session,
} from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { TeamAuthContext, type TeamIdentity } from './team-auth-context'

function loginErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const status = error.context.status

    if (status === 401) return 'Team ID or access code was not recognized.'
    if (status === 403) return 'This team is not authorized to enter yet.'
    if (status === 429) return 'Too many attempts. Wait a moment and try again.'
  }

  if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
    return 'The sign-in service could not be reached. Check your connection and try again.'
  }

  return 'Team sign-in is temporarily unavailable. Please try again.'
}

export function TeamAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [team, setTeam] = useState<TeamIdentity | null>(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setSessionLoading(false)
      setTeamLoading(Boolean(nextSession))
      if (!nextSession) {
        setTeam(null)
        setTeamError(null)
        setTeamLoading(false)
      }
    })

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        setTeamError('Your saved session could not be restored. Sign in again.')
      }
      setSession(data.session)
      setTeamLoading(Boolean(data.session))
      setSessionLoading(false)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const refreshTeam = useCallback(async () => {
    const userId = session?.user.id
    if (!userId) {
      setTeam(null)
      setTeamError(null)
      setTeamLoading(false)
      return
    }

    setTeamLoading(true)
    setTeamError(null)

    const { data, error } = await supabase
      .from('teams')
      .select('id, team_code, team_name, status')
      .maybeSingle()

    if (error) {
      setTeam(null)
      setTeamError('We could not verify this team session. Check your connection and retry.')
    } else {
      setTeam(data as TeamIdentity | null)
    }
    setTeamLoading(false)
  }, [session?.user.id])

  useEffect(() => {
    let isCurrent = true
    if (!sessionLoading) {
      void Promise.resolve().then(() => {
        if (isCurrent) void refreshTeam()
      })
    }
    return () => {
      isCurrent = false
    }
  }, [refreshTeam, sessionLoading])

  const signInWithTeamCode = useCallback(
    async (teamCode: string, accessCode: string) => {
      const { data, error } = await supabase.functions.invoke<{ token_hash?: string }>(
        'team-login',
        { body: { team_code: teamCode.trim(), access_code: accessCode } },
      )

      if (error) throw new Error(loginErrorMessage(error))
      if (!data?.token_hash) {
        throw new Error('Team ID or access code was not recognized.')
      }

      const { error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      })

      if (sessionError) {
        throw new Error('A secure session could not be started. Please try signing in again.')
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw new Error('Sign-out failed. Please try again.')
  }, [])

  const value = useMemo(
    () => ({
      session,
      team,
      sessionLoading,
      teamLoading,
      teamError,
      signInWithTeamCode,
      signOut,
      refreshTeam,
    }),
    [session, team, sessionLoading, teamLoading, teamError, signInWithTeamCode, signOut, refreshTeam],
  )

  return <TeamAuthContext.Provider value={value}>{children}</TeamAuthContext.Provider>
}
