import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveManifest } from '../manifest'
import { usePlaybackEngine } from '../hooks/usePlaybackEngine'
import { createIframeDriver } from '../drivers/iframeDriver'
import type { PreviewDriver } from '../driver'
import type { StudioManifest } from '../types'
import { PreviewCanvas, PreviewPanel } from './PreviewPanel'
import { SceneList } from './SceneList'
import { SubtitleTimeline } from './SubtitleTimeline'

export interface StudioProps {
  /**
   * The timeline, for hosts that already have it as data — a Remotion
   * `<Player>` driven through `driver`, for instance.
   *
   * A composition page that speaks the `malinton-studio:manifest` protocol
   * reports its own manifest instead, so this can be left out entirely.
   */
  manifest?: StudioManifest
  /**
   * Turn a manifest-relative path into a url the browser can load.
   * Defaults to identity, which is correct when the manifest already holds
   * browser-resolvable urls.
   */
  resolveAsset?: (path: string) => string
  /** Start playing once the timeline is known. */
  autoPlay?: boolean
  /** Extra class on the root element, for host-level overrides. */
  className?: string
  /**
   * Paints the preview canvas. Supply this to drive a renderer the manifest
   * cannot describe — most notably `@remotion/player`, which is seeked by
   * frame through its own imperative handle.
   *
   * Defaults to an iframe driver pointed at `preview.src`.
   */
  driver?: PreviewDriver
  /** Url of the composition page, when no `manifest.preview` is given. */
  previewSrc?: string
}

/**
 * Default asset resolver. Declared at module scope on purpose: an inline
 * default would be a new function on every render, which would re-run the
 * driver effect forever.
 */
const identityResolve = (path: string): string => path

/**
 * The studio shell: left preview column, right panel column.
 *
 * The timeline normally arrives from the composition page itself. Until it
 * does there is nothing to show, so the studio renders a loading state — it
 * cannot know the duration or the canvas size ahead of time.
 */
export function Studio({
  manifest: manifestProp,
  resolveAsset = identityResolve,
  autoPlay = false,
  className,
  driver: externalDriver,
  previewSrc,
}: StudioProps) {
  /** Reported by the driver when the composition page describes itself. */
  const [reported, setReported] = useState<StudioManifest | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  /**
   * The driver is built in state rather than `useMemo` because it owns a
   * window-level listener. `useMemo` gives no hook to release it, and under
   * StrictMode two drivers would be built with the first one never cleaned up —
   * it would keep receiving messages and the report would be handled twice.
   */
  const [driver, setDriver] = useState<PreviewDriver | undefined>(externalDriver)

  useEffect(() => {
    if (externalDriver) {
      setDriver(externalDriver)
      return
    }

    const created = previewSrc
      ? createIframeDriver({ src: resolveAsset(previewSrc), reloadToken })
      : undefined

    setDriver(created)
    return () => created?.dispose?.()
  }, [externalDriver, previewSrc, resolveAsset, reloadToken])

  // Adopt the page's timeline. A prop wins, so a host that already has the
  // data does not get overridden by whatever the frame happens to report.
  useEffect(() => {
    if (!driver?.subscribeManifest) return
    return driver.subscribeManifest((next) => {
      setReported(next)
    })
  }, [driver])

  const source = manifestProp ?? reported ?? undefined

  const manifest = useMemo(
    () => (source ? resolveManifest(source) : null),
    [source],
  )

  const reloadSource = useCallback(() => {
    if (externalDriver) externalDriver.reload?.()
    else setReloadToken((n) => n + 1)
  }, [externalDriver])

  const ready = !!manifest

  // Hooks must run unconditionally, so the engine gets a placeholder manifest
  // and the panels are only mounted once a real one exists.
  const engine = usePlaybackEngine({
    manifest: manifest ?? EMPTY_MANIFEST,
    resolveAsset,
    autoPlay: ready && autoPlay,
    driver,
  })

  const selectScene = useCallback(
    (index: number) => engine.goToScene(index),
    [engine],
  )

  const selectSubtitle = useCallback(
    (index: number) => {
      const cue = manifest?.subtitles[index]
      if (cue) engine.seek(cue.start)
    },
    [engine, manifest],
  )

  return (
    <div className={['mvs-root', className].filter(Boolean).join(' ')}>
      <div className="mvs-layout">
        {manifest ? (
          <>
            <PreviewPanel
              manifest={manifest}
              engine={engine}
              driver={driver}
              onReloadSource={reloadSource}
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
          </>
        ) : (
          /*
            The frame must be mounted before its manifest is known, since the
            manifest is what it reports. Mounting it inside the panel would
            deadlock: no manifest, no panel, no frame, no report.
          */
          <div className="mvs-booting">
            <div className="mvs-booting__frame">
              <PreviewCanvas driver={driver} />
            </div>
            <div className="mvs-booting__spinner" />
            <p>等待合成页面上报分镜与字幕…</p>
            <p className="mvs-booting__hint">
              合成页面加载后应发送 <code>malinton-studio:manifest</code>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Stand-in while the real manifest is unknown. Keeps the playback engine's
 * hooks running so their order stays stable across the loading boundary.
 */
const EMPTY_MANIFEST = resolveManifest({
  title: '',
  duration: 0,
  scenes: [],
  subtitles: [],
})
