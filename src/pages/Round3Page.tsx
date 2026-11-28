import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Clipboard, LoaderCircle, ShieldCheck, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { clearTeamDraft, readTeamDrafts, teamDraftKey, writeTeamDraft } from '../lib/team-drafts'
import { asciiToNumbers, base64Decode, base64Encode, columnarTranspose, factorize, gcd, modularExponentiation, modularInverse, mod, numbersToAscii, reverseText, vigenere, xorHex, xorText } from '../lib/crypto-tools'
import './Round3Page.css'
import './Round3SaveExtra.css'
import './Round3EffectsExtra.css'

type Hint = { index: number; text: string; configured_deduction: number }
type Challenge = { slot: number; title: string; description: string; difficulty: string; encrypted_content: string; known_plaintext: string[]; clue: string; accepted_formats: string[]; display_order: number; completed: boolean; fragment: string | null; victims: number[]; workspace: Workspace; hints: Hint[]; hint_count: number; hint_available_count: number; is_demo_only: boolean }
type Workspace = { scratchpad: string; key: string; plaintext: string }
type Board = { round_status: string; is_demo_only: boolean; final_code_available: boolean; final_code_complete: boolean; challenges: Challenge[] }
type ToolName = 'xor' | 'ascii' | 'base64' | 'vigenere' | 'reverse' | 'transpose' | 'factor' | 'modular' | 'scratchpad'

const tools: { id: ToolName; label: string }[] = [
  { id: 'xor', label: 'XOR' }, { id: 'ascii', label: 'ASCII / RADIX' }, { id: 'base64', label: 'BASE64' },
  { id: 'vigenere', label: 'VIGENERE' }, { id: 'reverse', label: 'REVERSE' }, { id: 'transpose', label: 'TRANSPOSITION' },
  { id: 'factor', label: 'FACTOR LAB' }, { id: 'modular', label: 'MODULAR MATH' }, { id: 'scratchpad', label: 'SCRATCHPAD' },
]

