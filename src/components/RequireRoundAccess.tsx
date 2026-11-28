import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, LoaderCircle, LockKeyhole } from 'lucide-react'
import { supabase } from '../lib/supabase'

type TimerState = { status: string; remaining_seconds: number }
export default function RequireRoundAccess({ roundNumber, children }: { roundNumber: number; children: ReactNode }) {
  const [timer, setTimer] = useState<TimerState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    let active = true
    const refresh = async () => {
      const { data, error: timerError } = await supabase.rpc('get_participant_round_timer', { p_round_number: roundNumber })
      if (!active) return
      if (timerError) setError(true)
      else { const nextTimer = data as TimerState; setTimer(nextTimer); setRemaining(nextTimer.remaining_seconds); setError(false) }
      setLoading(false)
    }
    void refresh()
    const interval = window.setInterval(() => { void refresh() }, 5000)
    const clock = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000)
    return () => { active = false; window.clearInterval(interval); window.clearInterval(clock) }
  }, [roundNumber])

  if (loading) return <main className="round-access-state"><LoaderCircle className="round-access-spin"/><p>VERIFYING ROUND ACCESS</p></main>
  if (error || !timer) return <main className="round-access-state"><LockKeyhole/><h1>ROUND STATUS UNAVAILABLE</h1><p>Reconnect and check with the event organizer before continuing.</p><Link to="/team">RETURN TO TEAM FILES</Link></main>
  if (timer.status !== 'running' || remaining <= 0) {
    const label = remaining <= 0 && timer.status === 'running' ? 'ROUND TIME EXPIRED' : timer.status === 'paused' ? 'ROUND PAUSED' : timer.status === 'ended' ? 'ROUND CLOSED' : timer.status === 'ready' ? 'ROUND AUTHORIZED · NOT STARTED' : 'ROUND LOCKED'
    return <main className="round-access-state"><LockKeyhole/><p className="eyebrow">ROUND {String(roundNumber).padStart(2, '0')}</p><h1>{label}</h1><p>Investigation progress and earned evidence remain saved. Gameplay opens when the organizer authorizes it.</p><Link to="/team">RETURN TO TEAM FILES</Link></main>
  }
  return <><div className="participant-round-timer" role="timer" aria-label="Server-authoritative round timer"><Clock3 size={15}/><span>ROUND {String(roundNumber).padStart(2, '0')}</span><strong>{String(Math.floor(remaining / 60)).padStart(2, '0')}:{String(remaining % 60).padStart(2, '0')}</strong></div>{children}</>
}
