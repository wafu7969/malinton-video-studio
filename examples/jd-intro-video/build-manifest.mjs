/**
 * Generates malinton.studio.json for the JD intro video.
 *
 * The studio used to read the timeline out of the running Remotion page, which
 * meant the page had to stay open for the studio to know anything. It now reads
 * a JSON manifest instead, so this script derives that file from the same
 * sources the composition already uses — `config.ts` for timings, `script.ts`
 * for titles, and the word-level timestamp JSON next to each audio file for
 * subtitle timing.
 *
 * Re-run it whenever the script, the narration or the audio changes:
 *
 *   node examples/jd-intro-video/build-manifest.mjs
 */

import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const HERE = import.meta.dirname
const PUBLIC = join(HERE, 'public')

/** Mirrors config.ts — kept in sync by hand, since TS is not importable here. */
const FPS = 30
const WIDTH = 1920
const HEIGHT = 1080

const SCENE_TIMINGS = [
  { key: 'intro', audio: 'audio/scene1_intro.mp3', duration: 5 },
  { key: 'profile', audio: 'audio/scene2_profile.mp3', duration: 12 },
  { key: 'history', audio: 'audio/scene3_history.mp3', duration: 11 },
  { key: 'business', audio: 'audio/scene4_business.mp3', duration: 10 },
  { key: 'technology', audio: 'audio/scene5_technology.mp3', duration: 9 },
  { key: 'logistics', audio: 'audio/scene6_logistics.mp3', duration: 9 },
  { key: 'responsibility', audio: 'audio/scene7_responsibility.mp3', duration: 9 },
]

/**
 * Character-level matching against the TTS word timings, so subtitles line up
 * with the voice instead of being spread evenly across the scene.
 *
 * A faithful port of `buildSegments` in src/utils/subtitle.ts — duplicated
 * rather than imported because that module pulls in `remotion` and React.
 */
function buildSegments(data, segments) {
  if (!data) return []
  const words = data.words
  const result = []
  let cursor = 0

  for (const seg of segments) {
    const target = seg.replace(/[，。、！？；：""''（）]/g, '')
    let matched = 0
    let start = -1
    let end = -1

    for (let i = cursor; i < words.length; i++) {
      const word = words[i].word.replace(/[，。、！？；：""''（）]/g, '')
      if (word.length === 0) continue
      for (let c = 0; c < word.length; c++) {
        if (matched < target.length && word[c] === target[matched]) {
          if (start < 0) start = words[i].start_time
          end = words[i].end_time
          matched++
        }
      }
      if (matched >= target.length) {
        cursor = i + 1
        break
      }
    }

    if (start >= 0 && end >= 0) result.push({ text: seg, start, end })
  }

  return result
}

/**
 * Titles live in `src/data/script.ts`. Parsing it beats duplicating the copy
 * here, but it is not valid JSON — so pull out just the fields we need.
 */
async function readScripts() {
  const source = await readFile(join(HERE, 'src', 'data', 'script.ts'), 'utf8')
  const scripts = new Map()

  // Each entry starts with an `id:`; capture key / title / subtitle / the
  // subtitle array that follows it.
  const entryRe =
    /id:\s*(\d+),\s*key:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*subtitle:\s*"([^"]+)",[\s\S]*?subtitles:\s*\[([\s\S]*?)\]/g

  let match
  while ((match = entryRe.exec(source)) !== null) {
    const [, , key, title, subtitle, rawList] = match
    const subtitles = [...rawList.matchAll(/"([^"]*)"/g)].map((m) => m[1])
    scripts.set(key, { title, subtitle, subtitles })
  }

  return scripts
}

async function main() {
  const scripts = await readScripts()
  if (scripts.size !== SCENE_TIMINGS.length) {
    throw new Error(
      `parsed ${scripts.size} scripts but expected ${SCENE_TIMINGS.length} — ` +
        'src/data/script.ts probably changed shape',
    )
  }

  const scenes = []
  const subtitles = []
  let cursor = 0

  for (const [index, timing] of SCENE_TIMINGS.entries()) {
    const script = scripts.get(timing.key)
    const start = cursor / FPS
    const end = start + timing.duration
    cursor += Math.round(timing.duration * FPS)

    scenes.push({
      index: String(index + 1).padStart(2, '0'),
      id: timing.key,
      title: script.title,
      description: script.subtitle,
      start: round(start),
      end: round(end),
      audio: 'public/' + timing.audio,
    })

    const jsonPath = join(PUBLIC, timing.audio.replace(/\.mp3$/i, '.json'))
    const raw = JSON.parse(await readFile(jsonPath, 'utf8'))
    for (const [cueIndex, segment] of buildSegments(raw, script.subtitles).entries()) {
      subtitles.push({
        id: `${timing.key}-cue-${cueIndex + 1}`,
        text: segment.text,
        start: round(start + segment.start),
        end: round(Math.min(start + segment.end, end)),
      })
    }
  }

  const manifest = {
    version: 1,
    title: '京东集团介绍视频',
    meta: {
      width: WIDTH,
      height: HEIGHT,
      frameRate: FPS,
      sourceLabel: '源码实时预览',
    },
    // No `preview`: the canvas is a Remotion <Player> supplied to <Studio> as
    // a driver, since the narration audio lives inside the composition.
    duration: round(cursor / FPS),
    scenes,
    subtitles,
  }

  const out = join(HERE, 'malinton.studio.json')
  await writeFile(out, JSON.stringify(manifest, null, 2) + '\n', 'utf8')

  process.stdout.write(
    `  ✓ malinton.studio.json — ${scenes.length} scenes, ${subtitles.length} subtitles, ` +
      `${manifest.duration}s\n`,
  )
}

/** Trim float noise: 3.7199999 -> 3.72 */
function round(n) {
  return Math.round(n * 1000) / 1000
}

main().catch((error) => {
  process.stderr.write(`build-manifest failed: ${error?.stack ?? error}\n`)
  process.exit(1)
})
