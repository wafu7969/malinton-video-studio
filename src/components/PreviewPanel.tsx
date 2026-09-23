import { useCallback } from 'react'
import { formatTime } from '../manifest'
import type { PlaybackEngine } from '../hooks/usePlaybackEngine'
import type { PreviewDriver } from '../driver'
import type { ResolvedManifest } from '../types'
import { Chip } from './Chip'
import {
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  ReloadIcon,
  ReplayIcon,
} from './icons'
import { Switch } from './Switch'

export interface PreviewPanelProps {
  manifest: ResolvedManifest
  engine: PlaybackEngine
  /** Paints the canvas. Rendered inside the stage. */
  driver?: PreviewDriver
  /** Rebuild the preview source. Owned by the host so it can rebuild a driver. */
  onReloadSource: () => void
}

export function PreviewPanel({
  manifest,
  engine,
  driver,
  onReloadSource,
}: PreviewPanelProps) {
  const { meta } = manifest
  const progress = manifest.duration
    ? (engine.currentTime / manifest.duration) * 100
    : 0

  const canvas = driver?.render?.()

  /**
   * The manifest may declare no audio at all. The transport still renders the
   * volume controls in that case, but greys them out.
   */
  const hasAudio = !!engine.audioSrc

  const handleScrub = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const ratio = (event.clientX - rect.left) / rect.width
      engine.seek(ratio * manifest.duration)
    },
    [engine, manifest.duration],
  )

  return (
    <section className="mvs-preview" aria-label="预览">
      {/* ---- header chips ---- */}
      <header className="mvs-preview__header">
        <Chip tone="status">
          <span className="mvs-dot" />
          {meta.sourceLabel}
        </Chip>
        <Chip>
          {meta.width} × {meta.height} · {meta.aspectRatio} · {meta.resolutionLabel}
        </Chip>
        <Chip>总时长 {formatTime(manifest.duration)}</Chip>
        <Chip>
          共 {manifest.scenes.length} 分镜 · {manifest.subtitles.length} 句
        </Chip>
      </header>

      {/* ---- canvas ---- */}
      <div className="mvs-stage">
        {canvas ? (
          /*
            The surface is locked to the manifest's aspect ratio rather than
            stretched to fill the pane, so the composition is never distorted
            by the shape of the window.
          */
          <div
            className="mvs-stage__canvas"
            style={
              { '--mvs-aspect': `${meta.width} / ${meta.height}` } as React.CSSProperties
            }
          >
            {canvas}
          </div>
        ) : (
          <div className="mvs-stage__empty">
            <p>未配置预览源</p>
            <p className="mvs-stage__hint">
              在清单中设置 <code>preview</code>，或通过 <code>driver</code> 接入预览
            </p>
          </div>
        )}
      </div>

      {/* ---- transport ---- */}
      <div className="mvs-transport">
        <div className="mvs-scrubber">
          <span className="mvs-scrubber__time">
            {formatTime(engine.currentTime)}
          </span>
          <div
            className="mvs-scrubber__track"
            role="slider"
            tabIndex={0}
            aria-label="播放进度"
            aria-valuemin={0}
            aria-valuemax={Math.round(manifest.duration)}
            aria-valuenow={Math.round(engine.currentTime)}
            onClick={handleScrub}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') engine.seek(engine.currentTime + 1)
              if (e.key === 'ArrowLeft') engine.seek(engine.currentTime - 1)
            }}
          >
            <div
              className="mvs-scrubber__fill"
              style={{ width: `${progress}%` }}
            />
            <div
              className="mvs-scrubber__thumb"
              style={{ left: `${progress}%` }}
            />
          </div>
          <span className="mvs-scrubber__time">{formatTime(manifest.duration)}</span>
        </div>

        <div className="mvs-controls">
          <div className="mvs-controls__left">
            <button
              type="button"
              className="mvs-btn mvs-btn--primary"
              onClick={engine.toggle}
            >
              {engine.status === 'playing' ? <PauseIcon /> : <PlayIcon />}
              {engine.status === 'playing' ? '暂停' : '播放'}
            </button>
            <button type="button" className="mvs-btn" onClick={engine.prevScene}>
              <PrevIcon />
              上一段
            </button>
            <button type="button" className="mvs-btn" onClick={engine.nextScene}>
              <NextIcon />
              下一段
            </button>
            <button type="button" className="mvs-btn" onClick={engine.restart}>
              <ReplayIcon />
              重播
            </button>
            <button type="button" className="mvs-btn" onClick={onReloadSource}>
              <ReloadIcon />
              重新加载源码
            </button>
          </div>

          <div className="mvs-controls__right">
            {/*
              Rendered even without audio, so the transport row keeps the same
              shape across projects. Disabling it is clearer than hiding a
              control the user just saw, and avoids the buttons shifting.
            */}
            <div
              className={`mvs-volume${hasAudio ? '' : ' is-disabled'}`}
              title={hasAudio ? undefined : '清单中未配置音频'}
            >
              <span className="mvs-volume__label">音量</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(engine.volume * 100)}
                disabled={!hasAudio}
                aria-label="音量"
                onChange={(e) => engine.setVolume(Number(e.target.value) / 100)}
              />
              <span className="mvs-volume__value">
                {Math.round(engine.volume * 100)}%
              </span>
            </div>

            <label
              className={`mvs-mute${hasAudio ? '' : ' is-disabled'}`}
              title={hasAudio ? undefined : '清单中未配置音频'}
            >
              <Switch
                checked={engine.muted}
                onChange={engine.setMuted}
                label="静音"
                disabled={!hasAudio}
              />
              静音
            </label>
          </div>
        </div>
      </div>

      {/* The element that owns the clock when audio exists. */}
      {engine.audioSrc && (
        <audio ref={engine.audioRef} src={engine.audioSrc} preload="auto" />
      )}
    </section>
  )
}
