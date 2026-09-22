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
 *
 * Frames pushed before the page is ready would be dropped, so the driver holds
 * onto the latest one and flushes it when the frame announces itself with
 * `malinton-studio:ready`.
 */
export interface IframeDriverOptions {
  /** Url of the composition page. */
  src: string
  sandbox?: string
  /** Changing this rebuilds the iframe, used by the "重新加载源码" button. */
  reloadToken?: number | string
}

export function createIframeDriver({
  src,
  sandbox,
  reloadToken,
}: IframeDriverOptions): PreviewDriver {
  const frameRef = { current: null as HTMLIFrameElement | null }
  let ready = false
  let pending: DriverFrame | null = null

  let onMessage: ((event: MessageEvent) => void) | null = null

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

  return {
    isReady: () => ready,

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
        key: `${src}#${reloadToken ?? 0}`,
        ref: (node: HTMLIFrameElement | null): void => {
          frameRef.current = node
          if (!node || onMessage) return
          // Listen once per mounted iframe; `ready` gates the frame pushes.
          onMessage = (event: MessageEvent) => {
            if (event.source !== node.contentWindow) return
            const data = event.data as { type?: string } | null
            if (data?.type !== 'malinton-studio:ready') return
            ready = true
            flush()
          }
          window.addEventListener('message', onMessage)
        },
        className: 'mvs-stage__frame',
        src,
        title: 'composition preview',
        sandbox:
          sandbox ?? 'allow-scripts allow-same-origin allow-popups allow-forms',
      })
    },
  }
}
