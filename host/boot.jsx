import { createElement, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Studio } from '../src/index'

/**
 * Host entry point. Fetches the manifest the CLI discovered, wires up asset
 * resolution, and mounts the studio. This file is bundled separately from the
 * library entry so `dist/index.js` stays free of host concerns.
 */

/** Manifest paths are relative to the project root the CLI serves. */
function resolveAsset(path) {
  if (!path) return path
  if (/^(https?:|data:|blob:|\/\/)/.test(path)) return path
  return '/' + String(path).replace(/^\.?\//, '')
}

function Boot() {
  const [manifest, setManifest] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/__studio/manifest')
      .then(async (res) => {
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}))
          throw new Error(detail.error ?? `HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        if (data?.title) document.title = `${data.title} · Malinton Video Studio`
        setManifest(data)
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
      createElement('div', null, '未能加载清单文件'),
      createElement('div', { style: { fontSize: 12.5 } }, error),
      createElement(
        'div',
        { style: { fontSize: 12.5, marginTop: 8 } },
        '请在项目根目录创建 malinton.studio.json，或使用 --manifest 指定路径。',
      ),
    )
  }

  if (!manifest) {
    return createElement(
      'div',
      { className: 'mvs-boot' },
      '正在加载清单…',
    )
  }

  return createElement(Studio, { manifest, resolveAsset })
}

createRoot(document.getElementById('root')).render(
  createElement(StrictMode, null, createElement(Boot)),
)
