import assert from 'node:assert/strict'
import {
  asciiToNumbers, base64Decode, base64Encode, columnarTranspose, factorize,
  gcd, modularExponentiation, modularInverse, numbersToAscii, reverseText,
  vigenere, xorHex, xorText,
} from '../src/lib/crypto-tools.ts'

assert.equal(xorHex(xorText('HELLO', 'KEY'), 'KEY'), 'HELLO')
assert.equal(numbersToAscii(asciiToNumbers('A z', 2), 2), 'A z')
assert.equal(numbersToAscii(asciiToNumbers('A z', 10), 10), 'A z')
assert.equal(numbersToAscii(asciiToNumbers('A z', 16), 16), 'A z')
assert.equal(base64Decode(base64Encode('Cryptography — café')), 'Cryptography — café')
assert.equal(vigenere('LXFOPVEFRNHR', 'LEMON', true), 'ATTACKATDAWN')
assert.equal(vigenere(vigenere('Attack at Dawn!', 'LEMON'), 'LEMON', true), 'Attack at Dawn!')
assert.equal(reverseText('A🙂B'), 'B🙂A')
const transposed = columnarTranspose('WEAREDISCOVERED', 4)
assert.equal(columnarTranspose(transposed, 4, true), 'WEAREDISCOVERED')
assert.deepEqual(factorize(8051), [83, 97])
assert.equal(gcd(240, 46), 2)
assert.equal(modularInverse(17, 3120), 2753)
assert.equal(modularExponentiation(65, 17, 3233), 2790)
assert.equal(modularExponentiation(2790, 2753, 3233), 65)
assert.equal(xorHex('1b 06 17 1c 04 02 74 79 7e 64 65 7c 77 6f 17 00 08 0c 1f 68 19 07 11 68 08 0e 07 1c 6d 18 1d 06 0a 61', 'MOTH'), 'VICTIM 13+14: CHECK THE EAST WING.')
const layered = base64Decode('Lk5WUlYgQUQgSVZaSkpaViBJSEsgOjYxKzUxIFVUUU9HSU0=')
assert.equal(reverseText(vigenere(layered, 'ARCHIVE', true)), 'VICTIMS 15+16: THE ARCHIVE IS OPEN.')
assert.deepEqual(factorize(3233), [53, 61])
assert.equal(modularInverse(17, 3120), 2753)
assert.throws(() => modularInverse(6, 15), /does not exist/)
assert.throws(() => factorize(1_000_000_000_001), /limited/)
assert.throws(() => base64Decode('not base64!'), /valid Base64/)
console.log('Crypto tool checks passed.')
