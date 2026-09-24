import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface TransitionProps {
  children: React.ReactNode;
  /** 淡入帧数 */
  fadeIn?: number;
  /** 淡出帧数 */
  fadeOut?: number;
}

/**
 * 转场包装组件
 * 为分镜添加淡入淡出效果，保证分镜切换流畅自然。
 */
export const Transition: React.FC<TransitionProps> = ({
  children,
  fadeIn = 12,
  fadeOut = 12,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const inOpacity = interpolate(frame, [0, fadeIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outOpacity = interpolate(
    frame,
    [durationInFrames - fadeOut, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(inOpacity, outOpacity);

  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
};