export default function Round3Page() {
  const [board, setBoard] = useState<Board | null>(null); const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [status, setStatus] = useState('')
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const selectedRef = useRef<number|null>(null); const workspaceRef = useRef<Record<number,Workspace>>({})
  const localDraftKey = useRef<string | null>(null); const [saveAttempt, setSaveAttempt] = useState(0)
  const [tool, setTool] = useState<ToolName>('xor'); const [input, setInput] = useState(''); const [key, setKey] = useState(''); const [parameter, setParameter] = useState(''); const [output, setOutput] = useState('')
  const [answerFormat, setAnswerFormat] = useState('text')
  const [draft, setDraft] = useState<Workspace>({ scratchpad: '', key: '', plaintext: '' }); const [finalCode, setFinalCode] = useState('')
  const current = useMemo(() => board?.challenges.find(challenge => challenge.slot === selected), [board, selected])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error: rpcError } = await supabase.rpc('load_round3_challenges')
    if (rpcError) setError(rpcError.code === '42501' ? 'Round 3 is not currently authorized for participant access.' : 'The case files could not be loaded.')
    else {
      const next = data as Board
      const { data: auth } = await supabase.auth.getUser()
      localDraftKey.current = auth.user ? teamDraftKey(3, auth.user.id) : null
      const cached = localDraftKey.current ? readTeamDrafts<Workspace>(localDraftKey.current) : {}
      setBoard(next)
      const chosen = selectedRef.current && next.challenges.some(challenge => challenge.slot === selectedRef.current) ? selectedRef.current : next.challenges[0]?.slot ?? null
      selectedRef.current = chosen; setSelected(chosen)
      workspaceRef.current = Object.fromEntries(next.challenges.map(challenge => {
        const remote = challenge.workspace ?? {scratchpad:'',key:'',plaintext:''}
        const local = cached[String(challenge.slot)]
        const restored = local && ['scratchpad','key','plaintext'].every(field => typeof local[field as keyof Workspace] === 'string') ? local : remote
        return [challenge.slot, workspaceRef.current[challenge.slot] ?? restored]
      }))
      if (chosen !== null) setDraft(workspaceRef.current[chosen])
      const chosenChallenge=next.challenges.find(challenge=>challenge.slot===chosen)
      if(chosenChallenge?.accepted_formats.length)setAnswerFormat(chosenChallenge.accepted_formats[0])
    }
    setLoading(false)
  }, [])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  useEffect(() => {
    if (!current || current.completed) return
    const snapshot = { ...draft }
    const timer = window.setTimeout(() => {
      setSaveState('saving')
      void supabase.rpc('save_round3_workspace', { p_slot: current.slot, p_workspace: snapshot }).then(({ error: saveError }) => {
        if (saveError) { setSaveState('error'); setError('Autosave could not reach the evidence archive. Your current work remains on screen; check your connection.') }
        else { setSaveState('saved'); if (localDraftKey.current) clearTeamDraft(localDraftKey.current, String(current.slot), snapshot) }
      })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [draft, current, saveAttempt])

  useEffect(() => {
    const retryOnReconnect = () => { if (navigator.onLine) setSaveAttempt(value => value + 1) }
    window.addEventListener('online', retryOnReconnect)
    return () => window.removeEventListener('online', retryOnReconnect)
  }, [])

  const updateWorkspace = (update: (workspace: Workspace) => Workspace) => {
    if (selected === null) return
    const next = update(workspaceRef.current[selected] ?? draft)
    workspaceRef.current = { ...workspaceRef.current, [selected]: next }
    if (localDraftKey.current) writeTeamDraft(localDraftKey.current, String(selected), next)
    setDraft(next)
  }
  const switchChallenge = async (challenge: Challenge) => {
    if (challenge.slot === selected) return
    if (current) setBusy(true)
    if (current && !current.completed) {
      setSaveState('saving')
      const { error: saveError } = await supabase.rpc('save_round3_workspace', { p_slot: current.slot, p_workspace: workspaceRef.current[current.slot] ?? draft })
      if (saveError) { setSaveState('error'); setError('The current case remains open because the archive could not confirm its save. Check the connection and try switching again.'); setBusy(false); return }
      else { setSaveState('saved'); if (localDraftKey.current) clearTeamDraft(localDraftKey.current, String(current.slot), workspaceRef.current[current.slot] ?? draft) }
    }
    const workspace = workspaceRef.current[challenge.slot] ?? challenge.workspace ?? {scratchpad:'',key:'',plaintext:''}
    selectedRef.current = challenge.slot; setDraft(workspace)
    setSelected(challenge.slot); setAnswerFormat(challenge.accepted_formats[0]??'text'); setError(''); setStatus(''); setBusy(false)
  }

  const runTool = () => {
    try {
      let result = ''
      if (tool === 'xor') result = parameter === 'decode' ? xorHex(input, key) : xorText(input, key)
      else if (tool === 'ascii') result = parameter === 'decode' ? numbersToAscii(input, Number(key) as 2 | 10 | 16) : asciiToNumbers(input, Number(key) as 2 | 10 | 16)
      else if (tool === 'base64') result = parameter === 'decode' ? base64Decode(input) : base64Encode(input)
      else if (tool === 'vigenere') result = vigenere(input, key, parameter === 'decode')
      else if (tool === 'reverse') result = reverseText(input)
      else if (tool === 'transpose') result = columnarTranspose(input, Number(key), parameter === 'decode')
      else if (tool === 'factor') result = factorize(Number(input)).join(' × ')
      else if (tool === 'modular') {
        const [base, exponent, modulus] = input.split(/[\s,]+/).map(Number)
        if (parameter === 'gcd') result = String(gcd(base, exponent))
        else if (parameter === 'inverse') result = String(modularInverse(base, exponent))
        else if (parameter === 'power') result = String(modularExponentiation(base, exponent, modulus))
        else result = String(mod(base, exponent))
      }
      setOutput(result); setStatus('TOOL RESULT READY. Review it before adding it to your notes.')
    } catch (caught) { setOutput(''); setError(caught instanceof Error ? caught.message : 'This operation could not be completed.') }
  }
  const copyOutput = async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    if (tool === 'scratchpad') updateWorkspace(value => ({ ...value, scratchpad: `${value.scratchpad}${value.scratchpad ? '\n' : ''}${output}` }))
    else setInput(output)
    setStatus('RESULT COPIED TO THE ACTIVE WORK AREA.')
  }
  const submitChallenge = async (event: FormEvent) => {
    event.preventDefault(); if (!current) return; setBusy(true); setError(''); setStatus('')
    const { data, error: submitError } = await supabase.rpc('submit_round3_challenge', { p_slot: current.slot, p_key: draft.key, p_plaintext: draft.plaintext, p_answer_format: answerFormat })
    if (submitError) setError('The challenge could not be validated. Confirm Round 3 access and try again.')
    else if (!(data as { correct?: boolean })?.correct) setStatus('THE SUBMITTED SOLUTION DOES NOT MATCH. Review your work and try again.')
    else { setStatus('SERVER VALIDATION CONFIRMED. TWO VICTIM FILES AND A CODE FRAGMENT ARE NOW UNLOCKED.'); await load() }
    setBusy(false)
  }
  const requestHint = async () => {
    if (!current) return; setBusy(true); setError(''); setStatus('')
    const { data, error: hintError } = await supabase.rpc('request_round3_hint', { p_slot: current.slot, p_hint_index: current.hint_count + 1 })
    if (hintError) setError('A hint is not available for this file.')
    else { const hint = data as { text: string; configured_deduction: number; already_used?: boolean }; setStatus(`${hint.already_used ? 'PREVIOUSLY UNLOCKED' : 'HINT UNLOCKED'} — ${hint.text}${hint.configured_deduction ? ` (Configured deduction recorded: ${hint.configured_deduction}; score application is pending shared scoring.)` : ''}`); await load() }
    setBusy(false)
  }
  const submitFinal = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setStatus('')
    const { data, error: finalError } = await supabase.rpc('submit_round3_final_code', { p_code: finalCode })
    if (finalError) setError('The final unlock code could not be checked.')
    else if (data) setStatus('FINAL CODE VERIFIED. ROUND 4 REMAINS UNDER ORGANIZER CONTROL.')
    else setStatus('THE FINAL CODE DOES NOT MATCH. You may try again without a penalty.')
    await load(); setBusy(false)
  }

  return <main className="round3-page">
    <header className="round3-header"><Link to="/team" className="wordmark">THE HUNT <span>FOR 18</span></Link><span><ShieldCheck size={15}/> SECURE INVESTIGATION</span></header>
    <section className="round3-intro"><p className="eyebrow">ROUND 03 // THE CRYPTO PROTOCOL</p><h1>BREAK THE <span>CIPHER</span></h1><p>Recover three sealed messages, reconstruct the evidence, and assemble the final unlock code. Each challenge is an independent case file.</p>{board&&<p className="round3-timer-placeholder">ROUND ACCESS: {board.round_status.toUpperCase()} · TIMER: ORGANIZER CONTROLLED</p>}</section>
    {loading ? <p className="round3-loading"><LoaderCircle className="round3-spin"/> RESTORING CRYPTOGRAPHIC CASE FILES</p> : error && !board ? <p role="alert" className="auth-error">{error}</p> : board && <>
      <div className="round3-layout"><nav className="round3-files" aria-label="Round 3 challenge files">{[...board.challenges].sort((a,b)=>a.display_order-b.display_order).map(challenge => <button key={challenge.slot} className={`round3-file-tab ${selected===challenge.slot?'active':''} ${challenge.completed?'complete':''}`} onClick={()=>void switchChallenge(challenge)} disabled={busy}><span>{String(challenge.display_order).padStart(2,'0')}</span><strong>{challenge.title}</strong><small>{challenge.completed?'COMPLETE':challenge.difficulty.toUpperCase()}</small>{challenge.completed?<Check size={16}/>:<ArrowRight size={16}/>}</button>)}</nav>
        <section className="round3-case">{current ? <>
          <p className="eyebrow">SEALED FILE {String(current.slot).padStart(2,'0')} // {current.difficulty.toUpperCase()}</p><h2>{current.title}</h2><p>{current.description}</p>
          <div className="round3-evidence"><h3>ENCRYPTED EVIDENCE</h3><pre>{current.encrypted_content}</pre></div>
          <aside className="round3-clue"><strong>INVESTIGATION CLUE</strong><p>{current.clue}</p></aside>
          {current.completed?<><label className="round3-field">KEY ENTRY<input value={draft.key} autoComplete="off" disabled/></label><label className="round3-field">DECRYPTED ANSWER ENTRY<textarea value={draft.plaintext} autoComplete="off" disabled/></label><div className="round3-reward" role="status"><Check/> SERVER VERIFIED — VICTIMS {current.victims.map(number=>String(number).padStart(2,'0')).join(' AND ')} DISCOVERED <br/>RECOVERED CODE FRAGMENT: <strong>{current.fragment}</strong></div></>:<form className="round3-submit" onSubmit={event=>void submitChallenge(event)}><label className="round3-field">KEY ENTRY<input value={draft.key} onChange={event=>updateWorkspace(value=>({...value,key:event.target.value}))} autoComplete="off" maxLength={512} disabled={busy}/></label><label className="round3-field">DECRYPTED ANSWER ENTRY<textarea value={draft.plaintext} onChange={event=>updateWorkspace(value=>({...value,plaintext:event.target.value}))} autoComplete="off" maxLength={6000} disabled={busy}/></label><button className="hunt-button" type="submit" disabled={busy}>{busy?'VALIDATING WITH SECURE ARCHIVE':'SUBMIT ANSWERS'}</button></form>}
          {current.hint_available_count>0&&<section className="round3-hints"><h3>OPTIONAL INVESTIGATION HINTS</h3>{current.hints.map(hint=><p key={hint.index}><strong>HINT {hint.index}:</strong> {hint.text}{hint.configured_deduction?` — configured deduction ${hint.configured_deduction} recorded.`:''}</p>)}{!current.completed&&current.hint_count<current.hint_available_count&&<button className="round3-copy" onClick={()=>void requestHint()} disabled={busy}>REQUEST NEXT HINT</button>}</section>}
          <details className="round3-player-advanced"><summary>ADVANCED INVESTIGATION TOOLS</summary>{current.known_plaintext.length>0&&<div className="round3-known"><h3>KNOWN-PLAINTEXT FRAGMENTS</h3>{current.known_plaintext.map((part,index)=><code key={index}>{part}</code>)}</div>}<div className="round3-workbench"><div className="round3-workbench-title"><Wrench size={16}/><h3>CRYPTOGRAPHY WORKBENCH</h3></div><div className="round3-tool-tabs">{tools.map(item=><button key={item.id} className={tool===item.id?'active':''} onClick={()=>{setTool(item.id);setOutput('')}}>{item.label}</button>)}</div>{tool==='scratchpad'?<label className="round3-field">TEAM SCRATCHPAD<textarea value={draft.scratchpad} onChange={event=>updateWorkspace(value=>({...value,scratchpad:event.target.value}))} maxLength={12000} placeholder="Notes are autosaved to this team case file."/></label>:<div className="round3-tool-form"><label className="round3-field">INPUT<textarea value={input} onChange={event=>setInput(event.target.value)} maxLength={4096}/></label>{['xor','ascii','vigenere','transpose','modular'].includes(tool)&&<label className="round3-field">KEY / PARAMETER<input value={key} onChange={event=>setKey(event.target.value)}/></label>}<label className="round3-field">ACTION<select value={parameter} onChange={event=>setParameter(event.target.value)}><option value="">Default operation</option><option value="decode">Decode / Decrypt</option>{tool==='modular'&&<><option value="gcd">GCD</option><option value="inverse">Modular inverse</option><option value="power">Modular exponentiation</option></>}</select></label><div className="round3-tool-actions"><button type="button" className="hunt-button" onClick={runTool}>RUN TOOL</button><button type="button" className="round3-copy" onClick={()=>void copyOutput()} disabled={!output}><Clipboard size={15}/> COPY TO INPUT / NOTES</button></div>{output&&<output className="round3-output" aria-live="polite">{output}</output>}</div>}</div><p className={`round3-save-state ${saveState}`} role="status">{saveState==='saving'?'SAVING TEAM CASE WORKSPACE…':saveState==='saved'?'WORKSPACE SAVED':saveState==='error'?'WORKSPACE SAVE NEEDS RETRY':''}</p></details>
        </>:<p>Select a case file.</p>}</section></div>
      {error&&<p className="round3-message error" role="alert">{error}</p>}{status&&<p className="round3-message" role="status">{status}</p>}
      <section className="round3-final"><p className="eyebrow">FINAL RECOVERED CODE</p><h2>THREE FRAGMENTS. ONE ACCESS CODE.</h2>{board.challenges.filter(challenge=>challenge.completed).length<3?<p>Complete all three independent challenges to reveal the code fragments and enable verification.</p>:board.final_code_complete?<strong>FINAL CODE VERIFIED — ROUND 4 REMAINS LOCKED UNTIL THE ORGANIZER AUTHORIZES IT.</strong>:<form onSubmit={event=>void submitFinal(event)}><label className="round3-field">FINAL UNLOCK CODE<input value={finalCode} onChange={event=>setFinalCode(event.target.value)} required autoComplete="off"/></label><button className="hunt-button" disabled={busy}>{busy?'VERIFYING':'VERIFY FINAL CODE'}</button><small>Attempts are unlimited. Verification never activates Round 4.</small></form>}</section>
    </>}
    <footer><Link to="/team">RETURN TO TEAM FILES</Link></footer>
  </main>
}
