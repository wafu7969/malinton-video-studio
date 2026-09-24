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
  /**
   * Whether the transport has any sound at all — a manifest track, or a driver
   * that plays its own audio. False means the volume controls are inert and
   * should be shown disabled.
   */
  hasAudio: boolean
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

  const activeScene = manifest.scenes[activeSceneIndex]
  const activeSceneAudio = activeScene?.audio
  const audioBaseTime = activeSceneAudio ? activeScene.start : 0

  /**
   * The offset of the scene-local audio covering `time`, resolved against that
   * time rather than against `currentTime`.
   *
   * `seek` runs before React has committed the new `currentTime`, so reading
   * `audioBaseTime` there would use the *previous* scene's offset — and a
   * target derived from a stale base lands past the end of the new clip, which
   * makes the clock look unseekable and lets `timeupdate` drag it back.
   */
  const audioBaseFor = useCallback(
    (time: number): number => {
      const scene = manifest.scenes[findActiveIndex(manifest.scenes, time)]
      return scene?.audio ? scene.start : 0
    },
    [manifest.scenes],
  )

  /**
   * Latest clock and transport state, for listeners that outlive a render.
   * React effects capture their closure, so a media-event handler reading
   * `currentTime` directly would act on whatever value it saw when attached.
   */
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime
  const statusRef = useRef(status)
  statusRef.current = status

  /** Scene audio wins over the global track; it is the per-shot voice-over. */
  const audioSrc = useMemo(() => {
    const picked = activeSceneAudio ?? manifest.audio
    return picked ? resolveAsset(picked) : undefined
  }, [activeSceneAudio, manifest.audio, resolveAsset])

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
      const absoluteTime = audio.currentTime + audioBaseTime
      // A backwards jump we did not ask for means the element ran out of
      // media and is reporting its clamped position.
      if (audioUsable.current && audio.currentTime >= audio.duration - 0.05) {
        audioUsable.current = false
      }
      if (audioUsable.current) setCurrentTime(absoluteTime)
    }
    const onEnded = () => {
      const absoluteTime = audio.currentTime + audioBaseTime
      // Only the end of the whole timeline ends playback. Reaching the end of
      // a short audio track must not stop the transport.
      if (duration - absoluteTime <= 0.25) {
        setStatus('ended')
        setCurrentTime(duration)
      } else {
        audioUsable.current = false
        startWallClock(absoluteTime)
      }
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [hasAudio, audioSrc, audioBaseTime, duration, startWallClock])

  /**
   * When the active scene changes, the audio source may switch to another
   * clip. Re-sync the element from the absolute timeline so scene-local audio
   * still drives the same global clock.
   */
  useEffect(() => {
    const audio = audioRef.current
    if (!hasAudio || !audio) return

    /**
     * Align the element with the studio clock. Reads the *latest* time through
     * a ref: this runs from media events (`canplay`) as well as from React
     * effects, and a captured `currentTime` would rewind the transport to
     * wherever it pointed when the listener was attached.
     */
    const syncAudio = () => {
      const now = currentTimeRef.current
      const base = audioBaseFor(now)
      const targetTime = Math.max(0, now - base)
      if (Number.isFinite(audio.duration)) {
        audioUsable.current = targetTime < audio.duration - 0.05
      } else {
        audioUsable.current = true
      }

      try {
        if (Math.abs(audio.currentTime - targetTime) > 0.05) {
          audio.currentTime = targetTime
        }
      } catch {
        /* metadata not ready yet; retry on the media events below */
      }

      if (statusRef.current === 'playing') {
        audio.play().catch(() => {
          /* autoplay policy — the wall clock keeps the UI honest */
        })
      } else {
        audio.pause()
      }
    }

    syncAudio()
    audio.addEventListener('loadedmetadata', syncAudio)
    audio.addEventListener('canplay', syncAudio)
    return () => {
      audio.removeEventListener('loadedmetadata', syncAudio)
      audio.removeEventListener('canplay', syncAudio)
    }
  }, [hasAudio, audioSrc, audioBaseTime, audioBaseFor])

  const seek = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), duration)
      setCurrentTime(clamped)
      const audio = audioRef.current
      if (audio && audio.src) {
        const targetTime = Math.max(0, clamped - audioBaseFor(clamped))
        // Re-arm the element whenever we seek somewhere it can actually reach,
        // so a short track recovers if the user returns to covered ground.
        if (!Number.isFinite(audio.duration) || targetTime < audio.duration - 0.05) {
          audioUsable.current = true
        }
        try {
          audio.currentTime = targetTime
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
    [duration, frameRate, status, startWallClock, stopWallClock, emit, audioBaseFor],
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

  /**
   * Volume / mute reach both possible sound sources.
   *
   * The studio's own `<audio>` covers manifest-declared tracks. A renderer that
   * plays audio from inside itself — a Remotion composition's `<Audio>`, say —
   * is out of reach from here, so it gets the same values through the driver.
   * Without the second half the slider would move and nothing would change.
   */
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
      audio.muted = muted
    }
    driverRef.current?.setVolume?.(volume, muted)
  }, [volume, muted, audioSrc, driver])

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
    /**
     * Whether the transport has any sound to control — either a manifest track
     * or a driver that plays its own audio. Without the second case the
     * controls would be greyed out for a Remotion composition whose narration
     * lives inside the composition.
     *
     * Reads `driver` rather than the ref so the value updates on the render
     * where the driver arrives, instead of one render later.
     */
    hasAudio: hasAudio || !!driver?.setVolume,
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
