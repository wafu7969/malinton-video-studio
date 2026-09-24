import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { SceneShell } from "../components/SceneShell";
import { SceneTitle } from "../components/SceneTitle";
import { FONTS, COLORS } from "../data/script";

interface Milestone {
  year: string;
  text: string;
}

const MILESTONES: Milestone[] = [
  { year: "1998", text: "中关村创立" },
  { year: "2004", text: "转型线上零售" },
  { year: "2014", text: "登陆纳斯达克" },
  { year: "2020", text: "回归香港上市" },
  { year: "2026", text: "持续领跑" },
];

/**
 * 场景 3 · 发展历程
 * 横向时间轴，节点依次点亮。
 */
export const SceneHistory: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const axisY = height * 0.56;
  const startX = width * 0.1;
  const endX = width * 0.9;
  const step = (endX - startX) / (MILESTONES.length - 1);

  // 进度光线
  const progress = interpolate(frame, [10, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineWidth = (endX - startX) * progress;

  return (
    <SceneShell sceneKey="history" bgFrom="#0A1830" bgTo="#1B2F5E">
      <SceneTitle title="发展历程" subtitle="二十余载 · 砥砺前行" delay={3} />

      {/* 时间轴主线 */}
      <div
        style={{
          position: "absolute",
          top: axisY,
          left: startX,
          width: endX - startX,
          height: height * 0.006,
          backgroundColor: "rgba(255,255,255,0.15)",
          borderRadius: height * 0.003,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: axisY,
          left: startX,
          width: lineWidth,
          height: height * 0.006,
          background: `linear-gradient(90deg, ${COLORS.brightBlue}, ${COLORS.jdRed})`,
          borderRadius: height * 0.003,
        }}
      />

      {MILESTONES.map((m, i) => {
        const nodeX = startX + step * i;
        const enter = spring({
          frame: frame - 12 - i * 10,
          fps,
          config: { damping: 200, stiffness: 90 },
        });
        const opacity = interpolate(enter, [0, 1], [0, 1]);
        const scale = interpolate(enter, [0, 1], [0.5, 1]);
        const isAbove = i % 2 === 0;
        return (
          <div key={m.year}>
            {/* 节点圆点 */}
            <div
              style={{
                position: "absolute",
                top: axisY - height * 0.014,
                left: nodeX - height * 0.014,
                width: height * 0.028,
                height: height * 0.028,
                borderRadius: "50%",
                backgroundColor: COLORS.jdRed,
                border: `${height * 0.006}px solid #0A1830`,
                opacity,
                transform: `scale(${scale})`,
                boxShadow: "0 0 20px rgba(225,37,27,0.7)",
              }}
            />
            {/* 卡片 */}
            <div
              style={{
                position: "absolute",
                top: isAbove ? axisY - height * 0.24 : axisY + height * 0.06,
                left: nodeX - width * 0.075,
                width: width * 0.15,
                opacity,
                transform: `scale(${scale})`,
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: height * 0.016,
                padding: height * 0.022,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.title,
                  fontSize: height * 0.042,
                  color: COLORS.gold,
                }}
              >
                {m.year}
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: height * 0.024,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: height * 0.008,
                }}
              >
                {m.text}
              </div>
            </div>
          </div>
        );
      })}
    </SceneShell>
  );
};
