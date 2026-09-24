import { createElement, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Studio } from '../src/index'

/**
 * Host entry point. Pulls the manifest the CLI is serving, then mounts the
 * studio with it.
 *
 * The manifest is fetched rather than imported so that editing it and hitting
 * refresh is enough to see the change — no rebuild in the loop.
 *
 * This file is bundled separately from the library entry so `dist/index.js`
 * stays free of host concerns.
 */

function Boot() {
  const [manifest, setManifest] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/__studio/manifest')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setManifest(data)
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
      createElement('div', null, '未能读取清单'),
      createElement('div', { style: { fontSize: 12.5 } }, error),
    )
  }

  if (!manifest) {
    return createElement('div', { className: 'mvs-boot' }, '正在启动…')
  }

  return createElement(Studio, { manifest })
}

createRoot(document.getElementById('root')).render(
  createElement(StrictMode, null, createElement(Boot)),
)
