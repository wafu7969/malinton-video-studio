import { createElement, useRef } from 'react'
import type { ReactElement } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import type { PreviewDriver } from 'malinton-video-studio'
import { JdIntroVideo } from './JdIntroVideo'
import {
  FPS,
  TOTAL_DURATION_IN_FRAMES,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from './config'

/**
 * Adapts a Remotion `<Player>` to the studio's `PreviewDriver`.
 *
 * The studio owns the clock and pushes every frame; the player is only the
 * renderer. That is why `controls` and `clickToPlay` stay off — letting the
 * player advance on its own would fight the studio's transport.
 *
 * Audio inside the composition is played by the Player, which is why `play()`
 * has to be called even though we immediately pause: `PlayerRef.play()` is what
 * resumes the shared AudioContext that the composition's `<Audio>` elements
 * run on. Calling only `pause()` would leave it suspended and the video silent.
 */
export function useRemotionDriver(): PreviewDriver {
  const playerRef = useRef<PlayerRef>(null)

  /**
   * Last volume the studio asked for, re-applied on the first frame pushed
   * after the player becomes available. The ref is attached before the player
   * is usable, so a `setVolume` arriving during mount would otherwise be lost
   * and the slider would look dead until touched a second time.
   */
  const wantVolume = useRef<{ volume: number; muted: boolean } | null>(null)
  const volumeApplied = useRef(false)

  const applyVolume = () => {
    const want = wantVolume.current
    const player = playerRef.current
    if (!want || !player) return
    player.setVolume(want.volume)
    if (want.muted) player.mute()
    else player.unmute()
    volumeApplied.current = true
  }

  // Kept in a ref, not state: the driver is read on every animation frame and
  // a state update per frame would re-render the whole studio.
  const driverRef = useRef<PreviewDriver>({
    isReady: () => !!playerRef.current,

    seek({ frame }) {
      playerRef.current?.seekTo(frame)
      // First seek after mount is the earliest point the player accepts
      // volume, so replay anything requested while it was still coming up.
      if (!volumeApplied.current) applyVolume()
    },

    play({ frame }) {
      playerRef.current?.play() // resume the AudioContext for <Audio>
      playerRef.current?.pause() // then halt the player's own clock
      playerRef.current?.seekTo(frame) // and pin it to the studio's frame
    },

    pause({ frame }) {
      playerRef.current?.pause()
      playerRef.current?.seekTo(frame)
    },

    /**
     * The narration is a `<Audio>` inside the composition, so the studio's own
     * `<audio>` element — and the volume controls wired to it — cannot reach
     * it. Forwarding to the player is what makes the slider do anything at all.
     */
    setVolume(volume, muted) {
      wantVolume.current = { volume, muted }
      if (playerRef.current) applyVolume()
      else volumeApplied.current = false
    },

    render() {
      // Annotated because React 19's `ReactNode` does not accept a
      // `FunctionComponentElement` from a differently-versioned JSX namespace.
      return createElement(Player, {
        ref: playerRef,
        component: JdIntroVideo,
        durationInFrames: TOTAL_DURATION_IN_FRAMES,
        fps: FPS,
        compositionWidth: VIDEO_WIDTH,
        compositionHeight: VIDEO_HEIGHT,
        controls: false,
        clickToPlay: false,
        acknowledgeRemotionLicense: true,
        style: { width: '100%', height: '100%' },
      }) as ReactElement
    },
  })

  return driverRef.current
}
