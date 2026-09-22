import { useEffect, useRef } from 'react'
import { formatTime } from '../manifest'
import type { ResolvedManifest } from '../types'

export interface SceneListProps {
  manifest: ResolvedManifest
  activeIndex: number
  onSelect: (index: number) => void
}

/** Right-hand top panel: click any shot to jump to it. */
export function SceneList({ manifest, activeIndex, onSelect }: SceneListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the active scene in view as playback advances.
  useEffect(() => {
    if (activeIndex < 0) return
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-scene-index="${activeIndex}"]`,
    )
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIndex])

  return (
    <section className="mvs-panel mvs-panel--scenes" aria-label="分镜列表">
      <header className="mvs-panel__header">
        <h2>分镜列表</h2>
        <span className="mvs-panel__count">{manifest.scenes.length} 段</span>
      </header>

      <p className="mvs-panel__hint">点击任意分镜，预览将跳到对应时间段。</p>

      <div className="mvs-panel__body" ref={listRef}>
        {manifest.scenes.length === 0 && (
          <p className="mvs-panel__empty">清单中还没有分镜</p>
        )}
        {manifest.scenes.map((scene, index) => {
          const cueCount = manifest.subtitles.filter(
            (c) => c.start >= scene.start && c.start < scene.end,
          ).length
          return (
            <button
              key={scene.id}
              type="button"
              data-scene-index={index}
              className={`mvs-scene-card${
                index === activeIndex ? ' is-active' : ''
              }`}
              onClick={() => onSelect(index)}
            >
              <span className="mvs-scene-card__index">{scene.index}</span>
              <span className="mvs-scene-card__body">
                <span className="mvs-scene-card__title">{scene.title}</span>
                <span className="mvs-scene-card__meta">
                  {formatTime(scene.start)} - {formatTime(scene.end)} · {cueCount} 句
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
