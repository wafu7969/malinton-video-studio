import type {
  ResolvedManifest,
  ResolvedScene,
  ResolvedSubtitle,
  Scene,
  StudioManifest,
  Subtitle,
} from './types'

const DEFAULT_ASPECT = '16:9'

/** Fallback frame rate, matching Remotion's own default. */
const DEFAULT_FRAME_RATE = 30

/** Greatest common divisor, used to reduce width/height into `16:9`. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** `1920, 1080` -> `"16:9"` */
export function ratioLabel(width: number, height: number): string {
  if (!width || !height) return DEFAULT_ASPECT
  const d = gcd(width, height)
  return `${width / d}:${height / d}`
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Sort by start time and fill in the `end` of each cue from the next one. */
function normalizeSubtitles(
  raw: Subtitle[] | undefined,
  fallbackEnd: number,
): ResolvedSubtitle[] {
  const list = (raw ?? [])
    .filter((s): s is Subtitle => !!s && typeof s.text === 'string')
    .map((s, i) => ({ ...s, start: num(s.start, 0), id: s.id ?? `cue-${i}` }))
    .sort((a, b) => a.start - b.start)

  return list.map((s, i) => {
    const next = list[i + 1]
    const end = num(s.end, next ? next.start : fallbackEnd)
    return { ...s, end: end > s.start ? end : s.start + 0.5 }
  })
}

/** Sort by start time and fill in ids / indices / implicit ends. */
function normalizeScenes(
  raw: Scene[] | undefined,
  fallbackEnd: number,
): ResolvedScene[] {
  const list = (raw ?? [])
    .filter((s): s is Scene => !!s && typeof s.title === 'string')
    .map((s, i) => ({
      ...s,
      start: num(s.start, 0),
      end: num(s.end, fallbackEnd),
      id: s.id ?? `scene-${i}`,
    }))
    .sort((a, b) => a.start - b.start)

  return list.map((s, i) => ({
    ...s,
    index: s.index ?? pad2(i + 1),
    end: s.end > s.start ? s.end : s.start + 1,
  }))
}

/**
 * Applies defaults, derives ids and end-times, and computes the total
 * duration. Everything downstream can then assume a fully populated manifest.
 */
export function resolveManifest(manifest: StudioManifest): ResolvedManifest {
  const width = num(manifest.meta?.width, 1920)
  const height = num(manifest.meta?.height, 1080)

  const declaredDuration = num(manifest.duration, 0)

  const scenes = normalizeScenes(manifest.scenes, declaredDuration || 1)
  const subtitles = normalizeSubtitles(manifest.subtitles, declaredDuration || 1)

  const duration =
    declaredDuration ||
    Math.max(
      ...scenes.map((s) => s.end),
      ...subtitles.map((s) => s.end),
      0,
    )

  // Re-run once the true duration is known so trailing items are not clipped.
  const finalScenes = duration
    ? scenes.map((s) => ({ ...s, end: Math.min(s.end, duration) }))
    : scenes
  const finalSubtitles = duration
    ? subtitles.map((s) => ({ ...s, end: Math.min(s.end, duration) }))
    : subtitles

  return {
    version: num(manifest.version, 1),
    title: manifest.title ?? 'Malinton Video Studio',
    meta: {
      width,
      height,
      aspectRatio: manifest.meta?.aspectRatio ?? ratioLabel(width, height),
      sourceLabel: manifest.meta?.sourceLabel ?? '源码实时预览',
      frameRate: num(manifest.meta?.frameRate, DEFAULT_FRAME_RATE),
    },
    preview: manifest.preview ?? { type: 'none' },
    audio: manifest.audio,
    scenes: finalScenes,
    subtitles: finalSubtitles,
    duration,
  }
}

/** `107.4` -> `"01:47"` */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${pad2(m)}:${pad2(s)}`
}

/** `10.25` -> `"10.25s"` */
export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(2)}s`
}

/** Index of the item whose `[start, end)` window contains `time`, else -1. */
export function findActiveIndex(
  items: { start: number; end: number }[],
  time: number,
): number {
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const isLast = i === items.length - 1
    // The final item is inclusive of its end so the last frame still highlights.
    if (time >= item.start && (time < item.end || (isLast && time <= item.end))) {
      return i
    }
  }
  return -1
}
