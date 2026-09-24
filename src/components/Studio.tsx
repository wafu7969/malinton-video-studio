import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveManifest } from '../manifest'
import { usePlaybackEngine } from '../hooks/usePlaybackEngine'
import { createIframeDriver } from '../drivers/iframeDriver'
import type { PreviewDriver } from '../driver'
import type { StudioManifest } from '../types'
import { PreviewPanel } from './PreviewPanel'
import { SceneList } from './SceneList'
import { SubtitleTimeline } from './SubtitleTimeline'

export interface StudioProps {
  /** The timeline: scenes, subtitles, duration, audio and the preview source. */
  manifest: StudioManifest
  /**
   * Turn a manifest-relative path into a url the browser can load.
   * Defaults to identity, which is correct when the manifest already holds
   * browser-resolvable urls.
   */
  resolveAsset?: (path: string) => string
  /** Start playing as soon as the studio mounts. */
  autoPlay?: boolean
  /** Extra class on the root element, for host-level overrides. */
  className?: string
  /**
   * Paints the preview canvas. Supply this to drive a renderer the manifest
   * cannot describe — most notably `@remotion/player`, which is seeked by
   * frame through its own imperative handle.
   *
   * Defaults to an iframe driver pointed at `manifest.preview.src`.
   */
  driver?: PreviewDriver
}

/**
 * Default asset resolver. Declared at module scope on purpose: an inline
 * default would be a new function on every render, which would re-run the
 * driver effect forever.
 */
const identityResolve = (path: string): string => path

/**
 * The studio shell: left preview column, right panel column.
 */
export function Studio({
  manifest: manifestProp,
  resolveAsset = identityResolve,
  autoPlay = false,
  className,
  driver: externalDriver,
}: StudioProps) {
  const manifest = useMemo(() => resolveManifest(manifestProp), [manifestProp])

  /**
   * The driver is built in state rather than `useMemo` because it owns a
   * window-level listener. `useMemo` gives no hook to release it.
   */
  const [driver, setDriver] = useState<PreviewDriver | undefined>(externalDriver)

  useEffect(() => {
    if (externalDriver) {
      setDriver(externalDriver)
      return
    }

    const preview = manifest.preview
    if (preview.type !== 'html' || !preview.src) {
      setDriver(undefined)
      return
    }

    const created = createIframeDriver({
      src: resolveAsset(preview.src),
      sandbox: preview.sandbox,
    })

    setDriver(created)
    return () => created.dispose?.()
  }, [externalDriver, manifest.preview, resolveAsset])

  const engine = usePlaybackEngine({
    manifest,
    resolveAsset,
    autoPlay,
    driver,
  })

  const selectScene = useCallback(
    (index: number) => engine.goToScene(index),
    [engine],
  )

  const selectSubtitle = useCallback(
    (index: number) => {
      const cue = manifest.subtitles[index]
      if (cue) engine.seek(cue.start)
    },
    [engine, manifest],
  )

  return (
    <div className={['mvs-root', className].filter(Boolean).join(' ')}>
      <div className="mvs-layout">
        <PreviewPanel
          manifest={manifest}
          engine={engine}
          driver={driver}
        />
        <aside className="mvs-sidebar">
          <SceneList
            manifest={manifest}
            activeIndex={engine.activeSceneIndex}
            onSelect={selectScene}
          />
          <SubtitleTimeline
            manifest={manifest}
            activeIndex={engine.activeSubtitleIndex}
            onSelect={selectSubtitle}
          />
        </aside>
      </div>
    </div>
  )
}
