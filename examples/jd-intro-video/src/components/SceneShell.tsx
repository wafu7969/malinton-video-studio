import { AbsoluteFill } from "remotion";
import { Background } from "./Background";
import { SceneAudio } from "./SceneAudio";
import { Subtitle } from "./Subtitle";
import { useSubtitleSegments } from "../utils/subtitle";
import { SCENE_TIMINGS } from "../config";
import { SCENE_SCRIPTS } from "../data/script";

interface SceneShellProps {
  /** 场景 key（用于查找音频与字幕数据） */
  sceneKey: string;
  /** 背景起始色 */
  bgFrom?: string;
  /** 背景结束色 */
  bgTo?: string;
  /** 是否显示粒子 */
  particles?: boolean;
  /** 粒子颜色 */
  particleColor?: string;
  /** 场景内容 */
  children: React.ReactNode;
}

/**
 * 场景外壳组件
 * 统一集成：渐变背景 + 音频 + 字幕 + 内容层
 * 字幕基于字级别时间戳与音频严格同步。
 */
export const SceneShell: React.FC<SceneShellProps> = ({
  sceneKey,
  bgFrom,
  bgTo,
  particles,
  particleColor,
  children,
}) => {
  const timing = SCENE_TIMINGS.find((s) => s.key === sceneKey)!;
  const script = SCENE_SCRIPTS.find((s) => s.key === sceneKey)!;
  const jsonPath = timing.audio.replace(/\.mp3$/, ".json");

  const segments = useSubtitleSegments(jsonPath, script.subtitles);

  return (
    <AbsoluteFill>
      <Background
        from={bgFrom}
        to={bgTo}
        particles={particles}
        particleColor={particleColor}
      />
      {children}
      <SceneAudio src={timing.audio} durationInSeconds={timing.audioDuration} />
      <Subtitle segments={segments} />
    </AbsoluteFill>
  );
};
