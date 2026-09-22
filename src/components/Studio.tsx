import { useCallback, useMemo, useState } from 'react'
import { resolveManifest } from '../manifest'
import { usePlaybackEngine } from '../hooks/usePlaybackEngine'
import { createIframeDriver } from '../drivers/iframeDriver'
import type { PreviewDriver } from '../driver'
import type { StudioManifest } from '../types'
import { PreviewPanel } from './PreviewPanel'
import { SceneList } from './SceneList'
import { SubtitleTimeline } from './SubtitleTimeline'

export interface StudioProps {
  /** The manifest — usually loaded from `malinton.studio.json`. */
  manifest: StudioManifest
  /**
   * Turn a manifest-relative path into a url the browser can load.
   * Defaults to identity, which is correct when the manifest already holds
   * browser-resolvable urls.
   */
  resolveAsset?: (path: string) => string
  /** Start playing on mount. */
  autoPlay?: boolean
  /** Show the caption overlay on the canvas. */
  showCaptions?: boolean
  /** Extra class on the root element, for host-level overrides. */
  className?: string
  /**
   * Paints the preview canvas. Supply this to drive a renderer the manifest
   * cannot describe — most notably `@remotion/player`, which is seeked by
   * frame through its own imperative handle.
   *
   * When omitted, `preview` in the manifest selects a built-in driver: an
   * iframe for `type: "html"`, a `<video>` for `type: "video"`.
   */
  driver?: PreviewDriver
}

/**
 * The studio shell: left preview column, right panel column. Everything is
 * derived from the manifest, so the same component works for any project that
 * can describe its shots as a timeline.
 */
export function Studio({
  manifest: rawManifest,
  resolveAsset = (p) => p,
  autoPlay = false,
  showCaptions = false,
  className,
  driver: externalDriver,
}: StudioProps) {
  const manifest = useMemo(() => resolveManifest(rawManifest), [rawManifest])
  const [showSubtitles, setShowSubtitles] = useState(showCaptions)
  const [reloadToken, setReloadToken] = useState(0)

  const driver = useMemo<PreviewDriver | undefined>(() => {
    if (externalDriver) return externalDriver

    const preview = manifest.preview

    if (preview.type === 'html') {
      return createIframeDriver({
        src: resolveAsset(preview.src),
        sandbox: preview.sandbox,
        reloadToken,
      })
    }

    if (preview.type === 'video') {
      const src = resolveAsset(preview.src)
      return {
        isReady: () => true,
        seek() {},
        render: () => (
          <video
            key={`${src}#${reloadToken}`}
            className="mvs-stage__media"
            src={src}
            poster={preview.poster ? resolveAsset(preview.poster) : undefined}
            playsInline
            muted
          />
        ),
      }
    }

    return undefined
  }, [externalDriver, manifest.preview, resolveAsset, reloadToken])

  // Only the built-in driver is rebuilt on reload, so bump the token here
  // rather than inside the engine — an external driver manages its own source.
  const reloadSource = useCallback(() => {
    if (externalDriver) externalDriver.reload?.()
    else setReloadToken((n) => n + 1)
  }, [externalDriver])

  const engine = usePlaybackEngine({ manifest, resolveAsset, autoPlay, driver })

  const selectScene = useCallback(
    (index: number) => engine.goToScene(index),
    [engine],
  )

  const selectSubtitle = useCallback(
    (index: number) => {
      const cue = manifest.subtitles[index]
      if (cue) engine.seek(cue.start)
    },
    [engine, manifest.subtitles],
  )

  return (
    <div className={['mvs-root', className].filter(Boolean).join(' ')}>
      <div className="mvs-layout">
        <PreviewPanel
          manifest={manifest}
          engine={engine}
          driver={driver}
          onReloadSource={reloadSource}
          showSubtitles={showSubtitles}
          onShowSubtitlesChange={setShowSubtitles}
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
