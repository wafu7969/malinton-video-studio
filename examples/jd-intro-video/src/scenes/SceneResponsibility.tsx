import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Leaf, Sprout, HeartHandshake, Users } from "lucide-react";
import { SceneShell } from "../components/SceneShell";
import { SceneTitle } from "../components/SceneTitle";
import { FONTS, COLORS } from "../data/script";

interface Item {
  icon: React.FC<{ size?: number; color?: string }>;
  name: string;
}

const ITEMS: Item[] = [
  { icon: Leaf, name: "绿色低碳" },
  { icon: Sprout, name: "乡村振兴" },
  { icon: HeartHandshake, name: "公益慈善" },
  { icon: Users, name: "员工关怀" },
];

/**
 * 场景 7 · 社会责任 + 片尾
 * 上半部分社会责任关键词，下半部分收尾标语。
 */
export const SceneResponsibility: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const endEnter = spring({
    frame: frame - 40,
    fps,
    config: { damping: 200, stiffness: 80 },
  });
  const endOpacity = interpolate(endEnter, [0, 1], [0, 1]);
  const endY = interpolate(endEnter, [0, 1], [height * 0.04, 0]);

  return (
    <SceneShell sceneKey="responsibility" bgFrom="#08182C" bgTo="#123A2E">
      <SceneTitle title="社会责任" subtitle="技术为本 · 向善而行" delay={3} />

      <div
        style={{
          position: "absolute",
          top: height * 0.34,
          left: width * 0.08,
          width: width * 0.84,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: width * 0.025,
        }}
      >
        {ITEMS.map((it, i) => {
          const enter = spring({
            frame: frame - 10 - i * 7,
            fps,
            config: { damping: 200, stiffness: 90 },
          });
          const opacity = interpolate(enter, [0, 1], [0, 1]);
          const y = interpolate(enter, [0, 1], [height * 0.04, 0]);
          const Icon = it.icon;
          return (
            <div
              key={it.name}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                backgroundColor: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.3)",
                borderRadius: height * 0.018,
                padding: height * 0.032,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: height * 0.016,
              }}
            >
              <Icon size={height * 0.055} color={COLORS.green} />
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: height * 0.028,
                  color: COLORS.white,
                }}
              >
                {it.name}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: height * 0.22,
          left: 0,
          width,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: endOpacity,
          transform: `translateY(${endY}px)`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.title,
            fontSize: height * 0.05,
            color: COLORS.white,
            letterSpacing: "0.06em",
          }}
        >
          京东集团
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: height * 0.03,
            color: COLORS.gold,
            marginTop: height * 0.014,
            letterSpacing: "0.14em",
          }}
        >
          技术为本 · 致力于更高效和可持续的世界
        </div>
      </div>
    </SceneShell>
  );
};
