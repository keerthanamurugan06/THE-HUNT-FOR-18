export type SudokuVariant = 'classic' | 'jigsaw' | 'windoku' | 'anti_knight' | 'anti_king' | 'diagonal'

export type SudokuRules = {
  classicBoxes: boolean
  windoku: boolean
  antiKnight: boolean
  antiKing: boolean
  diagonal: boolean
  jigsawRegions?: readonly number[]
}

export const VARIANT_RULES: Record<SudokuVariant, SudokuRules> = {
  classic: { classicBoxes: true, windoku: false, antiKnight: false, antiKing: false, diagonal: false },
  jigsaw: { classicBoxes: false, windoku: false, antiKnight: false, antiKing: false, diagonal: false },
  windoku: { classicBoxes: true, windoku: true, antiKnight: false, antiKing: false, diagonal: false },
  anti_knight: { classicBoxes: true, windoku: false, antiKnight: true, antiKing: false, diagonal: false },
  anti_king: { classicBoxes: true, windoku: false, antiKnight: false, antiKing: true, diagonal: false },
  diagonal: { classicBoxes: true, windoku: false, antiKnight: false, antiKing: false, diagonal: true },
}

export const VARIANT_INFO: Record<SudokuVariant, { title: string; instruction: string }> = {
  classic: { title: 'CLASSIC SUDOKU', instruction: 'Each row, column and 3×3 box contains 1–9 exactly once.' },
  jigsaw: { title: 'JIGSAW SUDOKU', instruction: 'Each row, column and outlined irregular region contains 1–9 exactly once.' },
  windoku: { title: 'WINDOKU', instruction: 'Classic Sudoku rules apply. Each shaded extra window also contains 1–9 exactly once.' },
  anti_knight: { title: 'ANTI-KNIGHT', instruction: 'Classic Sudoku rules apply. Equal digits may not be a chess knight’s move apart.' },
  anti_king: { title: 'ANTI-KING', instruction: 'Classic Sudoku rules apply. Equal digits may not touch diagonally.' },
  diagonal: { title: 'DIAGONAL SUDOKU (X-SUDOKU)', instruction: 'Classic Sudoku rules apply. Each of the two long diagonals also contains 1–9 exactly once.' },
}

export function isValidGrid(grid: string): boolean {
  return /^[0-9]{81}$/.test(grid)
}

export function isValidRegionMap(regions: readonly number[] | undefined): regions is readonly number[] {
  if (!regions || regions.length !== 81 || regions.some(region => !Number.isInteger(region) || region < 0 || region > 8)) return false
  const counts = Array(9).fill(0) as number[]
  regions.forEach(region => { counts[region] += 1 })
  if (counts.some(count => count !== 9)) return false

  for (let region = 0; region < 9; region += 1) {
    const cells = regions.flatMap((value, index) => value === region ? [index] : [])
    const reached = new Set([cells[0]])
    const queue = [cells[0]]
    while (queue.length) {
      const cell = queue.pop()!
      const row = Math.floor(cell / 9), col = cell % 9
      for (const next of cells) {
        if (reached.has(next)) continue
        const nr = Math.floor(next / 9), nc = next % 9
        if (Math.abs(row - nr) + Math.abs(col - nc) === 1) { reached.add(next); queue.push(next) }
      }
    }
    if (reached.size !== 9) return false
  }
  return true
}

const KNIGHT_MOVES: ReadonlyArray<readonly [number, number]> = [[1, 2], [2, 1], [1, -2], [2, -1], [-1, 2], [-2, 1], [-1, -2], [-2, -1]]

