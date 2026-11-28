import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock3, RotateCcw, Eraser, Lightbulb, ShieldAlert, LoaderCircle, Save, CircleCheck, TriangleAlert } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { clearTeamDraft, readTeamDrafts, teamDraftKey, writeTeamDraft } from '../lib/team-drafts'
import { getConflictingCells, isValidRegionMap, VARIANT_INFO, VARIANT_RULES, type SudokuVariant } from '../lib/sudoku-rules'
import './Round1Page.css'

type ProgressStatus = 'in_progress' | 'completed'
type Puzzle = { puzzle_type: SudokuVariant; initial_grid: string; board: string; progress_status: ProgressStatus; demo_only: boolean; evidence_unlocked: boolean; jigsaw_regions?: number[] | null }
type LoadState = 'loading' | 'ready' | 'error'
type SaveState = 'saved' | 'pending' | 'saving' | 'error'
const EMPTY_BOARD = Array.from({ length: 81 }, () => '0')

function parsePuzzles(data: unknown): Puzzle[] | null {
  if (!Array.isArray(data) || data.length !== 6) return null
  const accepted = new Set(Object.keys(VARIANT_INFO))
  const parsed: Puzzle[] = []
  for (const item of data) {
    if (!item || typeof item !== 'object') return null
    const row = item as Partial<Puzzle>
    if (typeof row.puzzle_type !== 'string' || !accepted.has(row.puzzle_type)
      || typeof row.initial_grid !== 'string' || !/^[0-9]{81}$/.test(row.initial_grid)
      || typeof row.board !== 'string' || !/^[0-9]{81}$/.test(row.board)
      || (row.progress_status !== 'in_progress' && row.progress_status !== 'completed')
      || typeof row.demo_only !== 'boolean'
      || typeof row.evidence_unlocked !== 'boolean'
      || (row.puzzle_type === 'jigsaw' && !isValidRegionMap(row.jigsaw_regions ?? undefined))) return null
    parsed.push(row as Puzzle)
  }
  if (new Set(parsed.map(puzzle => puzzle.puzzle_type)).size !== 6) return null
  return parsed
}

