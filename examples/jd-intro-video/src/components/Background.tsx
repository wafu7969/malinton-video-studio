import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface BackgroundProps {
  /** 渐变起始色 */
  from?: string;
  /** 渐变结束色 */
  to?: string;
  /** 是否显示流动粒子 */
  particles?: boolean;
  /** 粒子颜色 */
  particleColor?: string;
}

/**
 * 通用渐变背景 + 流动粒子光效
 */
export const Background: React.FC<BackgroundProps> = ({
  from = "#0B1B3A",
  to = "#1E3A8A",
  particles = true,
  particleColor = "rgba(59,130,246,0.55)",
}) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();

  const angle = interpolate(frame, [0, durationInFrames], [120, 160]);

  // 生成固定的粒子布局（基于索引伪随机）
  const particleCount = 34;
  const particlesArr = Array.from({ length: particleCount }, (_, i) => {
    const seedX = (i * 137.5) % 100;
    const seedY = (i * 73.3) % 100;
    const size = 2 + ((i * 17) % 5);
    const speed = 0.4 + ((i * 11) % 10) / 10;
    const drift = Math.sin((frame / 30) * speed + i) * height * 0.03;
    const y = ((seedY / 100) * height + drift) % height;
    return { x: (seedX / 100) * width, y, size, i };
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`,
        overflow: "hidden",
      }}
    >
      {/* 柔光装饰 */}
      <div
        style={{
          position: "absolute",
          width: width * 0.7,
          height: width * 0.7,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(225,37,27,0.18) 0%, rgba(225,37,27,0) 70%)",
          top: -width * 0.2,
          right: -width * 0.15,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: width * 0.6,
          height: width * 0.6,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.22) 0%, rgba(59,130,246,0) 70%)",
          bottom: -width * 0.2,
          left: -width * 0.1,
        }}
      />
      {/* 粒子 */}
      {particles &&
        particlesArr.map((p) => (
          <div
            key={p.i}
            style={{
              position: "absolute",
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              backgroundColor: particleColor,
              opacity: 0.5,
            }}
          />
        ))}
    </AbsoluteFill>
  );
};
