const MAX_TEXT_LENGTH = 4096
const MAX_FACTOR_INPUT = 1_000_000_000_000

function boundedText(value: string): string {
  if (value.length > MAX_TEXT_LENGTH) throw new Error('Input is too long (maximum 4096 characters).')
  return value
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(' ')
}

function parseHex(value: string): Uint8Array {
  const compact = value.replace(/\s+/g, '')
  if (compact.length % 2 || !/^[\da-f]*$/i.test(compact)) throw new Error('Enter an even number of hexadecimal digits.')
  if (compact.length > MAX_TEXT_LENGTH * 2) throw new Error('Input is too long.')
  return Uint8Array.from(compact.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16))
}

export function xorText(text: string, key: string): string {
  boundedText(text)
  if (!key) throw new Error('Enter a non-empty XOR key.')
  const input = new TextEncoder().encode(text)
  const keyBytes = new TextEncoder().encode(boundedText(key))
  if (!keyBytes.length) throw new Error('Enter a non-empty XOR key.')
  return bytesToHex(input.map((byte, index) => byte ^ keyBytes[index % keyBytes.length]))
}

export function xorHex(hex: string, key: string): string {
  const input = parseHex(hex)
  const keyBytes = new TextEncoder().encode(boundedText(key))
  if (!keyBytes.length) throw new Error('Enter a non-empty XOR key.')
  const decoded = input.map((byte, index) => byte ^ keyBytes[index % keyBytes.length])
  return new TextDecoder('utf-8', { fatal: false }).decode(decoded)
}

export function asciiToNumbers(text: string, radix: 2 | 10 | 16): string {
  boundedText(text)
  return Array.from(new TextEncoder().encode(text), (byte) => byte.toString(radix).padStart(radix === 2 ? 8 : 2, '0')).join(' ')
}

export function numbersToAscii(input: string, radix: 2 | 10 | 16): string {
  const parts = input.trim().split(/[\s,]+/).filter(Boolean)
  if (parts.length > MAX_TEXT_LENGTH) throw new Error('Input contains too many values.')
  const bytes = parts.map((part) => {
    const value = Number.parseInt(part, radix)
    if (!/^[\da-f]+$/i.test(part) || !Number.isInteger(value) || value < 0 || value > 255 || value.toString(radix) !== part.toLowerCase().replace(/^0+(?=\d)/, '')) {
      throw new Error(`Each value must be a valid ${radix === 2 ? 'binary' : radix === 10 ? 'decimal' : 'hexadecimal'} byte (0–255).`)
    }
    return value
  })
  return new TextDecoder().decode(Uint8Array.from(bytes))
}

export function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(boundedText(text))
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

export function base64Decode(text: string): string {
  if (text.length > MAX_TEXT_LENGTH * 2 || !/^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/.test(text)) throw new Error('Enter a valid Base64 string.')
  const binary = atob(text)
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

export function vigenere(text: string, key: string, decrypt = false): string {
  boundedText(text)
  const shifts = key.toUpperCase().replace(/[^A-Z]/g, '').split('').map((char) => char.charCodeAt(0) - 65)
  if (!shifts.length) throw new Error('Enter a key containing letters A–Z.')
  let index = 0
  return text.replace(/[a-z]/gi, (char) => {
    const base = char === char.toUpperCase() ? 65 : 97
    const shift = shifts[index++ % shifts.length] * (decrypt ? -1 : 1)
    return String.fromCharCode(((char.charCodeAt(0) - base + shift + 26) % 26) + base)
  })
}

export function reverseText(text: string): string {
  return Array.from(boundedText(text)).reverse().join('')
}

export function columnarTranspose(text: string, columns: number, decrypt = false): string {
  boundedText(text)
  if (!Number.isInteger(columns) || columns < 2 || columns > 64) throw new Error('Columns must be an integer from 2 to 64.')
  if (!decrypt) {
    const output: string[] = []
    for (let col = 0; col < columns; col++) for (let i = col; i < text.length; i += columns) output.push(text[i])
    return output.join('')
  }
  const rows = Math.ceil(text.length / columns)
  const shortColumns = columns * rows - text.length
  const output = Array.from({ length: text.length }, () => '')
  let cursor = 0
  for (let col = 0; col < columns; col++) {
    const length = rows - (col >= columns - shortColumns && shortColumns !== columns ? 1 : 0)
    for (let row = 0; row < length; row++) output[row * columns + col] = text[cursor++]
  }
  return output.join('')
}

export function gcd(a: number, b: number): number {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) throw new Error('Use safe integer inputs.')
  let x = Math.abs(a); let y = Math.abs(b)
  while (y) [x, y] = [y, x % y]
  return x
}

export function factorize(value: number): number[] {
  if (!Number.isSafeInteger(value) || value < 2 || value > MAX_FACTOR_INPUT) throw new Error('Factorization is limited to integers from 2 to 1,000,000,000,000.')
  let remaining = value
  const factors: number[] = []
  for (let divisor = 2; divisor * divisor <= remaining; divisor += divisor === 2 ? 1 : 2) {
    while (remaining % divisor === 0) { factors.push(divisor); remaining /= divisor }
  }
  if (remaining > 1) factors.push(remaining)
  return factors
}

export function mod(value: number, modulus: number): number {
  if (!Number.isSafeInteger(value) || !Number.isSafeInteger(modulus) || modulus < 2 || modulus > 1_000_000_000) throw new Error('Use safe integers and a modulus from 2 to 1,000,000,000.')
  return ((value % modulus) + modulus) % modulus
}

export function modularInverse(value: number, modulus: number): number {
  if (!Number.isSafeInteger(value) || !Number.isSafeInteger(modulus) || modulus < 2 || modulus > 1_000_000_000) throw new Error('Use safe integers and a modulus from 2 to 1,000,000,000.')
  let [oldR, r] = [mod(value, modulus), modulus]
  let [oldS, s] = [1, 0]
  while (r !== 0) {
    const quotient = Math.floor(oldR / r)
    ;[oldR, r] = [r, oldR - quotient * r]
    ;[oldS, s] = [s, oldS - quotient * s]
  }
  if (oldR !== 1) throw new Error('A modular inverse does not exist for these values.')
  return mod(oldS, modulus)
}

export function modularExponentiation(base: number, exponent: number, modulus: number): number {
  if (!Number.isSafeInteger(exponent) || exponent < 0 || exponent > 1_000_000_000) throw new Error('Exponent must be an integer from 0 to 1,000,000,000.')
  mod(base, modulus)
  let result = 1n; let factor = BigInt(mod(base, modulus)); let power = BigInt(exponent); const modBig = BigInt(modulus)
  while (power > 0n) { if (power & 1n) result = result * factor % modBig; factor = factor * factor % modBig; power >>= 1n }
  return Number(result)
}