function unitsFor(rules: SudokuRules): number[][] {
  const units: number[][] = []
  for (let row = 0; row < 9; row += 1) units.push(Array.from({ length: 9 }, (_, col) => row * 9 + col))
  for (let col = 0; col < 9; col += 1) units.push(Array.from({ length: 9 }, (_, row) => row * 9 + col))
  if (rules.classicBoxes) {
    for (let br = 0; br < 3; br += 1) for (let bc = 0; bc < 3; bc += 1) {
      units.push(Array.from({ length: 81 }, (_, i) => i).filter(i => Math.floor(Math.floor(i / 9) / 3) === br && Math.floor((i % 9) / 3) === bc))
    }
  }
  if (rules.jigsawRegions) for (let id = 0; id < 9; id += 1) units.push(rules.jigsawRegions.flatMap((region, i) => region === id ? [i] : []))
  if (rules.windoku) for (const startRow of [1, 5]) for (const startCol of [1, 5]) {
    units.push(Array.from({ length: 81 }, (_, i) => i).filter(i => {
      const row = Math.floor(i / 9), col = i % 9
      return row >= startRow && row < startRow + 3 && col >= startCol && col < startCol + 3
    }))
  }
  if (rules.diagonal) {
    units.push(Array.from({ length: 9 }, (_, i) => i * 10))
    units.push(Array.from({ length: 9 }, (_, i) => i * 9 + 8))
  }
  return units
}

function buildPeers(rules: SudokuRules): number[][] {
  const peers = Array.from({ length: 81 }, () => new Set<number>())
  for (const unit of unitsFor(rules)) for (const cell of unit) for (const other of unit) if (cell !== other) peers[cell].add(other)
  for (let cell = 0; cell < 81; cell += 1) {
    const row = Math.floor(cell / 9), col = cell % 9
    if (rules.antiKnight) for (const [dr, dc] of KNIGHT_MOVES) {
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) peers[cell].add(nr * 9 + nc)
    }
    if (rules.antiKing) for (const dr of [-1, 1]) for (const dc of [-1, 1]) {
      const nr = row + dr, nc = col + dc
      if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) peers[cell].add(nr * 9 + nc)
    }
  }
  return peers.map(set => [...set])
}

export function getConflictingCells(board: string, rules: SudokuRules): Set<number> {
  const conflicts = new Set<number>()
  if (!isValidGrid(board)) return conflicts
  const peers = buildPeers(rules)
  for (let cell = 0; cell < 81; cell += 1) {
    const value = board[cell]
    if (value === '0') continue
    for (const other of peers[cell]) if (other > cell && board[other] === value) { conflicts.add(cell); conflicts.add(other) }
  }
  return conflicts
}

export function countSolutions(givens: string, rules: SudokuRules, limit = 2): number {
  if (!isValidGrid(givens) || limit < 1 || (rules.jigsawRegions && !isValidRegionMap(rules.jigsawRegions))) return 0
  const peers = buildPeers(rules)
  const values = givens.split('').map(Number)
  if (getConflictingCells(givens, rules).size) return 0
  let found = 0
  const search = (): void => {
    if (found >= limit) return
    let bestCell = -1, bestCandidates: number[] = []
    for (let cell = 0; cell < 81; cell += 1) {
      if (values[cell]) continue
      const used = new Set(peers[cell].map(peer => values[peer]).filter(Boolean))
      const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(value => !used.has(value))
      if (!candidates.length) return
      if (bestCell < 0 || candidates.length < bestCandidates.length) { bestCell = cell; bestCandidates = candidates }
      if (candidates.length === 1) break
    }
    if (bestCell < 0) { found += 1; return }
    for (const value of bestCandidates) { values[bestCell] = value; search(); values[bestCell] = 0; if (found >= limit) return }
  }
  search()
  return found
}

export function validatePuzzleDefinition(givens: string, solution: string, rules: SudokuRules): boolean {
  if (!isValidGrid(givens) || !isValidGrid(solution) || solution.includes('0')) return false
  for (let i = 0; i < 81; i += 1) if (givens[i] !== '0' && givens[i] !== solution[i]) return false
  return getConflictingCells(solution, rules).size === 0 && countSolutions(givens, rules, 2) === 1
}
