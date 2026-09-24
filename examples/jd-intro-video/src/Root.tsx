import { Composition } from "remotion";
import { JdIntroVideo } from "./JdIntroVideo";
import {
  FPS,
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  TOTAL_DURATION_IN_FRAMES,
} from "./config";

/**
 * Remotion 根组件
 * - 注册京东集团介绍视频的 Composition
 * - 画面比例 16:9（1920 × 1080），2K 质量
 * - 时长根据各分镜配音时长累计确定
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="JdIntroVideo"
        component={JdIntroVideo}
        durationInFrames={TOTAL_DURATION_IN_FRAMES}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};
