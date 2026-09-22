/**
 * A placeholder composition, so this example runs as-is.
 *
 * Replace it with your own Remotion composition — the driver does not care what
 * it renders, only that it renders deterministically from `useCurrentFrame()`.
 * Anything driven by wall-clock time (`Date.now()`, `setInterval`) will not seek
 * correctly.
 */

import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame()
  const { durationInFrames, height } = useVideoConfig()

  const progress = frame / durationInFrames
  const drift = progress * 60

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1020' }}>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          color: '#e6e9f0',
          fontFamily: 'system-ui, sans-serif',
          transform: `translateX(${drift}px)`,
        }}
      >
        <div style={{ fontSize: Math.round(height * 0.06) }}>
          第 {frame} 帧
        </div>
        <div
          style={{
            fontSize: Math.round(height * 0.028),
            color: '#8b93a7',
            marginTop: 12,
          }}
        >
          {interpolate(progress, [0, 1], [0, 100]).toFixed(1)}%
        </div>
      </AbsoluteFill>

      {/* A moving bar, so scrubbing produces obvious motion. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 6,
          width: `${progress * 100}%`,
          backgroundColor: '#e8813a',
        }}
      />
    </AbsoluteFill>
  )
}
