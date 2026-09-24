import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../data/script";
import type { SubtitleSegment } from "../utils/subtitle";

interface SubtitleProps {
  /** 字幕分段（含起止时间，单位秒） */
  segments: SubtitleSegment[];
}

/**
 * 字幕组件
 * - 基于字级别时间戳精确控制显示与消失
 * - 底部居中、半透明深色背景、圆角、白色文字
 * - 不折行、不超出视频范围
 */
export const Subtitle: React.FC<SubtitleProps> = ({ segments }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentTime = frame / fps;

  // 找到当前时间对应的字幕段
  const active = segments.find(
    (s) => currentTime >= s.start && currentTime <= s.end + 0.15
  );

  if (!active) return null;

  // 淡入淡出
  const fadeIn = Math.min(1, (currentTime - active.start) / 0.15);
  const fadeOut = Math.min(1, (active.end + 0.15 - currentTime) / 0.15);
  const opacity = Math.max(0, Math.min(fadeIn, fadeOut));

  const fontSize = height * 0.038;
  const paddingV = height * 0.018;
  const paddingH = width * 0.028;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: height * 0.06,
      }}
    >
      <div
        style={{
          opacity,
          backgroundColor: "rgba(11, 27, 58, 0.72)",
          borderRadius: height * 0.016,
          paddingTop: paddingV,
          paddingBottom: paddingV,
          paddingLeft: paddingH,
          paddingRight: paddingH,
          maxWidth: width * 0.82,
          border: `1px solid rgba(255,255,255,0.12)`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}
      >
        <span
          style={{
            fontFamily: FONTS.subtitle,
            fontSize,
            fontWeight: 600,
            color: "#FFFFFF",
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
          }}
        >
          {active.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};
