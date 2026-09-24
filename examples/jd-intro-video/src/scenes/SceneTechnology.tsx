import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Brain, Database, Cloud, Network } from "lucide-react";
import { SceneShell } from "../components/SceneShell";
import { SceneTitle } from "../components/SceneTitle";
import { FONTS, COLORS } from "../data/script";

interface Tech {
  icon: React.FC<{ size?: number; color?: string }>;
  name: string;
}

const TECHS: Tech[] = [
  { icon: Brain, name: "人工智能" },
  { icon: Database, name: "大数据" },
  { icon: Cloud, name: "云计算" },
  { icon: Network, name: "智能供应链" },
];

/**
 * 场景 5 · 技术实力
 * 科技感深色背景 + 数据流线条 + 技术标签。
 */
export const SceneTechnology: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // 数据流线条
  const lines = Array.from({ length: 6 }, (_, i) => {
    const y = height * (0.3 + i * 0.09);
    const offset = (frame * (2 + i)) % (width * 1.4);
    return { y, offset, i };
  });

  return (
    <SceneShell
      sceneKey="technology"
      bgFrom="#050E1F"
      bgTo="#0E2145"
      particleColor="rgba(59,130,246,0.7)"
    >
      <SceneTitle title="技术实力" subtitle="创新驱动 · 智能引领" delay={3} />

      {/* 数据流线条 */}
      {lines.map((l) => (
        <div
          key={l.i}
          style={{
            position: "absolute",
            top: l.y,
            left: l.offset - width * 0.4,
            width: width * 0.4,
            height: 2,
            background: `linear-gradient(90deg, rgba(59,130,246,0), rgba(59,130,246,0.8), rgba(59,130,246,0))`,
            opacity: 0.5,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          top: height * 0.36,
          left: width * 0.08,
          width: width * 0.84,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: width * 0.025,
        }}
      >
        {TECHS.map((t, i) => {
          const enter = spring({
            frame: frame - 10 - i * 9,
            fps,
            config: { damping: 200, stiffness: 90 },
          });
          const opacity = interpolate(enter, [0, 1], [0, 1]);
          const scale = interpolate(enter, [0, 1], [0.7, 1]);
          const Icon = t.icon;
          return (
            <div
              key={t.name}
              style={{
                opacity,
                transform: `scale(${scale})`,
                backgroundColor: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.35)",
                borderRadius: height * 0.02,
                padding: height * 0.045,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: height * 0.022,
                boxShadow: "0 0 30px rgba(59,130,246,0.15)",
              }}
            >
              <Icon size={height * 0.07} color={COLORS.brightBlue} />
              <div
                style={{
                  fontFamily: FONTS.title,
                  fontSize: height * 0.032,
                  color: COLORS.white,
                  textAlign: "center",
                }}
              >
                {t.name}
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
