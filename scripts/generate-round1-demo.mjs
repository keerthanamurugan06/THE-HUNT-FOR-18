import { countSolutions, getConflictingCells, isValidRegionMap, validatePuzzleDefinition, VARIANT_RULES } from '../src/lib/sudoku-rules.ts'

const classicSolution = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
const regions = Array.from({ length: 81 }, (_, index) => Math.floor(Math.floor(index / 9) / 3) * 3 + Math.floor((index % 9) / 3))
;[regions[14], regions[24]] = [regions[24], regions[14]]
if (!isValidRegionMap(regions)) throw new Error('Demo Jigsaw map is not a valid connected partition')

function shuffled(values) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[values[i], values[j]] = [values[j], values[i]]
  }
  return values
}

function generateSolution(rules) {
  const cells = Array(81).fill('0')
  const peers = Array.from({ length: 81 }, () => new Set())
  const addUnit = unit => { for (const cell of unit) for (const other of unit) if (cell !== other) peers[cell].add(other) }
  for (let row = 0; row < 9; row += 1) addUnit(Array.from({ length: 9 }, (_, col) => row * 9 + col))
  for (let col = 0; col < 9; col += 1) addUnit(Array.from({ length: 9 }, (_, row) => row * 9 + col))
  if (rules.classicBoxes) for (let br = 0; br < 3; br += 1) for (let bc = 0; bc < 3; bc += 1) addUnit(Array.from({ length: 81 }, (_, i) => i).filter(i => Math.floor(Math.floor(i / 9) / 3) === br && Math.floor((i % 9) / 3) === bc))
  if (rules.jigsawRegions) for (let region = 0; region < 9; region += 1) addUnit(rules.jigsawRegions.flatMap((value, i) => value === region ? [i] : []))
  if (rules.windoku) for (const startRow of [1, 5]) for (const startCol of [1, 5]) addUnit(Array.from({ length: 81 }, (_, i) => i).filter(i => Math.floor(i / 9) >= startRow && Math.floor(i / 9) < startRow + 3 && i % 9 >= startCol && i % 9 < startCol + 3))
  if (rules.diagonal) {
    addUnit(Array.from({ length: 9 }, (_, i) => i * 10))
    addUnit(Array.from({ length: 9 }, (_, i) => i * 9 + 8))
  }
  const knight = [[1,2],[2,1],[1,-2],[2,-1],[-1,2],[-2,1],[-1,-2],[-2,-1]]
  for (let cell = 0; cell < 81; cell += 1) {
    const row = Math.floor(cell / 9), col = cell % 9
    if (rules.antiKnight) for (const [dr, dc] of knight) if (row + dr >= 0 && row + dr < 9 && col + dc >= 0 && col + dc < 9) peers[cell].add((row + dr) * 9 + col + dc)
    if (rules.antiKing) for (const dr of [-1, 1]) for (const dc of [-1, 1]) if (row + dr >= 0 && row + dr < 9 && col + dc >= 0 && col + dc < 9) peers[cell].add((row + dr) * 9 + col + dc)
  }
  function search() {
    let best = -1, options = []
    for (let cell = 0; cell < 81; cell += 1) {
      if (cells[cell] !== '0') continue
      const used = new Set([...peers[cell]].map(peer => cells[peer]).filter(value => value !== '0'))
      const candidates = shuffled(['1','2','3','4','5','6','7','8','9'].filter(value => !used.has(value)))
      if (!candidates.length) return false
      if (best < 0 || candidates.length < options.length) { best = cell; options = candidates }
      if (options.length === 1) break
    }
    if (best < 0) return true
    for (const value of options) {
      cells[best] = value
      if (search()) return true
      cells[best] = '0'
    }
    return false
  }
  if (!search()) throw new Error('Could not generate a solution for selected rules')
  return cells.join('')
}

function makePuzzle(solution, rules) {
  const cells = solution.split('')
  for (const index of shuffled(Array.from({ length: 81 }, (_, i) => i))) {
    if (cells.filter(value => value !== '0').length <= 30) break
    const old = cells[index]
    cells[index] = '0'
    if (countSolutions(cells.join(''), rules, 2) !== 1) cells[index] = old
  }
  const givens = cells.join('')
  if (!validatePuzzleDefinition(givens, solution, rules)) throw new Error('Generated puzzle failed uniqueness validation')
  return { givens, solution, given_count: givens.replaceAll('0', '').length }
}

const puzzles = {}
for (const type of ['classic', 'jigsaw', 'windoku', 'anti_knight', 'anti_king', 'diagonal']) {
  const rules = type === 'jigsaw' ? { ...VARIANT_RULES.jigsaw, jigsawRegions: regions } : VARIANT_RULES[type]
  console.error(`Generating ${type}`)
  const solution = type === 'jigsaw' ? classicSolution : generateSolution(rules)
  puzzles[type] = { ...makePuzzle(solution, rules), ...(type === 'jigsaw' ? { regions } : {}) }
  console.error(`${type}: ${puzzles[type].given_count} clues; unique solution verified`)
}
process.stdout.write(`${JSON.stringify(puzzles)}\n`)
