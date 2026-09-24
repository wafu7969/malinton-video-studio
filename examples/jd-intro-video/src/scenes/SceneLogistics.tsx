import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Warehouse, Truck, Plane, PackageCheck } from "lucide-react";
import { SceneShell } from "../components/SceneShell";
import { SceneTitle } from "../components/SceneTitle";
import { FONTS, COLORS } from "../data/script";

interface Node {
  icon: React.FC<{ size?: number; color?: string }>;
  label: string;
  x: number;
  y: number;
}

const NODES: Node[] = [
  { icon: Warehouse, label: "智能仓储", x: 0.2, y: 0.42 },
  { icon: Truck, label: "干线运输", x: 0.5, y: 0.34 },
  { icon: Plane, label: "航空货运", x: 0.8, y: 0.44 },
  { icon: PackageCheck, label: "末端配送", x: 0.5, y: 0.68 },
];

/**
 * 场景 6 · 物流体系
 * 网络节点连线，展示仓储、配送、航空、末端。
 */
export const SceneLogistics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const centerX = width * 0.5;
  const centerY = height * 0.52;

  return (
    <SceneShell sceneKey="logistics" bgFrom="#08152B" bgTo="#14294F">
      <SceneTitle title="物流体系" subtitle="极速履约 · 覆盖全国" delay={3} />

      {/* 连线 */}
      <svg
        style={{ position: "absolute", inset: 0, width, height }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {NODES.map((n, i) => {
          const progress = interpolate(frame, [15 + i * 8, 45 + i * 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const nx = width * n.x;
          const ny = height * n.y;
          const cx = centerX + (nx - centerX) * progress;
          const cy = centerY + (ny - centerY) * progress;
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={cx}
              y2={cy}
              stroke={COLORS.brightBlue}
              strokeWidth={2}
              opacity={0.55}
            />
          );
        })}
      </svg>

      {/* 中心枢纽 */}
      <div
        style={{
          position: "absolute",
          top: centerY - height * 0.06,
          left: centerX - height * 0.06,
          width: height * 0.12,
          height: height * 0.12,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.jdRed}, #8B0000)`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: FONTS.title,
          fontSize: height * 0.03,
          color: COLORS.white,
          boxShadow: "0 0 40px rgba(225,37,27,0.6)",
        }}
      >
        京东物流
      </div>

      {NODES.map((n, i) => {
        const enter = spring({
          frame: frame - 18 - i * 8,
          fps,
          config: { damping: 200, stiffness: 90 },
        });
        const opacity = interpolate(enter, [0, 1], [0, 1]);
        const scale = interpolate(enter, [0, 1], [0.6, 1]);
        const Icon = n.icon;
        return (
          <div
            key={n.label}
            style={{
              position: "absolute",
              top: height * n.y - height * 0.055,
              left: width * n.x - width * 0.06,
              width: width * 0.12,
              opacity,
              transform: `scale(${scale})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: height * 0.012,
            }}
          >
            <div
              style={{
                width: height * 0.09,
                height: height * 0.09,
                borderRadius: "50%",
                backgroundColor: "rgba(59,130,246,0.15)",
                border: `2px solid ${COLORS.brightBlue}`,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Icon size={height * 0.045} color={COLORS.brightBlue} />
            </div>
            <div
              style={{
                fontFamily: FONTS.body,
                fontSize: height * 0.024,
                color: "rgba(255,255,255,0.85)",
                whiteSpace: "nowrap",
              }}
            >
              {n.label}
            </div>
          </div>
        );
      })}
    </SceneShell>
  );
};
