
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Clock3,
  RotateCcw,
  Eraser,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react'
import './Round1Page.css'

const puzzle = [
  '530070000',
  '600195000',
  '098000060',
  '800060003',
  '400803001',
  '700020006',
  '060000280',
  '000419005',
  '000080079',
]

const solution = [
  '534678912',
  '672195348',
  '198342567',
  '859761423',
  '426853791',
  '713924856',
  '961537284',
  '287419635',
  '345286179',
]

const initialBoard = puzzle.join('').split('')
const givenCells = new Set(
  initialBoard.flatMap((value, index) => value !== '0' ? [index] : [])
)

export default function Round1Page() {
  const [board, setBoard] = useState(initialBoard)
  const [selected, setSelected] = useState(2)
  const [history, setHistory] = useState<string[][]>([])
  const [seconds] = useState(1200)

  const updateCell = (value: string) => {
    if (givenCells.has(selected)) return

    setHistory(previous => [...previous, [...board]])
    setBoard(previous => {
      const next = [...previous]
      next[selected] = value
      return next
    })
  }

  const undo = () => {
    if (history.length === 0) return

    setBoard(history[history.length - 1])
    setHistory(previous => previous.slice(0, -1))
  }

  const clearCell = () => updateCell('0')

  const isConflict = (index: number) => {
    const value = board[index]
    if (value === '0') return false

    const row = Math.floor(index / 9)
    const col = index % 9

    for (let i = 0; i < 81; i++) {
      if (i === index || board[i] !== value) continue

      const otherRow = Math.floor(i / 9)
      const otherCol = i % 9

      const sameRow = row === otherRow
      const sameColumn = col === otherCol
      const sameBox =
        Math.floor(row / 3) === Math.floor(otherRow / 3) &&
        Math.floor(col / 3) === Math.floor(otherCol / 3)

      if (sameRow || sameColumn || sameBox) return true
    }

    return false
  }

  const completed = board.every(
    (value, index) => value === solution.join('')[index]
  )

  const progress = Math.round(
    (board.filter((value, index) =>
      value !== '0' && !givenCells.has(index)
    ).length / (81 - givenCells.size)) * 100
  )

  return (
    <main className="round1-page">
      <header className="round1-header">
        <Link to="/" className="round1-back">
          <ArrowLeft size={18} /> BACK TO CASE FILES
        </Link>
        <span className="round1-classification">
          CLASSIFIED // ROUND 01
        </span>
      </header>

      <section className="round1-heading">
        <p className="eyebrow">DIGITAL LOGIC TRAP</p>
        <h1>THE LOGIC <span>PROTOCOL</span></h1>
        <p>
          Every number matters. Every mistake leaves a trace.
          Solve the grid to unlock the classified evidence.
        </p>
      </section>

      <section className="round1-status">
        <div>
          <Clock3 size={18} />
          <span>TIME REMAINING</span>
          <strong>
            {Math.floor(seconds / 60).toString().padStart(2, '0')}:
            {(seconds % 60).toString().padStart(2, '0')}
          </strong>
        </div>

        <div>
          <span>PUZZLE</span>
          <strong>01 / 06</strong>
        </div>

        <div>
          <span>PROGRESS</span>
          <strong>{progress}%</strong>
        </div>
      </section>

      <section className="round1-workspace">
        <div className="sudoku-panel">
          <div className="sudoku-panel-heading">
            <div>
              <p className="eyebrow">PUZZLE 001</p>
              <h2>CLASSIC SUDOKU</h2>
            </div>
            <span className="difficulty-tag">STANDARD</span>
          </div>

          <div className="sudoku-grid" tabIndex={0}>
            {board.map((value, index) => (
              <button
                type="button"
                key={index}
                disabled={givenCells.has(index)}
                className={[
                  'sudoku-cell',
                  givenCells.has(index) ? 'given' : 'editable',
                  selected === index ? 'selected' : '',
                  isConflict(index) ? 'conflict' : '',
                  Math.floor(index / 9) % 3 === 2 && index < 72
                    ? 'bottom-block'
                    : '',
                  index % 9 === 2 || index % 9 === 5
                    ? 'right-block'
                    : '',
                ].join(' ')}
                onClick={() => setSelected(index)}
                aria-label={`Row ${Math.floor(index / 9) + 1}, column ${index % 9 + 1}, value ${value === '0' ? 'empty' : value}`}
              >
                {value === '0' ? '' : value}
              </button>
            ))}
          </div>

          <div className="sudoku-controls">
            <button type="button" onClick={undo} disabled={!history.length}>
              <RotateCcw size={16} /> UNDO
            </button>
            <button type="button" onClick={clearCell}>
              <Eraser size={16} /> CLEAR
            </button>
          </div>

          <div className="number-pad">
            {'123456789'.split('').map(number => (
              <button
                type="button"
                key={number}
                onClick={() => updateCell(number)}
              >
                {number}
              </button>
            ))}
          </div>
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
            <h3>{completed ? 'PUZZLE SOLVED' : 'EVIDENCE LOCKED'}</h3>
            <p>
              {completed
                ? 'Correct solution detected. Evidence verification will be connected next.'
                : 'Solve this puzzle to access the associated evidence file.'}
            </p>
          </div>
        </aside>
      </section>

      <footer className="round1-footer">
        THE HUNT FOR 18 // INVESTIGATION SYSTEM
      </footer>
    </main>
  )
}

