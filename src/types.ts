/**
 * The whole studio is driven by one manifest file. Anything the host project
 * needs to describe — canvas size, storyboard, subtitles, audio — lives here,
 * so the renderer never has to know how the video itself is produced.
 */

/** Canvas metadata shown as chips in the header. */
export interface StudioMeta {
  /** Canvas width in px, e.g. 1920 */
  width?: number
  /** Canvas height in px, e.g. 1080 */
  height?: number
  /** Aspect ratio label. Derived from width/height when omitted. */
  aspectRatio?: string
  /** Source label shown next to the status dot, e.g. "源码实时预览" */
  sourceLabel?: string
  /**
   * Frames per second. Only matters for frame-based drivers such as
   * `@remotion/player`, which seek by frame rather than by time.
   */
  frameRate?: number
}

/** One storyboard / shot. */
export interface Scene {
  /** Stable id. Falls back to `scene-{index}`. */
  id?: string
  /** Short index label rendered in the badge, e.g. "01" */
  index?: string
  /** Scene title */
  title: string
  /** Optional one-line description */
  description?: string
  /** Start time in seconds */
  start: number
  /** End time in seconds */
  end: number
  /** Per-scene voice-over audio url. Resolved relative to the manifest. */
  audio?: string
  /** Arbitrary host data; passed through untouched. */
  [key: string]: unknown
}

/** One subtitle cue. */
export interface Subtitle {
  id?: string
  /** Start time in seconds */
  start: number
  /** End time in seconds. Falls back to the next cue's start. */
  end?: number
  /** The line to display */
  text: string
  [key: string]: unknown
}

/** Root manifest shape — `malinton.studio.json`. */
export interface StudioManifest {
  /** Manifest schema version. */
  version?: number
  /** Project title shown in the browser tab. */
  title?: string
  meta?: StudioMeta
  /**
   * How the preview canvas is produced.
   * - `html`  : an html file inside the project is loaded into an iframe
   * - `video` : a rendered video file is played
   * - `none`  : no canvas, panels only
   */
  preview?:
    | { type?: 'html'; src: string; sandbox?: string }
    | { type: 'video'; src: string; poster?: string }
    | { type: 'none' }
  /** Global audio track, e.g. a full voice-over. */
  audio?: string
  scenes?: Scene[]
  subtitles?: Subtitle[]
  /** Total duration override. Derived from the last scene / subtitle otherwise. */
  duration?: number
}

/** A scene with every optional field filled in by `resolveManifest`. */
export type ResolvedScene = Scene & {
  id: string
  index: string
  start: number
  end: number
}

/** A subtitle cue with its id and derived end time. */
export type ResolvedSubtitle = Subtitle & { id: string; start: number; end: number }

/** A manifest with every derived field filled in and every default applied. */
export interface ResolvedManifest {
  version: number
  title: string
  meta: Required<
    Pick<StudioMeta, 'width' | 'height' | 'aspectRatio' | 'sourceLabel' | 'frameRate'>
  >
  preview: NonNullable<StudioManifest['preview']>
  audio?: string
  scenes: ResolvedScene[]
  subtitles: ResolvedSubtitle[]
  duration: number
}
