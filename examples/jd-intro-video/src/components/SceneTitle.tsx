import { useVideoConfig, interpolate, spring, useCurrentFrame } from "remotion";
import { FONTS, COLORS } from "../data/script";

interface SceneTitleProps {
  /** 主标题 */
  title: string;
  /** 副标题 */
  subtitle: string;
  /** 标题出现延迟帧 */
  delay?: number;
}

/**
 * 场景通用标题（左上角），带京东红装饰条与入场动画
 */
export const SceneTitle: React.FC<SceneTitleProps> = ({
  title,
  subtitle,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 90 },
  });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const translateY = interpolate(enter, [0, 1], [height * 0.04, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: height * 0.09,
        left: width * 0.06,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: width * 0.012 }}>
        <div
          style={{
            width: width * 0.008,
            height: height * 0.075,
            backgroundColor: COLORS.jdRed,
            borderRadius: width * 0.004,
          }}
        />
        <div>
          <div
            style={{
              fontFamily: FONTS.title,
              fontSize: height * 0.062,
              color: COLORS.white,
              lineHeight: 1.1,
              letterSpacing: "0.02em",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: height * 0.026,
              color: "rgba(255,255,255,0.7)",
              marginTop: height * 0.008,
              letterSpacing: "0.08em",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
};
