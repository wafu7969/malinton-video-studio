import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { ShoppingCart, Truck, Cpu, HeartPulse } from "lucide-react";
import { SceneShell } from "../components/SceneShell";
import { SceneTitle } from "../components/SceneTitle";
import { FONTS, COLORS } from "../data/script";

interface Biz {
  icon: React.FC<{ size?: number; color?: string }>;
  name: string;
  desc: string;
  color: string;
}

const BIZ: Biz[] = [
  { icon: ShoppingCart, name: "京东零售", desc: "连接亿万消费者与品牌商家", color: COLORS.jdRed },
  { icon: Truck, name: "京东物流", desc: "打造高效供应链网络", color: COLORS.brightBlue },
  { icon: Cpu, name: "京东科技", desc: "赋能产业数字化", color: COLORS.gold },
  { icon: HeartPulse, name: "京东健康", desc: "守护全民健康", color: COLORS.green },
];

/**
 * 场景 4 · 核心业务
 * 四宫格卡片布局。
 */
export const SceneBusiness: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const gridTop = height * 0.34;
  const gridLeft = width * 0.08;
  const gridWidth = width * 0.84;
  const gap = width * 0.025;
  const cardW = (gridWidth - gap) / 2;
  const cardH = height * 0.26;

  return (
    <SceneShell sceneKey="business" bgFrom="#0B1B3A" bgTo="#1A2C56">
      <SceneTitle title="核心业务" subtitle="多元协同 · 全面发展" delay={3} />

      <div
        style={{
          position: "absolute",
          top: gridTop,
          left: gridLeft,
          width: gridWidth,
          display: "grid",
          gridTemplateColumns: `1fr 1fr`,
          gap,
        }}
      >
        {BIZ.map((b, i) => {
          const enter = spring({
            frame: frame - 10 - i * 8,
            fps,
            config: { damping: 200, stiffness: 90 },
          });
          const opacity = interpolate(enter, [0, 1], [0, 1]);
          const y = interpolate(enter, [0, 1], [height * 0.05, 0]);
          const Icon = b.icon;
          return (
            <div
              key={b.name}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                width: cardW,
                height: cardH,
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderLeft: `${width * 0.005}px solid ${b.color}`,
                borderRadius: height * 0.018,
                padding: height * 0.035,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: height * 0.018,
              }}
            >
              <Icon size={height * 0.06} color={b.color} />
              <div
                style={{
                  fontFamily: FONTS.title,
                  fontSize: height * 0.042,
                  color: COLORS.white,
                }}
              >
                {b.name}
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: height * 0.026,
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {b.desc}
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
