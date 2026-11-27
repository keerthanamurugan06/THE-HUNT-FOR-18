
import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Fingerprint,
  LockKeyhole,
  Search,
  Shield,
  Users,
  X,
} from 'lucide-react'

import { AmbienceControl } from './components/AmbienceControl'
import { EvidenceBoard } from './components/EvidenceBoard'
import RequireTeamAuth from './components/RequireTeamAuth'
import { TeamAuthProvider } from './context/TeamAuthContext'
import Round1Page from './pages/Round1Page'
import TeamHomePage from './pages/TeamHomePage'
import TeamLoginPage from './pages/TeamLoginPage'
import Round2Page from './pages/Round2Page'
import OrganizerRound2Page from './pages/OrganizerRound2Page'
import Round3Page from './pages/Round3Page'
import OrganizerRound3Page from './pages/OrganizerRound3Page'
import RequireOrganizerAuth, { OrganizerLoginPage } from './components/RequireOrganizerAuth'

type RoundCard = {
  number: string
  name: string
  detail: string
  classification: string
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const target = new Date('2026-11-28T08:00:00+05:30').getTime()

    const updateCountdown = () => {
      const difference = Math.max(0, target - Date.now())

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      })
    }

    updateCountdown()

    const timer = window.setInterval(updateCountdown, 1000)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="countdown" aria-label="Countdown to the investigation">
      <p className="countdown-label">TIME UNTIL THE INVESTIGATION</p>

      <div className="countdown-grid">
        {[
          ['DAYS', timeLeft.days],
          ['HOURS', timeLeft.hours],
          ['MINUTES', timeLeft.minutes],
          ['SECONDS', timeLeft.seconds],
        ].map(([label, value]) => (
          <div className="countdown-unit" key={String(label)}>
            <span>{String(value).padStart(2, '0')}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
    </div>
  )
}

function HomePage() {
  const [selectedRound, setSelectedRound] = useState<RoundCard | null>(null)
  const navigate = useNavigate()

  const rounds: RoundCard[] = [
    {
      number: '01',
      name: 'DIGITAL LOGIC TRAP',
      detail: 'Decode the clues.',
      classification: 'ROUND 01 • LOGICAL ACCESS',
    },
    {
      number: '02',
      name: 'PASSWORD BREAKER',
      detail: 'Unlock the evidence.',
      classification: 'ROUND 02 • CRYPTOGRAPHIC ACCESS',
    },
    {
      number: '03',
      name: 'THE CRYPTO PROTOCOL',
      detail: 'Break the cipher.',
      classification: 'ROUND 03 • CRYPTOGRAPHIC ACCESS',
    },
    {
      number: '04',
      name: 'OPERATION: DEADLOCK',
      detail: 'Solve the final mystery.',
      classification: 'ROUND 04 • FINAL ACCESS',
    },
  ]

  return (
    <main className="site-shell">
      <div className="hazard-stripe" aria-hidden="true" />

      <header className="site-header">
        <nav className="top-navigation" aria-label="Primary navigation">
          <Link to="/" className="wordmark" aria-label="THE HUNT FOR 18 home">
            THE HUNT <span>FOR 18</span>
          </Link>

          <div className="nav-links">
            <a href="#mission">The Mission</a>
            <a href="#rounds">The Rounds</a>
            <a href="#details">Event Details</a>
          </div>

          <div className="nav-actions">
            <AmbienceControl />
            <Link to="/team-login" className="nav-login">
              TEAM LOGIN
            </Link>
          </div>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-case-label">
          CLASSIFIED INVESTIGATION • CASE 018
        </div>

        <div className="hero-content">
          <p className="hero-kicker">EVIDENCE CONTROLLED NARRATIVE</p>

          <h1>
            THE HUNT FOR
            <span>18</span>
          </h1>

          <div className="hero-tagline">
            <span>18 VICTIMS.</span>
            <span>1 KILLER.</span>
            <span>1 MYSTERY.</span>
          </div>

          <p className="hero-copy">
            Think like a detective. <strong>Decode</strong> like a specialist.
          </p>

          <div className="hero-stamp">UNSOLVED</div>

          <p className="hero-summary">
            Eighteen victim positions. One hidden killer. A continuous trail of
            evidence waiting to be uncovered.
          </p>

          <p className="hero-command">
            INVESTIGATE. DECODE. CONNECT. EXPOSE.
          </p>

          <Countdown />

          <div className="hero-actions">
            <a href="#mission" className="hunt-button primary-button">
              EXPLORE THE CASE <ArrowRight size={17} />
            </a>

            <Link to="/team-login" className="hunt-button secondary-button">
              TEAM LOGIN
            </Link>
          </div>
        </div>

        <a
          className="hero-scroll"
          href="#details"
          aria-label="Continue to event details"
        >
          <ChevronDown size={22} />
        </a>
      </section>

      <section
        id="details"
        className="event-details"
        aria-label="Event details"
      >
        {[
          {
            icon: Clock3,
            value: '120 MIN',
            label: 'OF INVESTIGATION',
          },
          {
            icon: Users,
            value: '25 TEAMS',
            label: '50 PARTICIPANTS',
          },
          {
            icon: Search,
            value: '4 ROUNDS',
            label: 'ONE CONNECTED MYSTERY',
          },
          {
            icon: Shield,
            value: '1 MISSION',
            label: 'UNCOVER THE KILLER',
          },
        ].map((item) => (
          <article className="detail-cell" key={item.label}>
            <item.icon size={24} aria-hidden="true" />
            <h3>{item.value}</h3>
            <p>{item.label}</p>
          </article>
        ))}
      </section>

      <EvidenceBoard />

      <section
        id="mission"
        className="investigation-section mission-section"
      >
        <div className="mission-copy">
          <p className="eyebrow">CASE FILE 001</p>
          <h2>THE MISSION</h2>

          <p className="mission-lead">
            Eighteen victims. One hidden killer. A trail of evidence waiting
            to be uncovered. Your team must investigate, solve challenges,
            connect clues and expose the truth before time runs out.
          </p>
        </div>

        <div className="mission-note">
          <Fingerprint size={34} aria-hidden="true" />
          <h3>THINK. INVESTIGATE. CONNECT.</h3>

          <p>
            Work together. Question everything. The smallest detail could
            change the entire investigation.
          </p>
        </div>
      </section>

      <section
        id="rounds"
        className="investigation-section rounds-section"
      >
        <p className="eyebrow">THE INVESTIGATION PROCESS</p>
        <h2>FOUR ROUNDS.</h2>

        <p className="rounds-intro">
          Each round takes you deeper into the mystery. Every discovery brings
          you closer to the truth.
        </p>

        <div className="round-grid">
          {rounds.map((round) => (
            <button
              type="button"
              key={round.number}
              onClick={() => {
                if (round.number === '01') {
                  navigate('/round-1')
                  return
                }
                if (round.number === '03') {
                  navigate('/round-3')
                  return
                }

                setSelectedRound(round)
              }}
              className="round-card"
              aria-label={`Open case file for ${round.name}`}
            >
              <span className="round-number">{round.number}</span>
              <span className="round-line" />

              <h3>{round.name}</h3>
              <p>{round.detail}</p>
              <small>{round.classification}</small>
            </button>
          ))}
        </div>
      </section>

      {selectedRound && (
        <div
          className="case-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="case-modal-title"
        >
          <button
            type="button"
            className="case-modal-backdrop"
            onClick={() => setSelectedRound(null)}
            aria-label="Close case file"
          />

          <div className="case-modal-panel">
            <button
              type="button"
              onClick={() => setSelectedRound(null)}
              className="case-modal-close"
              aria-label="Close case file"
            >
              <X size={22} />
            </button>

            <p className="eyebrow">CLASSIFIED CASE FILE</p>
            <p className="modal-round-number">{selectedRound.number}</p>

            <h2 id="case-modal-title">{selectedRound.name}</h2>
            <p className="modal-detail">{selectedRound.detail}</p>

            <div className="modal-restricted">
              <p>ACCESS LEVEL: RESTRICTED</p>
              <p>Further investigation details are classified.</p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedRound(null)}
              className="hunt-button modal-button"
            >
              CLOSE CASE FILE
            </button>
          </div>
        </div>
      )}

      <section className="team-portal">
        <LockKeyhole size={36} aria-hidden="true" />
        <h2>YOUR TEAM. YOUR MISSION.</h2>
        <p>Already have your team credentials? Enter the investigation.</p>

        <Link to="/team-login" className="hunt-button portal-button">
          ENTER TEAM PORTAL <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="site-footer">
        <p>© 2026 THE HUNT FOR 18. ALL RIGHTS RESERVED.</p>
        <p>18 VICTIMS. 1 KILLER. 1 MYSTERY.</p>
      </footer>
    </main>
  )
}

function LoginPlaceholder({ title }: { title: string }) {
  return (
    <main className="login-placeholder">
      <p className="eyebrow">RESTRICTED ACCESS</p>
      <h1>{title}</h1>
      <p>Authentication will be implemented next.</p>

      <Link to="/" className="back-link">
        ← Back to Home
      </Link>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <TeamAuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/team-login" element={<TeamLoginPage />} />
          <Route element={<RequireTeamAuth />}>
            <Route path="/team" element={<TeamHomePage />} />
            <Route path="/round-1" element={<Round1Page />} />
            <Route path="/round-2" element={<Round2Page />} />
            <Route path="/round-3" element={<Round3Page />} />
          </Route>
          <Route path="/organizer-login" element={<OrganizerLoginPage />} />
          <Route element={<RequireOrganizerAuth />}>
            <Route path="/organizer/round-2" element={<OrganizerRound2Page />} />
            <Route path="/organizer/round-3" element={<OrganizerRound3Page />} />
          </Route>
          <Route
            path="*"
            element={<LoginPlaceholder title="PAGE NOT FOUND" />}
          />
        </Routes>
      </TeamAuthProvider>
    </BrowserRouter>
  )
}

export default App
