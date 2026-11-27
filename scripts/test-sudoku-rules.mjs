import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { countSolutions, getConflictingCells, isValidRegionMap, validatePuzzleDefinition, VARIANT_RULES } from '../src/lib/sudoku-rules.ts'

const classicGivens = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
const classicSolution = '534678912672195348198342567859761423426853791713924856961537284287419635345286179'
assert.equal(countSolutions(classicGivens, VARIANT_RULES.classic), 1)
assert.equal(validatePuzzleDefinition(classicGivens, classicSolution, VARIANT_RULES.classic), true)
assert.equal(validatePuzzleDefinition(classicGivens, classicSolution, VARIANT_RULES.diagonal), false)

const rowConflict = Array(81).fill('0'); rowConflict[0] = '4'; rowConflict[8] = '4'
assert.deepEqual([...getConflictingCells(rowConflict.join(''), VARIANT_RULES.classic)].sort((a, b) => a - b), [0, 8])
const knightConflict = Array(81).fill('0'); knightConflict[2] = '7'; knightConflict[13] = '7'
assert.equal(getConflictingCells(knightConflict.join(''), VARIANT_RULES.anti_knight).size, 2)
assert.equal(getConflictingCells(knightConflict.join(''), VARIANT_RULES.classic).size, 0)
const kingConflict = Array(81).fill('0'); kingConflict[20] = '5'; kingConflict[30] = '5'
assert.equal(getConflictingCells(kingConflict.join(''), VARIANT_RULES.anti_king).size, 2)
assert.equal(getConflictingCells(kingConflict.join(''), VARIANT_RULES.classic).size, 0)
const windokuConflict = Array(81).fill('0'); windokuConflict[10] = '3'; windokuConflict[30] = '3'
assert.equal(getConflictingCells(windokuConflict.join(''), VARIANT_RULES.windoku).size, 2)
assert.equal(getConflictingCells(windokuConflict.join(''), VARIANT_RULES.classic).size, 0)
const diagonalConflict = Array(81).fill('0'); diagonalConflict[0] = '8'; diagonalConflict[40] = '8'
assert.equal(getConflictingCells(diagonalConflict.join(''), VARIANT_RULES.diagonal).size, 2)
assert.equal(getConflictingCells(diagonalConflict.join(''), VARIANT_RULES.classic).size, 0)
const classicBoxes = Array.from({ length: 81 }, (_, i) => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3))
assert.equal(isValidRegionMap(classicBoxes), true)
assert.equal(isValidRegionMap(Array(81).fill(0)), false)

const migration = readFileSync(new URL('../supabase/migrations/20261127160000_round1_open_challenge.sql', import.meta.url), 'utf8')
const seedStart = migration.indexOf('-- Verified temporary demonstration puzzle candidates.')
assert.notEqual(seedStart, -1)
const seedSql = migration.slice(seedStart)
const seedPattern = /\('([^']+)', '([0-9]{81})', '([1-9]{81})', '([^']+)', true, (array\[[0-8,]+\]::integer\[\]|null)\)/g
const seeds = [...seedSql.matchAll(seedPattern)]
assert.equal(seeds.length, 6)
assert.deepEqual(new Set(seeds.map(seed => seed[1])), new Set(Object.keys(VARIANT_RULES)))
for (const [, type, givens, solution, , regionSql] of seeds) {
  const regions = regionSql === 'null' ? undefined : regionSql.slice(6, regionSql.indexOf(']')).split(',').map(Number)
  const rules = type === 'jigsaw' ? { ...VARIANT_RULES.jigsaw, jigsawRegions: regions } : VARIANT_RULES[type]
  assert.equal(validatePuzzleDefinition(givens, solution, rules), true, `${type} demo definition must be valid and unique`)
}
const jigsawSeed = seeds.find(seed => seed[1] === 'jigsaw')
assert.ok(jigsawSeed)
const jigsawRegions = jigsawSeed[5].slice(6, jigsawSeed[5].indexOf(']')).split(',').map(Number)
assert.equal(isValidRegionMap(jigsawRegions), true)
const jigsawCells = Array(81).fill('0')
let jigsawPair
for (let first = 0; first < 81 && !jigsawPair; first += 1) for (let second = first + 1; second < 81; second += 1) {
  if (jigsawRegions[first] === jigsawRegions[second]
    && Math.floor(first / 9) !== Math.floor(second / 9)
    && first % 9 !== second % 9) { jigsawPair = [first, second]; break }
}
assert.ok(jigsawPair)
jigsawCells[jigsawPair[0]] = '9'; jigsawCells[jigsawPair[1]] = '9'
assert.equal(getConflictingCells(jigsawCells.join(''), { ...VARIANT_RULES.jigsaw, jigsawRegions }).size, 2)
console.log('All six migration puzzle definitions pass exact-one-solution validation.')
console.log('Sudoku rules checks passed (Classic uniqueness, grid validation, row/box, Windoku, Anti-Knight, Anti-King, Diagonal).')
