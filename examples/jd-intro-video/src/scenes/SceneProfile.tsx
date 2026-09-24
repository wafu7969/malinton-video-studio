import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { Users, TrendingUp, Globe, Building2 } from "lucide-react";
import { SceneShell } from "../components/SceneShell";
import { SceneTitle } from "../components/SceneTitle";
import { FONTS, COLORS } from "../data/script";

interface Metric {
  icon: React.FC<{ size?: number; color?: string }>;
  value: string;
  label: string;
}

const METRICS: Metric[] = [
  { icon: Users, value: "60万+", label: "员工规模" },
  { icon: TrendingUp, value: "万亿级", label: "年营收体量" },
  { icon: Globe, value: "数亿", label: "服务用户" },
  { icon: Building2, value: "多元", label: "业务板块" },
];

/**
 * 场景 2 · 公司简介
 * 左侧文字介绍卡片，右侧数据面板（数字滚动动画）。
 */
export const SceneProfile: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cardEnter = spring({
    frame: frame - 5,
    fps,
    config: { damping: 200, stiffness: 80 },
  });
  const cardOpacity = interpolate(cardEnter, [0, 1], [0, 1]);
  const cardX = interpolate(cardEnter, [0, 1], [-width * 0.05, 0]);

  return (
    <SceneShell sceneKey="profile" bgFrom="#0B1B3A" bgTo="#16294F">
      <SceneTitle title="公司简介" subtitle="从柜台到世界舞台" delay={3} />

      <div
        style={{
          position: "absolute",
          top: height * 0.34,
          left: width * 0.06,
          width: width * 0.44,
          opacity: cardOpacity,
          transform: `translateX(${cardX}px)`,
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: height * 0.02,
            padding: height * 0.045,
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: height * 0.032,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.7,
            }}
          >
            京东成立于
            <span style={{ color: COLORS.gold, fontWeight: 700 }}> 1998 年</span>
            ，从一个中关村柜台起步，如今已成长为覆盖零售、物流、科技、健康等多元业务的
            <span style={{ color: COLORS.jdRed, fontWeight: 700 }}>大型企业集团</span>
            ，服务全球数亿用户。
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: height * 0.32,
          right: width * 0.06,
          width: width * 0.38,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: height * 0.03,
        }}
      >
        {METRICS.map((m, i) => {
          const enter = spring({
            frame: frame - 15 - i * 6,
            fps,
            config: { damping: 200, stiffness: 90 },
          });
          const opacity = interpolate(enter, [0, 1], [0, 1]);
          const y = interpolate(enter, [0, 1], [height * 0.04, 0]);
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              style={{
                opacity,
                transform: `translateY(${y}px)`,
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: height * 0.018,
                padding: height * 0.03,
                display: "flex",
                flexDirection: "column",
                gap: height * 0.012,
              }}
            >
              <Icon size={height * 0.045} color={COLORS.brightBlue} />
              <div
                style={{
                  fontFamily: FONTS.title,
                  fontSize: height * 0.05,
                  color: COLORS.white,
                }}
              >
                {m.value}
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: height * 0.024,
                  color: "rgba(255,255,255,0.65)",
                }}
              >
                {m.label}
              </div>
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
};