export default function Round1Page() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([])
  const [activeType, setActiveType] = useState<SudokuVariant>('classic')
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveAttempt, setSaveAttempt] = useState(0)
  const [saveMessage, setSaveMessage] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [checkingCompletion, setCheckingCompletion] = useState(false)
  const [switchingPuzzle, setSwitchingPuzzle] = useState(false)
  const [classicCompatibilityMode, setClassicCompatibilityMode] = useState(false)
  const [victimReveal, setVictimReveal] = useState<number | null>(null)
  const [selected, setSelected] = useState(2)
  const [history, setHistory] = useState<string[][]>([])
  const activePuzzle = puzzles.find(puzzle => puzzle.puzzle_type === activeType)
  const board = activePuzzle?.board.split('') ?? null
  const initialGrid = activePuzzle?.initial_grid.split('') ?? EMPTY_BOARD
  const status = activePuzzle?.progress_status ?? 'in_progress'
  const lastSavedBoards = useRef<Partial<Record<SudokuVariant, string>>>({})
  const latestBoards = useRef<Partial<Record<SudokuVariant, string>>>({})
  const skipInitialSave = useRef(false)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const saveVersion = useRef(0)
  const pendingSaveTimer = useRef<number | null>(null)
  const localDraftKey = useRef<string | null>(null)
  const givenCells = new Set(initialGrid.flatMap((value, index) => value !== '0' ? [index] : []))
  const ruleSet = useMemo(() => activeType === 'jigsaw'
    ? { ...VARIANT_RULES.jigsaw, jigsawRegions: activePuzzle?.jigsaw_regions ?? undefined }
    : VARIANT_RULES[activeType], [activeType, activePuzzle?.jigsaw_regions])
  const conflicts = useMemo(() => board ? getConflictingCells(board.join(''), ruleSet) : new Set<number>(), [board, ruleSet])

  useEffect(() => {
    let active = true
    async function restore() {
      setLoadState('loading')
      const { data, error } = await supabase.rpc('load_round1_sudokus')
      if (!active) return
      let restored = error ? null : parsePuzzles(data)
      let compatibility = false
      if (error) {
        const legacy = await supabase.rpc('load_classic_sudoku')
        if (!active) return
        if (!legacy.error && Array.isArray(legacy.data) && legacy.data.length > 0) {
          const row = legacy.data[0] as { initial_grid?: unknown; board?: unknown; progress_status?: unknown }
          if (typeof row.initial_grid === 'string' && /^[0-9]{81}$/.test(row.initial_grid)
            && typeof row.board === 'string' && /^[0-9]{81}$/.test(row.board)
            && (row.progress_status === 'in_progress' || row.progress_status === 'completed')) {
            restored = [{ puzzle_type: 'classic', initial_grid: row.initial_grid, board: row.board, progress_status: row.progress_status, demo_only: false, evidence_unlocked: false }]
            compatibility = true
          }
        }
      }
      if (!restored) { setLoadState('error'); return }
      const { data: auth } = await supabase.auth.getUser()
      if (!active) return
      localDraftKey.current = auth.user ? teamDraftKey(1, auth.user.id) : null
      const cached = localDraftKey.current ? readTeamDrafts<string>(localDraftKey.current) : {}
      const withLocalDrafts = restored.map(puzzle => {
        const draft = cached[puzzle.puzzle_type]
        const preservesGivens = typeof draft === 'string' && puzzle.initial_grid.split('').every((given, index) => given === '0' || draft[index] === given)
        return puzzle.progress_status === 'in_progress' && typeof draft === 'string' && /^[0-9]{81}$/.test(draft) && preservesGivens
          ? { ...puzzle, board: draft }
          : puzzle
      })
      setPuzzles(withLocalDrafts)
      setActiveType(withLocalDrafts[0].puzzle_type)
      setClassicCompatibilityMode(compatibility)
      lastSavedBoards.current = Object.fromEntries(restored.map(puzzle => [puzzle.puzzle_type, puzzle.board]))
      latestBoards.current = Object.fromEntries(withLocalDrafts.map(puzzle => [puzzle.puzzle_type, puzzle.board]))
      skipInitialSave.current = true
      setHistory([]); setSaveMessage(''); setCompletionMessage(''); setSaveState('saved'); setLoadState('ready')
    }
    void restore()
    return () => { active = false }
  }, [loadAttempt])

  useEffect(() => {
    if (!activePuzzle) return
    latestBoards.current[activeType] = activePuzzle.board
  }, [activePuzzle, activeType])

  useEffect(() => {
    if (!activePuzzle || loadState !== 'ready' || status === 'completed') return
    const snapshot = activePuzzle.board
    if (skipInitialSave.current) {
      skipInitialSave.current = false
      if (snapshot === lastSavedBoards.current[activeType]) return
    }
    const version = ++saveVersion.current
    pendingSaveTimer.current = window.setTimeout(() => {
      pendingSaveTimer.current = null
      saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
        if (version === saveVersion.current) setSaveState('saving')
        const { data, error } = await supabase.from('team_sudoku_progress').update({ board: snapshot })
          .eq('puzzle_type', activeType).eq('status', 'in_progress').select('id').maybeSingle()
        if (error || !data) {
          if (version === saveVersion.current) { setSaveState('error'); setSaveMessage('Progress could not be saved. Check your connection and retry.') }
          return
        }
        lastSavedBoards.current[activeType] = snapshot
        if (localDraftKey.current) clearTeamDraft(localDraftKey.current, activeType, snapshot)
        if (version === saveVersion.current) setSaveState('saved')
      })
    }, 400)
    return () => {
      if (pendingSaveTimer.current !== null) window.clearTimeout(pendingSaveTimer.current)
      pendingSaveTimer.current = null
    }
  }, [activePuzzle, activeType, loadState, status, saveAttempt])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      const unsaved = puzzles.some(puzzle => puzzle.progress_status === 'in_progress' && latestBoards.current[puzzle.puzzle_type] !== lastSavedBoards.current[puzzle.puzzle_type])
      if (loadState === 'ready' && unsaved) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [loadState, puzzles])

  useEffect(() => {
    const retryOnReconnect = () => {
      if (navigator.onLine) setSaveAttempt(value => value + 1)
    }
    window.addEventListener('online', retryOnReconnect)
    return () => window.removeEventListener('online', retryOnReconnect)
  }, [])

  const updateCell = (value: string) => {
    if (!board || givenCells.has(selected) || status === 'completed' || checkingCompletion || switchingPuzzle) return
    const next = [...board]; next[selected] = value
    if (next.every((cell, index) => cell === board[index])) return
    latestBoards.current[activeType] = next.join('')
    if (localDraftKey.current) writeTeamDraft(localDraftKey.current, activeType, next.join(''))
    setPuzzles(previous => previous.map(puzzle => puzzle.puzzle_type === activeType ? { ...puzzle, board: next.join('') } : puzzle))
    setHistory(previous => [...previous, board]); setSaveState('pending'); setSaveMessage(''); setCompletionMessage('')
  }

  const undo = () => {
    if (!history.length || status === 'completed' || checkingCompletion || switchingPuzzle) return
    const previous = history[history.length - 1]
    latestBoards.current[activeType] = previous.join('')
    if (localDraftKey.current) writeTeamDraft(localDraftKey.current, activeType, previous.join(''))
    setPuzzles(items => items.map(puzzle => puzzle.puzzle_type === activeType ? { ...puzzle, board: previous.join('') } : puzzle))
    setHistory(items => items.slice(0, -1)); setSaveState('pending'); setSaveMessage(''); setCompletionMessage('')
  }

  const handleGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let next = selected
    if (event.key === 'ArrowUp') next = Math.max(0, selected - 9)
    else if (event.key === 'ArrowDown') next = Math.min(80, selected + 9)
    else if (event.key === 'ArrowLeft') next = selected % 9 === 0 ? selected : selected - 1
    else if (event.key === 'ArrowRight') next = selected % 9 === 8 ? selected : selected + 1
    if (next !== selected) { event.preventDefault(); setSelected(next); return }
    if (/^[1-9]$/.test(event.key)) { event.preventDefault(); updateCell(event.key) }
    else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); updateCell('0') }
  }

  const checkSolution = async () => {
    if (saveState !== 'saved' || status === 'completed' || checkingCompletion) return
    setCheckingCompletion(true); setCompletionMessage('')
    const { data, error } = classicCompatibilityMode
      ? await supabase.rpc('complete_classic_sudoku')
      : await supabase.rpc('complete_round1_sudoku', { p_puzzle_type: activeType })
    setCheckingCompletion(false)
    if (error) { setCompletionMessage('The secure verification service is unavailable. Try again shortly.'); return }
    const validCompletion = classicCompatibilityMode ? data === true : Number.isInteger(data) && Number(data) >= 1 && Number(data) <= 6
    if (!validCompletion) { setCompletionMessage('The saved grid is not complete yet. Review the entries and try again.'); return }
    const unlockedVictim = classicCompatibilityMode ? null : Number(data)
    setPuzzles(items => items.map(puzzle => puzzle.puzzle_type === activeType ? { ...puzzle, progress_status: 'completed', evidence_unlocked: !classicCompatibilityMode } : puzzle))
    if (unlockedVictim) setVictimReveal(unlockedVictim)
    setCompletionMessage(classicCompatibilityMode
      ? 'Classic completion was verified by the server. Multi-puzzle victim discoveries will be available after the Round 1 setup is installed.'
      : 'Server verification complete. The corresponding victim case file is now unlocked.')
  }

  const switchPuzzle = async (nextType: SudokuVariant) => {
    if (nextType === activeType || switchingPuzzle) return
    const current = puzzles.find(puzzle => puzzle.puzzle_type === activeType)
    if (!current) return
    setSwitchingPuzzle(true)
    if (pendingSaveTimer.current !== null) window.clearTimeout(pendingSaveTimer.current)
    pendingSaveTimer.current = null
    const version = ++saveVersion.current
    await saveQueue.current.catch(() => undefined)
    const snapshot = latestBoards.current[activeType] ?? current.board
    if (current.progress_status === 'in_progress' && snapshot !== lastSavedBoards.current[activeType]) {
      setSaveState('saving')
      const { data, error } = await supabase.from('team_sudoku_progress').update({ board: snapshot })
        .eq('puzzle_type', activeType).eq('status', 'in_progress').select('id').maybeSingle()
      if (error || !data) {
        if (version === saveVersion.current) { setSaveState('error'); setSaveMessage('Progress could not be saved. Retry before switching puzzles.') }
        setSwitchingPuzzle(false)
        return
      }
      lastSavedBoards.current[activeType] = snapshot
      if (version === saveVersion.current) setSaveState('saved')
    }
    setActiveType(nextType); setHistory([]); setSelected(2); setSaveMessage(''); setCompletionMessage(''); setSaveState('saved')
    setSwitchingPuzzle(false)
  }

  const handleBack = (event: MouseEvent<HTMLAnchorElement>) => {
    if (saveState !== 'saved' && status !== 'completed') { event.preventDefault(); setSaveMessage('Wait for progress to save before leaving this puzzle.') }
  }
  const progress = board ? Math.round(board.filter((value, index) => value !== '0' && !givenCells.has(index)).length / Math.max(1, 81 - givenCells.size) * 100) : 0
  const completeCount = puzzles.filter(puzzle => puzzle.progress_status === 'completed').length

  if (loadState === 'loading') return <main className="round1-page" aria-live="polite"><div className="round1-load-state"><LoaderCircle className="round1-spinner" size={24} /><span>RESTORING ROUND 01 PROGRESS</span></div></main>
  if (loadState === 'error' || !activePuzzle || !board) return <main className="round1-page"><section className="round1-error-state" role="alert"><TriangleAlert size={28} /><p className="eyebrow">SECURE SAVE UNAVAILABLE</p><h1>PROGRESS COULD NOT BE RESTORED</h1><p>Your saved puzzles have not been changed. Check your connection and retry.</p><button type="button" className="round1-primary-button" onClick={() => setLoadAttempt(value => value + 1)}>RETRY RESTORATION</button><Link to="/team" className="round1-back"><ArrowLeft size={18} /> BACK TO TEAM FILE</Link></section></main>

  const saveStatus = status === 'completed' ? 'PUZZLE VERIFIED' : saveState === 'pending' ? 'SAVE QUEUED' : saveState === 'saving' ? 'SAVING PROGRESS' : saveState === 'error' ? 'SAVE FAILED' : 'PROGRESS SAVED'
  const variantTitle = VARIANT_INFO[activeType].title
  return <main className="round1-page">
    <header className="round1-header"><Link to="/team" className="round1-back" onClick={handleBack}><ArrowLeft size={18} /> BACK TO TEAM FILE</Link><span className="round1-classification">CLASSIFIED // ROUND 01</span></header>
    <section className="round1-heading"><p className="eyebrow">DIGITAL LOGIC TRAP</p><h1>THE LOGIC <span>PROTOCOL</span></h1><p>Choose any case file. Your team's progress is saved independently for each puzzle.</p></section>
    <section className="round1-status"><div><Clock3 size={18} /><span>SESSION TIMER</span><strong>NOT ACTIVE</strong></div><div><span>PUZZLES COMPLETE</span><strong>{completeCount} / 06</strong></div><div><span>ACTIVE PROGRESS</span><strong>{progress}%</strong></div></section>
    <nav className="round1-puzzle-nav" aria-label="Round 1 puzzles">{puzzles.map((puzzle, index) => <button key={puzzle.puzzle_type} type="button" disabled={switchingPuzzle} className={puzzle.puzzle_type === activeType ? 'active' : ''} onClick={() => void switchPuzzle(puzzle.puzzle_type)}><span>{String(index + 1).padStart(2, '0')} // {VARIANT_INFO[puzzle.puzzle_type].title}</span>{puzzle.progress_status === 'completed' ? <CircleCheck size={16} aria-label="Completed" /> : <span className="round1-puzzle-state">IN PROGRESS</span>}</button>)}</nav>
    <section className="round1-workspace"><div className="sudoku-panel">
      <div className="sudoku-panel-heading"><div><p className="eyebrow">CASE FILE {String(puzzles.findIndex(puzzle => puzzle.puzzle_type === activeType) + 1).padStart(3, '0')}</p><h2>{variantTitle}</h2></div><span className="difficulty-tag">VERIFIED PUZZLE</span></div>
      <div className="sudoku-grid" aria-label={`${variantTitle} puzzle`} tabIndex={0} onKeyDown={handleGridKeyDown}>
        {board.map((value, index) => {
          const row = Math.floor(index / 9), col = index % 9
          const windowCell = activeType === 'windoku' && (row >= 1 && row <= 3 || row >= 5 && row <= 7) && (col >= 1 && col <= 3 || col >= 5 && col <= 7)
          const diagonalCell = activeType === 'diagonal' && (row === col || row + col === 8)
          const region = activePuzzle.jigsaw_regions?.[index]
          const regionBoundary = region !== undefined && (col < 8 && region !== activePuzzle.jigsaw_regions?.[index + 1] || row < 8 && region !== activePuzzle.jigsaw_regions?.[index + 9])
          return <button type="button" key={index} disabled={givenCells.has(index) || status === 'completed' || checkingCompletion || switchingPuzzle} className={['sudoku-cell', givenCells.has(index) ? 'given' : 'editable', selected === index ? 'selected' : '', conflicts.has(index) ? 'conflict' : '', windowCell ? 'windoku-cell' : '', diagonalCell ? 'diagonal-cell' : '', regionBoundary && activeType === 'jigsaw' ? 'jigsaw-edge' : '', row % 3 === 2 && index < 72 ? 'bottom-block' : '', col % 3 === 2 ? 'right-block' : ''].filter(Boolean).join(' ')} onClick={() => setSelected(index)} aria-label={`Row ${row + 1}, column ${col + 1}, value ${value === '0' ? 'empty' : value}${conflicts.has(index) ? ', conflict' : ''}${diagonalCell ? ', on main diagonal' : ''}`}>
            {value === '0' ? '' : value}</button>
        })}
      </div>
      <div className="round1-save-status" role="status" aria-live="polite">{status === 'completed' || saveState === 'saved' ? <CircleCheck size={15} /> : saveState === 'error' ? <TriangleAlert size={15} /> : <LoaderCircle className="round1-spinner" size={15} />}<span>{saveStatus}</span></div>
      {saveMessage && <p className="round1-feedback" role="alert">{saveMessage}</p>}
      <div className="sudoku-controls"><button type="button" onClick={undo} disabled={!history.length || status === 'completed' || checkingCompletion || switchingPuzzle}><RotateCcw size={16} /> UNDO</button><button type="button" onClick={() => updateCell('0')} disabled={status === 'completed' || checkingCompletion || switchingPuzzle}><Eraser size={16} /> CLEAR</button></div>
      <div className="number-pad" aria-label="Enter a number">{'123456789'.split('').map(number => <button type="button" key={number} onClick={() => updateCell(number)} disabled={status === 'completed' || checkingCompletion || switchingPuzzle}>{number}</button>)}</div>
      <button type="button" className="round1-primary-button round1-verify-button" onClick={() => void checkSolution()} disabled={saveState !== 'saved' || status === 'completed' || checkingCompletion || switchingPuzzle}>{checkingCompletion ? <><LoaderCircle className="round1-spinner" size={16} /> VERIFYING SAVED GRID</> : status === 'completed' ? <><CircleCheck size={16} /> SOLUTION VERIFIED</> : <>VERIFY SOLUTION</>}</button>
      {saveState === 'error' && <button type="button" className="round1-retry-save" onClick={() => { setSaveMessage(''); setSaveState('pending'); setSaveAttempt(value => value + 1) }}><Save size={15} /> RETRY SAVE</button>}
      {completionMessage && <p className="round1-feedback" role={status === 'completed' ? 'status' : 'alert'}>{completionMessage}</p>}
    </div><aside className="round1-sidebar"><div className="instruction-card"><ShieldAlert size={25} /><p className="eyebrow">MISSION DIRECTIVE</p><h3>THE RULES OF LOGIC</h3><p className="round1-rule-copy">{VARIANT_INFO[activeType].instruction}</p>{activeType === 'diagonal' && <p className="round1-rule-copy">Both highlighted diagonals are additional all-different regions.</p>}{activeType === 'windoku' && <p className="round1-rule-copy">Shaded cells mark the four extra 3×3 windows.</p>}{activeType === 'jigsaw' && <p className="round1-rule-copy">Irregular regions are outlined on the board.</p>}{conflicts.size > 0 && <p className="round1-conflict-note">Rule conflicts are highlighted. No solution digits are revealed.</p>}</div><div className="evidence-locked"><Lightbulb size={26} /><p className="eyebrow">CLASSIFIED EVIDENCE</p><h3>{activePuzzle.evidence_unlocked ? 'PUZZLE SOLVED' : 'EVIDENCE LOCKED'}</h3><p>{activePuzzle.evidence_unlocked ? 'The server unlocked this puzzle’s independent evidence record. Demonstration evidence content is not configured.' : 'Solve and verify this puzzle to unlock its associated evidence record.'}</p></div></aside></section>
    {victimReveal !== null && <div className="victim-reveal-backdrop" role="presentation"><section className="victim-reveal-card" role="dialog" aria-modal="true" aria-labelledby="victim-reveal-title"><p className="eyebrow">SECURE VALIDATION COMPLETE</p><h2 id="victim-reveal-title">VICTIM FILE REVEALED</h2><div className="victim-reveal-number">{String(victimReveal).padStart(2, '0')}</div><button type="button" className="round1-primary-button" onClick={() => setVictimReveal(null)}>VIEW EVIDENCE FILE</button></section></div>}
    <footer className="round1-footer">THE HUNT FOR 18 // INVESTIGATION SYSTEM</footer>
  </main>
}
