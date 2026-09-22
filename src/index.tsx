import type { ReactNode } from 'react'
import { Studio } from './components/Studio'
import type { StudioProps } from './components/Studio'
import { createIframeDriver } from './drivers/iframeDriver'
import './style.css'

export { Studio }
export type { StudioProps }

export { createIframeDriver }
export type { IframeDriverOptions } from './drivers/iframeDriver'
export type { DriverFrame, PreviewDriver } from './driver'

export { resolveManifest, formatTime, formatSeconds, findActiveIndex } from './manifest'
export type {
  StudioManifest,
  ResolvedManifest,
  ResolvedScene,
  ResolvedSubtitle,
  Scene,
  Subtitle,
  StudioMeta,
} from './types'

/** Convenience wrapper so the package can be mounted without JSX. */
export function createStudio(props: StudioProps): ReactNode {
  return <Studio {...props} />
}

export default Studio
