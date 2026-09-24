import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DriverFrame, PreviewDriver } from '../driver'
import { findActiveIndex } from '../manifest'
import type { ResolvedManifest } from '../types'

export type PlaybackStatus = 'idle' | 'playing' | 'ended'

/**
 * Bridges the things that can advance the timeline — the `<audio>` element and
 * a [`PreviewDriver`](../driver.ts) — into a single `currentTime` value.
 *
 * The clock is always the audio element when the project has audio (it is the
 * most accurate source), and a `requestAnimationFrame` wall clock otherwise.
 * The driver, when present, is pushed every frame so the canvas tracks the
 * clock exactly.
 */
export interface PlaybackEngine {
  currentTime: number
  duration: number
  status: PlaybackStatus
  activeSceneIndex: number
  activeSubtitleIndex: number
  /** id of the audio element currently in charge, for the footer readout */
  audioSrc?: string
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  goToScene: (index: number) => void
  nextScene: () => void
  prevScene: () => void
  restart: () => void
  volume: number
  setVolume: (v: number) => void
  muted: boolean
  setMuted: (m: boolean) => void
  /** Bumped whenever the host asks for a source reload. */
  reloadToken: number
  reloadSource: () => void
  /** Attach the footer audio element. */
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
  /** The instant currently being displayed, pre-resolved for the driver. */
  frame: DriverFrame
}

export interface PlaybackOptions {
  manifest: ResolvedManifest
  /** Map from manifest-relative audio path to a playable url. */
  resolveAsset?: (path: string) => string
  /** Auto-play as soon as the studio mounts. */
  autoPlay?: boolean
  /** How the preview canvas is painted. Omit for an audio-only studio. */
  driver?: PreviewDriver
}

