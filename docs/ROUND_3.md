# Round 3 — THE CRYPTO PROTOCOL

**Approved design:** 27 November 2026. This cryptography challenge replaces BLIND CODE and its Python editor. No Python execution or sandbox is part of Round 3.

**Implementation status:** Local participant and organizer interfaces, a bounded browser workbench, automated math checks, and a test-only migration draft are in progress. The migration has not been applied. The hosted integration suite has not run. All challenge content currently described below is temporary demonstration content only.

## Challenge sequence

| Slot | Temporary demo challenge | Cryptographic subject | Victims |
|---|---|---|---|
| 1 | THE FRACTURED KEY | Repeating-key XOR, known plaintext, key reconstruction, message recovery | 13–14 |
| 2 | THE ENCRYPTION LABYRINTH | Multiple encoding/cipher layers and operation ordering | 15–16 |
| 3 | THE BROKEN TRUST | Small educational RSA: factorization, totient, modular inverse and decryption | 17–18 |

All three challenges are available together after organizer authorization. Their display order is randomized once per team; stable slots preserve independent progress, workspace autosave, and navigation. Each successfully server-validated challenge reveals its two associated temporary victim placeholders and one protected code fragment. The final unlock code is validated server-side, has no penalty policy, and never activates Round 4.

## Workbench

The local bounded workbench supports repeating-key XOR, ASCII byte conversion, binary/decimal/hex conversion, Base64, Vigenère, reversal, columnar transposition, bounded factorization, modular arithmetic, GCD, modular inverse, modular exponentiation, copy-between-tool operations, and a team scratchpad. It does not auto-solve challenge content or execute arbitrary code.

## Organizer configuration

The Round 3 organizer wizard edits three independent challenge drafts. It supports participant-safe preview, draft saving, answer field requirements, accepted input formats, case/whitespace rules, optional hints and configured deductions, marks, paired victims, protected code fragments, and a separate final code step. Publishing is separate from round activation. Draft edits unpublish the content; configuration becomes immutable after the round starts or team progress exists.

Expected keys, plaintexts, hint text/deductions, fragments, and the final code are held in the migration's private schema and are omitted from participant challenge-load responses. Participant submissions use security-definer RPCs. Workspace and evidence rows are team-scoped; completion rewards and hint usage are idempotent. Hint deductions are recorded server-side, but scores are neither awarded nor deducted until the shared scoring system exists.

## Migration and verification status

Draft migration: `supabase/migrations/20261127190000_round3_crypto_protocol.sql`.

After Milestone 5 integration and regression verification, the next priority is the centralized organizer dashboard, timers, shared scoring, and post-round leaderboard. Keep the Round 2 organizer interface and backend unchanged; wizard conversion is deferred.

- Linked project reference was read from the local Supabase CLI project-ref file and matched approved test project `bfzlszktufjqlfiyknga` before both remote commands.
- Supabase CLI migration history showed all prior local migrations matched the remote history and only `20261127190000_round3_crypto_protocol.sql` was pending.
- `supabase db push --dry-run --linked` listed exactly `20261127190000_round3_crypto_protocol.sql`, with no seed or role changes. Two approved apply attempts failed: the first on the CASE expression and the second because the publish function's revoke signature omitted its boolean argument. Local review corrected both issues, the `demo_only` insert column, and the publish privilege signature. Remote history still lists the migration as pending; read-only catalog checks found no Round 3 objects. The corrected draft has not been reapplied. Production was not contacted.
- The hosted Round 3 integration harness is prepared at `supabase/tests/round3-crypto-protocol.remote.mjs`, but it has not run. Approval to retry the latest correction is required before hosted tests and browser verification.
- Local math/workbench checks, lint, build, and review of the SQL draft are the verification scope for this stage; refer to `CURRENT_PROGRESS.md` for the latest outcomes.

No competition questions, answer keys, scoring policy, deduction values, duration, storyline evidence, or Round 4 activation behavior have been finalized here. The organizer must replace demo content before publication.
