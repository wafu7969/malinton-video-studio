import { Audio, staticFile } from "remotion";

interface SceneAudioProps {
  /** 音频文件路径（相对 public） */
  src: string;
  /** 音频时长（秒） */
  durationInSeconds: number;
}

/**
 * 场景音频组件
 * 添加 data-start / data-duration 属性，便于识别音频起止。
 */
export const SceneAudio: React.FC<SceneAudioProps> = ({
  src,
  durationInSeconds,
}) => {
  return (
    <Audio
      src={staticFile(src)}
      data-start="0"
      data-duration={String(durationInSeconds)}
    />
  );
};
