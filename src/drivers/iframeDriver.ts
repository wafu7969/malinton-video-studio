import { createElement } from 'react'
import type { DriverFrame, PreviewDriver } from '../driver'

/**
 * The default driver for `preview.type === 'html'`: loads a composition page in
 * an iframe and drives it over `postMessage`.
 *
 * The frame is expected to render deterministically from the time it is handed,
 * which is what the `malinton-studio:*` protocol asks for:
 *
 *   studio -> frame : { type: 'malinton-studio:seek',  time, frame, frameRate }
 *   studio -> frame : { type: 'malinton-studio:play',  time, frame, frameRate }
 *   studio -> frame : { type: 'malinton-studio:pause', time }
 *   frame -> studio : { type: 'malinton-studio:ready' }
 *
 * The frame does not describe itself — the manifest already holds the scenes,
 * subtitles, duration and audio. The frame only has to paint the instant it is
 * told to, which keeps the timeline in exactly one place.
 *
 * Frames pushed before the page is ready would be dropped, so the driver holds
 * onto the latest one and flushes it once the page announces itself.
 */
export interface IframeDriverOptions {
  /** Url of the composition page. */
  src: string
  sandbox?: string
}

export function createIframeDriver({
  src,
  sandbox,
}: IframeDriverOptions): PreviewDriver {
  const frameRef = { current: null as HTMLIFrameElement | null }
  let ready = false
  let pending: DriverFrame | null = null

  const post = (message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(message, '*')
  }

  const flush = () => {
    if (!pending) return
    post({
      type: 'malinton-studio:seek',
      time: pending.time,
      frame: pending.frame,
      frameRate: pending.frameRate,
    })
    pending = null
  }

  const onMessage = (event: MessageEvent): void => {
    // Only trust the frame we mounted.
    if (frameRef.current && event.source !== frameRef.current.contentWindow) return

    const data = event.data as { type?: string } | null
    if (data?.type !== 'malinton-studio:ready') return
    ready = true
    flush()
  }

  // One window-level listener for the driver's lifetime. The iframe is
  // recreated on reload, and `event.source` keeps the check honest.
  window.addEventListener('message', onMessage)

  /**
   * Mounts the frame. Declared once so React sees the same ref identity on
   * every render — a fresh callback would make React detach the old one with
   * `null` first, and that detach is indistinguishable from a real unmount.
   *
   * A genuine teardown unmounts the driver too, which is where `ready` is
   * reset instead.
   */
  const attachFrame = (node: HTMLIFrameElement | null): void => {
    frameRef.current = node
  }

  return {
    isReady: () => ready,

    dispose() {
      window.removeEventListener('message', onMessage)
    },

    seek(next) {
      if (!ready) {
        pending = next
        return
      }
      post({
        type: 'malinton-studio:seek',
        time: next.time,
        frame: next.frame,
        frameRate: next.frameRate,
      })
    },

    play(next) {
      post({
        type: 'malinton-studio:play',
        time: next.time,
        frame: next.frame,
        frameRate: next.frameRate,
      })
    },

    pause(next) {
      post({ type: 'malinton-studio:pause', time: next.time })
    },

    render() {
      return createElement('iframe', {
        // Stable identity on purpose. An inline callback would be a new
        // function every render, and React detaches a changed ref by calling
        // it with `null` first — which would clear `ready` mid-session and
        // silently swallow every seek.
        ref: attachFrame,
        className: 'mvs-stage__frame',
        src,
        title: 'composition preview',
        /**
         * Without `autoplay` the composition's own audio is muted by the
         * browser when it calls `play()` without a user gesture — the page
         * looks fine and simply never makes a sound.
         */
        allow: 'autoplay',
        sandbox:
          sandbox ?? 'allow-scripts allow-same-origin allow-popups allow-forms',
      })
    },
  }
}
