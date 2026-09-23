/**
 * Mounting Malinton Video Studio on top of a Remotion composition.
 *
 * Unlike an iframe composition, a Remotion `<Player>` cannot describe itself
 * over `postMessage` — there is no page to run that code. So the host passes
 * the timeline as a `manifest` prop instead, and only the canvas comes from the
 * driver.
 *
 * Two things have to line up for the preview to be frame-accurate:
 *
 *  1. `meta.frameRate` must equal the composition's `fps`.
 *  2. The total duration must equal `durationInFrames / fps`, otherwise the
 *     scrubber and the composition disagree at the tail.
 *
 * Requires `@remotion/player` and `remotion` to be installed.
 */

import type { StudioManifest } from 'malinton-video-studio'
import { Studio } from 'malinton-video-studio'
import 'malinton-video-studio/style.css'
import { useRemotionDriver } from './useRemotionDriver'

const FPS = 30
const WIDTH = 1920
const HEIGHT = 1080
const DURATION = 107
const DURATION_IN_FRAMES = DURATION * FPS

/** Scene boundaries, in seconds. Each scene runs until the next begins. */
const SCENES = [
  { title: '开场', start: 0 },
  { title: '正片', start: 10 },
  { title: '对比', start: 36 },
  { title: '场景', start: 59 },
  { title: '结论', start: 78 },
]

const manifest: StudioManifest = {
  title: 'Remotion 合成预览示例',
  meta: {
    width: WIDTH,
    height: HEIGHT,
    frameRate: FPS,
    sourceLabel: 'Remotion Player',
  },
  duration: DURATION,
  scenes: SCENES.map((scene, i) => ({
    title: scene.title,
    start: scene.start,
    end: SCENES[i + 1] ? SCENES[i + 1].start : DURATION,
  })),
  subtitles: [
    { start: 0, text: '字幕由合成画面自行渲染。' },
    { start: 4, text: '这份清单只驱动右侧时间轴。' },
  ],
}

export default function App() {
  const driver = useRemotionDriver({
    durationInFrames: DURATION_IN_FRAMES,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  })

  return <Studio manifest={manifest} driver={driver} />
}
