/**
 * Driving a Remotion composition from Malinton Video Studio.
 *
 * Remotion's own Studio is an editor shell with no seek API, so it cannot be
 * embedded as a preview. `@remotion/player` can: it exposes an imperative
 * handle whose `seekTo(frame)` is synchronous and exact. This file adapts that
 * handle to the `PreviewDriver` contract, which is all the studio needs.
 *
 * The important part is that the player is *never* allowed to own the clock.
 * `Player` is rendered with `controls={false}` and `clickToPlay={false}`, and
 * the studio pushes a frame on every tick. Letting the player run on its own
 * timeline would fight the studio's transport and cause visible drift.
 *
 * Note that the composition may render its own `<Audio>`. That audio is played
 * by the Player and is outside the studio's volume / mute controls — see the
 * `play` implementation below for why it is easy to leave it silent by mistake.
 */

import { createElement, useRef } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import type { PreviewDriver } from 'malinton-video-studio'
// Your own composition — a normal Remotion component.
import { MyComposition } from './MyComposition'

export interface RemotionDriverOptions {
  /** Composition duration in frames. Must match the manifest's duration. */
  durationInFrames: number
  fps: number
  width: number
  height: number
  /** Props forwarded to the composition, if it takes any. */
  inputProps?: Record<string, unknown>
}

export function useRemotionDriver({
  durationInFrames,
  fps,
  width,
  height,
  inputProps,
}: RemotionDriverOptions) {
  const playerRef = useRef<PlayerRef>(null)

  // Held in a ref rather than state: the driver is read on every animation
  // frame, and a state update per frame would re-render the whole studio.
  const driverRef = useRef<PreviewDriver>({
    isReady: () => !!playerRef.current,

    seek({ frame }) {
      playerRef.current?.seekTo(frame)
    },

    // `play()` is not just "start playing" — it also resumes the shared
    // AudioContext, which is what makes any `<Audio>` inside the composition
    // audible. `pause()` is what stops the player's own timeline from running
    // away from the studio's clock. Both calls are required:
    //
    //   pause() only  -> the AudioContext starts suspended and never resumes,
    //                    so the composition renders silently. The picture looks
    //                    fine, which makes this easy to miss.
    //   play() only   -> the player advances itself and fights studio's clock,
    //                    so the picture runs ahead of the progress bar.
    //
    // So: start it, halt it, then pin it to the frame the studio asked for.
    play({ frame }) {
      playerRef.current?.play()
      playerRef.current?.pause()
      playerRef.current?.seekTo(frame)
    },

    pause({ frame }) {
      playerRef.current?.pause()
      playerRef.current?.seekTo(frame)
    },

    reload() {
      playerRef.current?.seekTo(0)
    },

    render() {
      return createElement(Player, {
        ref: playerRef,
        component: MyComposition,
        inputProps,
        durationInFrames,
        fps,
        compositionWidth: width,
        compositionHeight: height,
        // Autoplay and built-in controls must stay off — the studio drives it.
        controls: false,
        clickToPlay: false,
        acknowledgeRemotionLicense: true,
        style: { width: '100%', height: '100%' },
      })
    },
  })

  return driverRef.current
}
