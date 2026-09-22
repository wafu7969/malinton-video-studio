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

import type { ReactNode } from 'react'

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
  /** The host asked for a source reload, e.g. the "重新加载源码" button. */
  reload?(): void
  /**
   * Rendered inside the stage, so the driver can mount an `<iframe>`, a
   * Remotion `<Player>`, a `<canvas>` — anything. Called during the studio's
   * render, so it must not mutate studio state.
   */
  render?(): ReactNode
  /**
   * Reports whether the surface can actually render right now. While this is
   * false the studio keeps the frame rate down and shows the surface as
   * pending, instead of pushing redundant frames.
   */
  isReady?(): boolean
}
