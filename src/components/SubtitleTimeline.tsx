import { useEffect, useRef } from 'react'
import { formatTime } from '../manifest'
import type { ResolvedManifest } from '../types'

export interface SubtitleTimelineProps {
  manifest: ResolvedManifest
  activeIndex: number
  onSelect: (index: number) => void
}

/** Right-hand bottom panel: every cue with its timestamp. */
export function SubtitleTimeline({
  manifest,
  activeIndex,
  onSelect,
}: SubtitleTimelineProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Follow along during playback.
  useEffect(() => {
    if (activeIndex < 0) return
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-cue-index="${activeIndex}"]`,
    )
    node?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeIndex])

  return (
    <section className="mvs-panel mvs-panel--subtitles" aria-label="字幕时间轴">
      <header className="mvs-panel__header">
        <h2>字幕时间轴</h2>
        <span className="mvs-panel__count">{manifest.subtitles.length} 句</span>
      </header>

      <div className="mvs-panel__body" ref={listRef}>
        {manifest.subtitles.length === 0 && (
          <p className="mvs-panel__empty">清单中还没有字幕</p>
        )}
        {manifest.subtitles.map((cue, index) => (
          <button
            key={cue.id}
            type="button"
            data-cue-index={index}
            className={`mvs-cue${index === activeIndex ? ' is-active' : ''}`}
            onClick={() => onSelect(index)}
          >
            <span className="mvs-cue__time">{formatTime(cue.start)}</span>
            <span className="mvs-cue__text">{cue.text}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
