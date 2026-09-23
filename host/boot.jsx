import { createElement, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Studio } from '../src/index'

/**
 * Host entry point. Asks the CLI which composition page to load, then mounts
 * the studio.
 *
 * There is no manifest to fetch: the composition page reports its own timeline
 * once it is running, so the studio shows a loading state until then.
 *
 * This file is bundled separately from the library entry so `dist/index.js`
 * stays free of host concerns.
 */

function Boot() {
  const [previewSrc, setPreviewSrc] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/__studio/config')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setPreviewSrc(data.previewSrc)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return createElement(
      'div',
      { className: 'mvs-boot' },
      createElement('div', null, '未能读取启动配置'),
      createElement('div', { style: { fontSize: 12.5 } }, error),
    )
  }

  if (!previewSrc) {
    return createElement('div', { className: 'mvs-boot' }, '正在启动…')
  }

  return createElement(Studio, { previewSrc })
}

createRoot(document.getElementById('root')).render(
  createElement(StrictMode, null, createElement(Boot)),
)
