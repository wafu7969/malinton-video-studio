/**
 * A preview driver is the seam between the studio's transport controls and
 * whatever actually paints the canvas.
 *
 * The studio owns the clock and the UI state; the driver only has to know how
 * to show an arbitrary instant of the timeline. Because every entry point takes
 * an absolute time, a driver never needs its own timer — which is what makes
 * scrubbing land on an exact frame.
 *
 * The built-in `iframeDriver` speaks the `malinton-studio:*` postMessage
 * protocol. A host using Remotion can instead hand over a driver that calls
 * `PlayerRef.seekTo()` directly; see `examples/remotion`.
 */

import type { ReactElement, ReactNode } from 'react'

/** One instant of the timeline, in pre-resolved units. */
export interface DriverFrame {
  /** Absolute time in seconds. */
  time: number
  /** Absolute frame number, derived from `frameRate`. */
  frame: number
  /** Frames per second, from the manifest or the default of 30. */
  frameRate: number
  /** Total duration in seconds. */
  duration: number
}

/** Imperative handle to a preview surface. */
export interface PreviewDriver {
  /** Render exactly this instant. Called on every seek and every played frame. */
  seek(frame: DriverFrame): void
  /** Playback started. The driver may show a play indicator, nothing more. */
  play?(frame: DriverFrame): void
  /** Playback paused. */
  pause?(frame: DriverFrame): void
  /**
   * Apply the transport's volume and mute state to whatever is actually making
   * sound.
   *
   * Only renderers that own their audio need this. When the audio comes from
   * the manifest (`audio` / `scenes[].audio`) the studio plays it through its
   * own `<audio>` element and wires the controls up directly. But a renderer
   * like `@remotion/player` plays `<Audio>` from inside the composition, where
   * the studio cannot reach it — without this hook the volume slider would
   * silently control nothing.
   *
   * Called on change, and once when the driver is attached so the initial
   * state is applied.
   */
  setVolume?(volume: number, muted: boolean): void
  /**
   * Rendered inside the stage, so the driver can mount an `<iframe>`, a
   * Remotion `<Player>`, a `<canvas>` — anything. Called during the studio's
   * render, so it must not mutate studio state.
   *
   * The union keeps this assignable from a host on a different React major:
   * `ReactNode` alone resolves against whichever React types the consumer has,
   * and a React 19 element is not assignable to the React 18 `ReactNode` this
   * package is built against.
   */
  render?(): ReactNode | ReactElement
  /**
   * Reports whether the surface can actually render right now. While this is
   * false the studio keeps the frame rate down and shows the surface as
   * pending, instead of pushing redundant frames.
   */
  isReady?(): boolean
  /**
   * Release anything the driver attached outside React — window listeners,
   * observers, timers. The studio calls this when the driver is replaced or
   * unmounted, and re-creates the driver afterwards.
   */
  dispose?(): void
}