export function usePlaybackEngine({
  manifest,
  resolveAsset = (p) => p,
  autoPlay = false,
  driver,
}: PlaybackOptions): PlaybackEngine {
  const duration = manifest.duration
  const frameRate = manifest.meta.frameRate

  const [currentTime, setCurrentTime] = useState(0)
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  /**
   * The driver is read through a ref so that a host re-creating it on every
   * render does not restart the clock or re-run the sync effects.
   */
  const driverRef = useRef(driver)
  driverRef.current = driver

  const frame = useMemo<DriverFrame>(
    () => ({
      time: currentTime,
      frame: Math.round(currentTime * frameRate),
      frameRate,
      duration,
    }),
    [currentTime, frameRate, duration],
  )

  /**
   * Single funnel for every driver call. Each entry point renders from an
   * absolute instant, so the canvas can never disagree with the transport.
   */
  const emit = useCallback((kind: 'seek' | 'play' | 'pause', next: DriverFrame) => {
    const target = driverRef.current
    if (!target) return
    if (target.isReady && !target.isReady()) return
    if (kind === 'play') target.play?.(next)
    else if (kind === 'pause') target.pause?.(next)
    else target.seek(next)
  }, [])


  const activeSceneIndex = findActiveIndex(manifest.scenes, currentTime)
  const activeSubtitleIndex = findActiveIndex(manifest.subtitles, currentTime)

  /** Scene audio wins over the global track; it is the per-shot voice-over. */
  const audioSrc = useMemo(() => {
    const sceneAudio = manifest.scenes[activeSceneIndex]?.audio
    const picked = sceneAudio ?? manifest.audio
    return picked ? resolveAsset(picked) : undefined
  }, [manifest.scenes, manifest.audio, activeSceneIndex, resolveAsset])

  /* ------------------------------------------------------------------ */
  /* Clock                                                               */
  /* ------------------------------------------------------------------ */

  const rafRef = useRef<number>(0)
  const wallClockStartRef = useRef<{ at: number; from: number } | null>(null)

  const stopWallClock = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    wallClockStartRef.current = null
  }, [])

  const startWallClock = useCallback(
    (from: number) => {
      stopWallClock()
      wallClockStartRef.current = { at: performance.now(), from }
      const tick = () => {
        const start = wallClockStartRef.current
        if (!start) return
        const elapsed = (performance.now() - start.at) / 1000
        const next = start.from + elapsed
        if (next >= duration) {
          setCurrentTime(duration)
          setStatus('ended')
          stopWallClock()
          return
        }
        setCurrentTime(next)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [duration, stopWallClock],
  )

  /**
   * The audio element is the authority whenever it has a src; the rAF clock is
   * a fallback for silent projects. This keeps scrubbing and seeking honest
   * even when the browser stalls on a decode.
   */
  const hasAudio = !!audioSrc

  /**
   * True while the media element can represent the position we are asking for.
   *
   * Audio shorter than the timeline is common — a TTS track that skips a shot,
   * a clipped file, a placeholder. The element clamps `currentTime` to its own
   * duration, so trusting it blindly pins the transport at the end of the
   * audio: the canvas would jump to a late scene while the progress bar stuck
   * at, say, 00:08. Once we detect that, the wall clock takes over so the rest
   * of the timeline stays reachable.
   */
  const audioUsable = useRef(true)

  useEffect(() => {
    const audio = audioRef.current
    if (!hasAudio || !audio) return
    const onTime = () => {
      // A backwards jump we did not ask for means the element ran out of
      // media and is reporting its clamped position.
      if (audioUsable.current && audio.currentTime >= audio.duration - 0.05) {
        audioUsable.current = false
      }
      if (audioUsable.current) setCurrentTime(audio.currentTime)
    }
    const onEnded = () => {
      // Only the end of the whole timeline ends playback. Reaching the end of
      // a short audio track must not stop the transport.
      if (duration - audio.currentTime <= 0.25) {
        setStatus('ended')
        setCurrentTime(duration)
      } else {
        audioUsable.current = false
        startWallClock(audio.currentTime)
      }
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [hasAudio, audioSrc, duration, startWallClock])

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), duration)
      setCurrentTime(clamped)
      const audio = audioRef.current
      if (audio && audio.src) {
        // Re-arm the element whenever we seek somewhere it can actually reach,
        // so a short track recovers if the user returns to covered ground.
        if (clamped < audio.duration - 0.05) audioUsable.current = true
        try {
          audio.currentTime = clamped
        } catch {
          /* seeking before metadata is ready is a no-op, the effect re-syncs */
        }
      }
      if (status === 'playing') startWallClock(clamped)
      else stopWallClock()
      emit('seek', {
        time: clamped,
        frame: Math.round(clamped * frameRate),
        frameRate,
        duration,
      })
    },
    [duration, frameRate, status, startWallClock, stopWallClock, emit, hasAudio],
  )

  const play = useCallback(() => {
    const from = currentTime >= duration ? 0 : currentTime
    if (currentTime >= duration) seek(0)
    setStatus('playing')
    const audio = audioRef.current
    if (audio && audio.src) {
      audio.play().catch(() => {
        /* autoplay policy — the wall clock keeps the UI honest */
      })
    }
    // Always run the wall clock: it is what carries the transport past the end
    // of a short audio track, and what covers the silent case entirely.
    startWallClock(from)
    emit('play', {
      time: from,
      frame: Math.round(from * frameRate),
      frameRate,
      duration,
    })
  }, [currentTime, duration, frameRate, seek, startWallClock, emit])

  const pause = useCallback(() => {
    setStatus('idle')
    stopWallClock()
    audioRef.current?.pause()
    emit('pause', frame)
  }, [stopWallClock, emit, frame])

  const toggle = useCallback(() => {
    if (status === 'playing') pause()
    else play()
  }, [status, play, pause])

  const goToScene = useCallback(
    (index: number) => {
      const scene = manifest.scenes[index]
      if (!scene) return
      seek(scene.start)
      if (status === 'playing') {
        audioRef.current?.play().catch(() => {})
      }
    },
    [manifest.scenes, seek, status],
  )

  const nextScene = useCallback(() => {
    const next = activeSceneIndex + 1
    if (next < manifest.scenes.length) goToScene(next)
    else seek(duration)
  }, [activeSceneIndex, manifest.scenes.length, goToScene, seek, duration])

  const prevScene = useCallback(() => {
    const prev = activeSceneIndex - 1
    if (prev >= 0) goToScene(prev)
    else seek(0)
  }, [activeSceneIndex, goToScene, seek])

  const restart = useCallback(() => {
    seek(0)
    setStatus('playing')
    const audio = audioRef.current
    if (audio && audio.src) audio.play().catch(() => {})
    startWallClock(0)
  }, [seek, startWallClock])

  const reloadSource = useCallback(() => {
    driverRef.current?.reload?.()
    setReloadToken((n) => n + 1)
  }, [])

  /* ------------------------------------------------------------------ */
  /* Side effects                                                        */
  /* ------------------------------------------------------------------ */

  // Volume / mute always mirror onto the element.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted, audioSrc])

  // Push every clock tick to the driver. This is the hot path during playback:
  // Remotion's `seekTo` is cheap and synchronous, so one call per frame keeps
  // the canvas locked to the transport with no drift.
  useEffect(() => {
    if (status !== 'playing') return
    emit('seek', frame)
  }, [frame, status, emit])

  useEffect(() => {
    if (autoPlay) play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay])

  // Give the driver the opening frame once it can render, and again whenever
  // the host swaps the driver out — a Remotion player mounts asynchronously.
  useEffect(() => {
    if (!driver) return
    emit('seek', frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver])

  useEffect(() => stopWallClock, [stopWallClock])

  return {
    currentTime,
    duration,
    status,
    activeSceneIndex,
    activeSubtitleIndex,
    audioSrc,
    play,
    pause,
    toggle,
    seek,
    goToScene,
    nextScene,
    prevScene,
    restart,
    volume,
    setVolume,
    muted,
    setMuted,
    reloadToken,
    reloadSource,
    audioRef,
    frame,
  }
}
