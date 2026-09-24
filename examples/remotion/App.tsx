/**
 * Mounting Malinton Video Studio on top of a Remotion composition.
 *
 * A Remotion `<Player>` is not a page, so there is nothing to drive it over
 * `postMessage`. Instead the timeline comes from `malinton.studio.json` and the
 * canvas comes from a driver that adapts `PlayerRef.seekTo()`.
 *
 * Two things have to line up for the preview to be frame-accurate:
 *
 *  1. The manifest's `meta.frameRate` must equal the composition's `fps`.
 *  2. The manifest's total duration must equal `durationInFrames / fps`,
 *     otherwise the scrubber and the composition disagree at the tail.
 *
 * Requires `@remotion/player` and `remotion` to be installed.
 */

import type { StudioManifest } from 'malinton-video-studio'
import { Studio } from 'malinton-video-studio'
import 'malinton-video-studio/style.css'
import rawManifest from './malinton.studio.json'
import { useRemotionDriver } from './useRemotionDriver'

const FPS = 30
const WIDTH = 1920
const HEIGHT = 1080
const DURATION = 107
const DURATION_IN_FRAMES = DURATION * FPS

/** JSON widens string literals, so narrow it back to the union type. */
const manifest = rawManifest as StudioManifest

export default function App() {
  const driver = useRemotionDriver({
    durationInFrames: DURATION_IN_FRAMES,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  })

  return <Studio manifest={manifest} driver={driver} />
}
