/**
 * Mounting Malinton Video Studio on top of a Remotion composition.
 *
 * Two things have to line up for the preview to be frame-accurate:
 *
 *  1. `meta.frameRate` in the manifest must equal the composition's `fps`.
 *  2. The manifest's total duration should match `durationInFrames / fps`,
 *     otherwise the scrubber and the composition disagree at the tail.
 *
 * The preview surface comes entirely from the driver, so the manifest's own
 * `preview` is `{ "type": "none" }`.
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
const DURATION_IN_FRAMES = 107 * FPS

/**
 * A JSON import widens `"none"` to `string`, which no longer satisfies
 * `StudioManifest`'s discriminated union. Asserting once here keeps the
 * manifest editable as plain JSON.
 */
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
