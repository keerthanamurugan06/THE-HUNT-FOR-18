import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock3,
  RotateCcw,
  Eraser,
  Lightbulb,
  ShieldAlert,
  LoaderCircle,
  Save,
  CircleCheck,
  TriangleAlert,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import './Round1Page.css'

type LoadState = 'loading' | 'ready' | 'error'
type SaveState = 'saved' | 'pending' | 'saving' | 'error'
type ProgressStatus = 'in_progress' | 'completed'

type ClassicSudokuProgress = {
  initial_grid: string
  board: string
  progress_status: ProgressStatus
}

const EMPTY_BOARD = Array.from({ length: 81 }, () => '0')

function parseProgress(data: unknown): ClassicSudokuProgress | null {
  if (!Array.isArray(data) || data.length === 0) return null
  const row = data[0] as Partial<ClassicSudokuProgress>
  if (
    typeof row.initial_grid !== 'string'
    || !/^[0-9]{81}$/.test(row.initial_grid)
    || typeof row.board !== 'string'
    || !/^[0-9]{81}$/.test(row.board)
    || (row.progress_status !== 'in_progress' && row.progress_status !== 'completed')
  ) return null

  return row as ClassicSudokuProgress
}

export default function Round1Page() {
  const [board, setBoard] = useState<string[] | null>(null)
  const [initialGrid, setInitialGrid] = useState<string[]>(EMPTY_BOARD)
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>('in_progress')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveAttempt, setSaveAttempt] = useState(0)
  const [saveMessage, setSaveMessage] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [checkingCompletion, setCheckingCompletion] = useState(false)
  const [selected, setSelected] = useState(2)
  const [history, setHistory] = useState<string[][]>([])
  const [seconds] = useState(1200)
  const lastSavedBoard = useRef<string | null>(null)
  const latestBoard = useRef<string | null>(null)
  const skipInitialSave = useRef(false)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const saveVersion = useRef(0)

  const givenCells = useMemo(
    () => new Set(initialGrid.flatMap((value, index) => value !== '0' ? [index] : [])),
    [initialGrid],
  )

  useEffect(() => {
    let active = true

    async function restoreProgress() {
      setLoadState('loading')
      const { data, error } = await supabase.rpc('load_classic_sudoku')
      if (!active) return

      const restored = error ? null : parseProgress(data)
      if (!restored) {
        setLoadState('error')
        return
      }

      setInitialGrid(restored.initial_grid.split(''))
      setBoard(restored.board.split(''))
      setProgressStatus(restored.progress_status)
      lastSavedBoard.current = restored.board
      latestBoard.current = restored.board
      skipInitialSave.current = true
      setHistory([])
      setSaveMessage('')
      setCompletionMessage('')
      setSaveState('saved')
      setLoadState('ready')
    }

    void restoreProgress()
    return () => { active = false }
  }, [loadAttempt])

  useEffect(() => {
    if (!board) return
    latestBoard.current = board.join('')
  }, [board])

  useEffect(() => {
    if (loadState !== 'ready' || !board || progressStatus === 'completed') return
    const snapshot = board.join('')
    if (skipInitialSave.current) {
      skipInitialSave.current = false
      if (snapshot === lastSavedBoard.current) return
    }

    const version = ++saveVersion.current
    const timeout = window.setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => undefined)
        .then(async () => {
          if (version === saveVersion.current) setSaveState('saving')
          const { data, error } = await supabase
            .from('team_sudoku_progress')
            .update({ board: snapshot })
            .eq('puzzle_type', 'classic')
            .eq('status', 'in_progress')
            .select('id')
            .maybeSingle()

          if (error || !data) {
            if (version === saveVersion.current) {
              setSaveState('error')
              setSaveMessage('Progress could not be saved. Check your connection and retry.')
            }
            return
          }

          lastSavedBoard.current = snapshot
          if (version === saveVersion.current) setSaveState('saved')
        })
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [board, loadState, progressStatus, saveAttempt])

  useEffect(() => {
    const warnAboutUnsavedProgress = (event: BeforeUnloadEvent) => {
      if (
        loadState === 'ready'
        && progressStatus === 'in_progress'
        && latestBoard.current !== lastSavedBoard.current
      ) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', warnAboutUnsavedProgress)
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedProgress)
  }, [loadState, progressStatus, saveState])

  const updateCell = useCallback((value: string) => {
    if (!board || givenCells.has(selected) || progressStatus === 'completed' || checkingCompletion) return
    const next = [...board]
    next[selected] = value
    if (next.every((cell, index) => cell === board[index])) return
    setHistory(previous => [...previous, board])
    setBoard(next)
    setSaveState('pending')
    setSaveMessage('')
    setCompletionMessage('')
  }, [board, checkingCompletion, givenCells, progressStatus, selected])

  const undo = useCallback(() => {
    if (history.length === 0 || progressStatus === 'completed' || checkingCompletion) return
    const previousBoard = history[history.length - 1]
    setBoard(previousBoard)
    setHistory(previous => previous.slice(0, -1))
    setSaveState('pending')
    setSaveMessage('')
    setCompletionMessage('')
  }, [checkingCompletion, history, progressStatus])

  const handleGridKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    let nextCell = selected
    if (event.key === 'ArrowUp') nextCell = Math.max(0, selected - 9)
    else if (event.key === 'ArrowDown') nextCell = Math.min(80, selected + 9)
    else if (event.key === 'ArrowLeft') nextCell = selected % 9 === 0 ? selected : selected - 1
    else if (event.key === 'ArrowRight') nextCell = selected % 9 === 8 ? selected : selected + 1

    if (nextCell !== selected) {
      event.preventDefault()
      setSelected(nextCell)
      return
    }
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault()
      updateCell(event.key)
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      updateCell('0')
    }
  }, [selected, updateCell])

  const isConflict = useCallback((index: number) => {
    if (!board) return false
    const value = board[index]
    if (value === '0') return false

    const row = Math.floor(index / 9)
    const col = index % 9
    for (let other = 0; other < 81; other += 1) {
      if (other === index || board[other] !== value) continue
      const otherRow = Math.floor(other / 9)
      const otherCol = other % 9
      const sameBox = Math.floor(row / 3) === Math.floor(otherRow / 3)
        && Math.floor(col / 3) === Math.floor(otherCol / 3)
      if (row === otherRow || col === otherCol || sameBox) return true
    }
    return false
  }, [board])

  const handleCheckSolution = async () => {
    if (saveState !== 'saved' || progressStatus === 'completed' || checkingCompletion) return
    setCheckingCompletion(true)
    setCompletionMessage('')
    const { data, error } = await supabase.rpc('complete_classic_sudoku')
    setCheckingCompletion(false)

    if (error) {
      setCompletionMessage('The secure verification service is unavailable. Try again shortly.')
      return
    }
    if (data !== true) {
      setCompletionMessage('The saved grid is not complete yet. Review the entries and try again.')
      return
    }

    setProgressStatus('completed')
    setCompletionMessage('Server verification complete. Evidence delivery will be connected in a later step.')
  }

  const handleBackNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (saveState !== 'saved' && progressStatus !== 'completed') {
      event.preventDefault()
      setSaveMessage('Wait for progress to save before leaving this puzzle.')
    }
  }

  const progress = board
    ? Math.round((board.filter((value, index) => value !== '0' && !givenCells.has(index)).length
      / Math.max(1, 81 - givenCells.size)) * 100)
    : 0

  if (loadState === 'loading') {
    return (
      <main className="round1-page" aria-live="polite">
        <div className="round1-load-state"><LoaderCircle className="round1-spinner" size={24} />
          <span>RESTORING CLASSIC SUDOKU PROGRESS</span>
        </div>
      </main>
    )
  }

  if (loadState === 'error' || !board) {
    return (
      <main className="round1-page">
        <section className="round1-error-state" role="alert">
          <TriangleAlert size={28} />
          <p className="eyebrow">SECURE SAVE UNAVAILABLE</p>
          <h1>PROGRESS COULD NOT BE RESTORED</h1>
          <p>Your saved puzzle has not been changed. Check your connection and retry.</p>
          <button type="button" className="round1-primary-button" onClick={() => setLoadAttempt(value => value + 1)}>
            RETRY RESTORATION
          </button>
          <Link to="/team" className="round1-back"><ArrowLeft size={18} /> BACK TO TEAM FILE</Link>
        </section>
      </main>
    )
  }

  const saveStatus = progressStatus === 'completed'
    ? 'PUZZLE VERIFIED'
    : saveState === 'pending'
      ? 'SAVE QUEUED'
      : saveState === 'saving'
        ? 'SAVING PROGRESS'
        : saveState === 'error'
          ? 'SAVE FAILED'
          : 'PROGRESS SAVED'

  return (
    <main className="round1-page">
      <header className="round1-header">
        <Link to="/team" className="round1-back" onClick={handleBackNavigation}>
          <ArrowLeft size={18} /> BACK TO TEAM FILE
        </Link>
        <span className="round1-classification">CLASSIFIED // ROUND 01</span>
      </header>

      <section className="round1-heading">
        <p className="eyebrow">DIGITAL LOGIC TRAP</p>
        <h1>THE LOGIC <span>PROTOCOL</span></h1>
        <p>Every number matters. Every mistake leaves a trace. Solve the grid to unlock the classified evidence.</p>
      </section>

      <section className="round1-status">
        <div>
          <Clock3 size={18} />
          <span>TIME REMAINING</span>
          <strong>{Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}</strong>
        </div>
        <div><span>PUZZLE</span><strong>01 / 06</strong></div>
        <div><span>PROGRESS</span><strong>{progress}%</strong></div>
      </section>

      <section className="round1-workspace">
        <div className="sudoku-panel">
          <div className="sudoku-panel-heading">
            <div><p className="eyebrow">PUZZLE 001</p><h2>CLASSIC SUDOKU</h2></div>
            <span className="difficulty-tag">STANDARD</span>
          </div>

          <div className="sudoku-grid" aria-label="Classic Sudoku puzzle" tabIndex={0} onKeyDown={handleGridKeyDown}>
            {board.map((value, index) => (
              <button
                type="button"
                key={index}
                disabled={givenCells.has(index) || progressStatus === 'completed' || checkingCompletion}
                className={[
                  'sudoku-cell',
                  givenCells.has(index) ? 'given' : 'editable',
                  selected === index ? 'selected' : '',
                  isConflict(index) ? 'conflict' : '',
                  Math.floor(index / 9) % 3 === 2 && index < 72 ? 'bottom-block' : '',
                  index % 9 === 2 || index % 9 === 5 ? 'right-block' : '',
                ].join(' ')}
                onClick={() => setSelected(index)}
                aria-label={`Row ${Math.floor(index / 9) + 1}, column ${index % 9 + 1}, value ${value === '0' ? 'empty' : value}`}
              >
                {value === '0' ? '' : value}
              </button>
            ))}
          </div>

          <div className="round1-save-status" role="status" aria-live="polite">
            {progressStatus === 'completed' || saveState === 'saved'
              ? <CircleCheck size={15} />
              : saveState === 'error'
                ? <TriangleAlert size={15} />
                : <LoaderCircle className="round1-spinner" size={15} />}
            <span>{saveStatus}</span>
          </div>
          {saveMessage && <p className="round1-feedback" role="alert">{saveMessage}</p>}

          <div className="sudoku-controls">
            <button type="button" onClick={undo} disabled={!history.length || progressStatus === 'completed' || checkingCompletion}>
              <RotateCcw size={16} /> UNDO
            </button>
            <button type="button" onClick={() => updateCell('0')} disabled={progressStatus === 'completed' || checkingCompletion}>
              <Eraser size={16} /> CLEAR
            </button>
          </div>

          <div className="number-pad" aria-label="Enter a number">
            {'123456789'.split('').map(number => (
              <button type="button" key={number} onClick={() => updateCell(number)} disabled={progressStatus === 'completed' || checkingCompletion}>
                {number}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="round1-primary-button round1-verify-button"
            onClick={() => void handleCheckSolution()}
            disabled={saveState !== 'saved' || progressStatus === 'completed' || checkingCompletion}
          >
            {checkingCompletion
              ? <><LoaderCircle className="round1-spinner" size={16} /> VERIFYING SAVED GRID</>
              : progressStatus === 'completed'
                ? <><CircleCheck size={16} /> SOLUTION VERIFIED</>
                : <>VERIFY SOLUTION</>}
          </button>
          {saveState === 'error' && (
            <button
              type="button"
              className="round1-retry-save"
              onClick={() => {
                setSaveMessage('')
                setSaveState('pending')
                setSaveAttempt(value => value + 1)
              }}
            >
              <Save size={15} /> RETRY SAVE
            </button>
          )}
          {completionMessage && <p className="round1-feedback" role={progressStatus === 'completed' ? 'status' : 'alert'}>{completionMessage}</p>}
        </div>

        <aside className="round1-sidebar">
          <div className="instruction-card">
            <ShieldAlert size={25} />
            <p className="eyebrow">MISSION DIRECTIVE</p>
            <h3>THE RULES OF LOGIC</h3>
            <ul>
              <li>Every row must contain numbers 1–9.</li>
              <li>Every column must contain numbers 1–9.</li>
              <li>Every 3×3 box must contain numbers 1–9.</li>
              <li>No number can repeat in a row, column or box.</li>
            </ul>
          </div>

          <div className="evidence-locked">
            <Lightbulb size={26} />
            <p className="eyebrow">CLASSIFIED EVIDENCE</p>
            <h3>{progressStatus === 'completed' ? 'PUZZLE SOLVED' : 'EVIDENCE LOCKED'}</h3>
            <p>
              {progressStatus === 'completed'
                ? 'The server verified this solution. Evidence delivery will be connected in a later step.'
                : 'Solve and verify this puzzle to complete the challenge.'}
            </p>
          </div>
        </aside>
      </section>

      <footer className="round1-footer">THE HUNT FOR 18 // INVESTIGATION SYSTEM</footer>
    </main>
  )
}
