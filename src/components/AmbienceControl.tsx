import { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const MUTED_KEY = 'hunt18-ambience-muted'

export function AmbienceControl() {
  const [muted, setMuted] = useState(() => sessionStorage.getItem(MUTED_KEY) !== 'false')
  const contextRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    sessionStorage.setItem(MUTED_KEY, String(muted))
  }, [muted])

  useEffect(() => () => {
    void contextRef.current?.close()
  }, [])

  const startAmbience = () => {
    if (contextRef.current) {
      void contextRef.current.resume()
      gainRef.current?.gain.setTargetAtTime(0.10, contextRef.current.currentTime, 0.8)
      return
    }

    const AudioContextConstructor = window.AudioContext
    if (!AudioContextConstructor) return

    const context = new AudioContextConstructor()
    const gain = context.createGain()
    gain.gain.value = 0.10

    const lowTone = context.createOscillator()
    const lowGain = context.createGain()
    lowTone.type = 'sine'
    lowTone.frequency.value = 55
    lowGain.gain.value = 0.38

    const highTone = context.createOscillator()
    const highGain = context.createGain()
    highTone.type = 'triangle'
    highTone.frequency.value = 82.41
    highGain.gain.value = 0.08

    lowTone.connect(lowGain).connect(gain)
    highTone.connect(highGain).connect(gain)
    gain.connect(context.destination)
    lowTone.start()
    highTone.start()

    contextRef.current = context
    gainRef.current = gain
  }

  const toggleMuted = () => {
    if (muted) {
      startAmbience()
      setMuted(false)
    } else {
      if (contextRef.current && gainRef.current) {
        gainRef.current.gain.setTargetAtTime(0, contextRef.current.currentTime, 0.25)
      }
      setMuted(true)
    }
  }

  return (
    <button
      type="button"
      className="ambience-control"
      onClick={toggleMuted}
      aria-pressed={!muted}
      aria-label={muted ? 'Unmute investigation ambience' : 'Mute investigation ambience'}
      title={muted ? 'Enable investigation ambience' : 'Mute investigation ambience'}
    >
      {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
      <span>{muted ? 'AMBIENCE OFF' : 'AMBIENCE ON'}</span>
    </button>
  )
}
