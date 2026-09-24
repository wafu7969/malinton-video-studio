import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { FONTS, COLORS } from "../data/script";

/**
 * 场景 1 · 片头：京东集团
 * 深蓝渐变背景 + 光粒子，中央弹出大标题与副标题，京东红装饰条。
 */
export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const titleEnter = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 80 },
  });
  const titleScale = interpolate(titleEnter, [0, 1], [0.8, 1]);
  const titleOpacity = interpolate(titleEnter, [0, 1], [0, 1]);

  const subEnter = spring({
    frame: frame - 20,
    fps,
    config: { damping: 200, stiffness: 80 },
  });
  const subOpacity = interpolate(subEnter, [0, 1], [0, 1]);
  const subY = interpolate(subEnter, [0, 1], [height * 0.03, 0]);

  const lineWidth = interpolate(
    spring({ frame: frame - 35, fps, config: { damping: 200 } }),
    [0, 1],
    [0, width * 0.22]
  );

  const yearOpacity = interpolate(frame, [45, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <SceneShell sceneKey="intro" bgFrom="#071427" bgTo="#132B5C">
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
            fontFamily: FONTS.title,
            fontSize: height * 0.16,
            color: COLORS.white,
            letterSpacing: "0.12em",
            textShadow: "0 8px 40px rgba(225,37,27,0.45)",
          }}
        >
          京东集团
        </div>

        <div
          style={{
            width: lineWidth,
            height: height * 0.008,
            backgroundColor: COLORS.jdRed,
            borderRadius: height * 0.004,
            marginTop: height * 0.03,
          }}
        />

        <div
          style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            fontFamily: FONTS.body,
            fontSize: height * 0.04,
            color: "rgba(255,255,255,0.85)",
            marginTop: height * 0.035,
            letterSpacing: "0.3em",
          }}
        >
          科技引领 · 服务至上
        </div>

        <div
          style={{
            opacity: yearOpacity,
            fontFamily: FONTS.body,
            fontSize: height * 0.028,
            color: "rgba(245,197,24,0.9)",
            marginTop: height * 0.06,
            letterSpacing: "0.4em",
          }}
        >
          1998 — 2026
        </div>
      </div>
    </SceneShell>
  );
};
