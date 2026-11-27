import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type TeamIdentity = {
  id: string
  team_code: string
  team_name: string
  status: string
}

export type TeamAuthContextValue = {
  session: Session | null
  team: TeamIdentity | null
  sessionLoading: boolean
  teamLoading: boolean
  teamError: string | null
  signInWithTeamCode: (teamCode: string, accessCode: string) => Promise<void>
  signOut: () => Promise<void>
  refreshTeam: () => Promise<void>
}

export const TeamAuthContext = createContext<TeamAuthContextValue | null>(null)

export function useTeamAuth() {
  const value = useContext(TeamAuthContext)
  if (!value) throw new Error('useTeamAuth must be used within TeamAuthProvider')
  return value
}
