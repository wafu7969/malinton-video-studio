import { createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Studio, type StudioManifest } from 'malinton-video-studio'
import 'malinton-video-studio/style.css'
import manifestJson from '../malinton.studio.json'
import { useRemotionDriver } from './useStudioDriver'

/**
 * Studio host for the JD intro video.
 *
 * Remotion renders the canvas — including the narration audio — so the timeline
 * comes from the generated `malinton.studio.json` and the canvas comes from a
 * driver wrapping `@remotion/player`.
 *
 * Regenerate the manifest with `npm run manifest` after editing the script or
 * the audio.
 */

/** JSON widens string literals; narrow it back to the manifest union. */
const manifest = manifestJson as StudioManifest

function App() {
  const driver = useRemotionDriver()
  return createElement(Studio, { manifest, driver })
}

createRoot(document.getElementById('root')!).render(
  createElement(StrictMode, null, createElement(App)),
)
